/**
 * Server-side validation of cart/checkout selection (color or text variant).
 */

import { validateOrderLineColor, type OrderLineColorCheck } from "@/lib/order-line-color";
import {
  applyPercentToVariantNet,
  centsToEuros,
  findTextVariant,
  type TextVariant,
  type VariantMode,
} from "@/lib/product-variants";
import type { ProductDiscount } from "@/lib/discounts";
import {
  isDiscountEffectivelyActive,
  resolveDiscountSalePrice,
} from "@/lib/discounts";
import { parsePrice } from "@/lib/price";
import { discountIsPercentCompatible } from "@/lib/product-variants";

export type SelectionSnapshot = {
  axisLabel: string | null;
  valueLabel: string | null;
  colorId?: string;
  variantId?: string;
};

export type OrderLineSelectionCheck =
  | {
      ok: true;
      catalogUnitNet: number;
      snapshot: SelectionSnapshot;
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

function colorLabel(
  colorId: string,
  resolveLabel?: (id: string) => string | null,
): string {
  return resolveLabel?.(colorId)?.trim() || colorId;
}

export function resolveCatalogUnitNetForSelection(input: {
  productName: string;
  mode: VariantMode;
  productPrice: string;
  colorIds?: string[] | null;
  unavailableColorIds?: string[] | null;
  textVariants?: TextVariant[] | null;
  axisLabel?: string | null;
  colorId?: string | null;
  variantId?: string | null;
  discount?: ProductDiscount | null;
  resolveColorLabel?: (id: string) => string | null;
}): OrderLineSelectionCheck {
  const mode = input.mode;
  const name = input.productName;
  const discount =
    input.discount && isDiscountEffectivelyActive(input.discount)
      ? input.discount
      : null;

  if (mode === "custom") {
    if (discount && !discountIsPercentCompatible(discount)) {
      return {
        ok: false,
        code: "discount_conflict",
        message: `${name}: nepodporovaná absolútna zľava pri vlastných variantách. Objednávku nie je možné dokončiť.`,
      };
    }

    const variantId = (input.variantId ?? "").trim();
    if (!variantId) {
      return {
        ok: false,
        code: "variant_required",
        message: `Vyberte variantu pre ${name}.`,
      };
    }
    const variant = findTextVariant(input.textVariants ?? [], variantId);
    if (!variant) {
      return {
        ok: false,
        code: "variant_invalid",
        message: `Vybraná varianta pre ${name} už nie je dostupná. Vyberte znova.`,
      };
    }
    if (!variant.available) {
      return {
        ok: false,
        code: "variant_unavailable",
        message: `Varianta „${variant.label}“ pre ${name} je vypredaná.`,
      };
    }

    const variantColorIds = variant.colorIds ?? [];
    const colorId = (input.colorId ?? "").trim();
    if (variantColorIds.length > 0) {
      if (!colorId) {
        return {
          ok: false,
          code: "color_required",
          message: `Vyberte farbu pre ${name}.`,
        };
      }
      if (!variantColorIds.includes(colorId)) {
        return {
          ok: false,
          code: "color_invalid",
          message: `Vybraná farba pre ${name} už nie je dostupná. Vyberte znova.`,
        };
      }
      const colorCheck = validateOrderLineColor(
        name,
        variantColorIds,
        colorId,
        input.unavailableColorIds,
      );
      if (!colorCheck.ok) {
        return {
          ok: false,
          code: colorCheck.code,
          message: colorCheck.message,
        };
      }
    }

    let unitNet = centsToEuros(variant.priceCents);
    if (discount) {
      unitNet = centsToEuros(
        applyPercentToVariantNet(variant.priceCents, discount.discountPercent),
      );
    }

    const colorPart =
      colorId && variantColorIds.includes(colorId)
        ? ` · ${colorLabel(colorId, input.resolveColorLabel)}`
        : "";

    return {
      ok: true,
      catalogUnitNet: unitNet,
      snapshot: {
        axisLabel: input.axisLabel?.trim() || "Varianta",
        valueLabel: `${variant.label}${colorPart}`,
        variantId: variant.id,
        ...(colorId && variantColorIds.includes(colorId) ? { colorId } : {}),
      },
    };
  }

  if (mode === "colors") {
    const colorCheck: OrderLineColorCheck = validateOrderLineColor(
      name,
      input.colorIds,
      input.colorId,
      input.unavailableColorIds,
    );
    if (!colorCheck.ok) {
      return {
        ok: false,
        code: colorCheck.code,
        message: colorCheck.message,
      };
    }

    let unitNet = parsePrice(input.productPrice);
    if (discount) {
      unitNet = parsePrice(resolveDiscountSalePrice(discount));
    }

    const colorId = (input.colorId ?? "").trim();
    return {
      ok: true,
      catalogUnitNet: unitNet,
      snapshot: {
        axisLabel: "Farba",
        valueLabel: colorLabel(colorId, input.resolveColorLabel),
        colorId,
      },
    };
  }

  if ((input.colorId ?? "").trim() || (input.variantId ?? "").trim()) {
    return {
      ok: false,
      code: "selection_not_allowed",
      message: `${name} nemá výber varianty. Odstráňte výber v košíku.`,
    };
  }

  let unitNet = parsePrice(input.productPrice);
  if (discount) {
    unitNet = parsePrice(resolveDiscountSalePrice(discount));
  }

  return {
    ok: true,
    catalogUnitNet: unitNet,
    snapshot: { axisLabel: null, valueLabel: null },
  };
}
