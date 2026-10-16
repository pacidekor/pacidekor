/**
 * Pure validation of cart/checkout color selection against the product's
 * current `color_ids`. Used by createOrderAction (authoritative) and cart UI.
 *
 * Rules:
 * - Product with colors → colorId required and must be one of color_ids.
 * - Product without colors → colorId must be absent/empty.
 * - Never silently remaps an invalid id (e.g. removed Mix) to another color.
 */

export type OrderLineColorCheck =
  | { ok: true }
  | { ok: false; code: "color_required" | "color_invalid" | "color_not_allowed"; message: string };

export function normalizeOrderLineColorId(colorId?: string | null): string {
  return (colorId ?? "").trim();
}

export function validateOrderLineColor(
  productName: string,
  colorIds: string[] | null | undefined,
  colorId?: string | null,
): OrderLineColorCheck {
  const allowed = Array.isArray(colorIds) ? colorIds : [];
  const selected = normalizeOrderLineColorId(colorId);

  if (allowed.length === 0) {
    if (selected) {
      return {
        ok: false,
        code: "color_not_allowed",
        message: `${productName} už nemá farebné varianty. Odstráňte výber farby v košíku a pokračujte bez farby.`,
      };
    }
    return { ok: true };
  }

  if (!selected) {
    return {
      ok: false,
      code: "color_required",
      message: `Vyberte platnú farbu pre ${productName}.`,
    };
  }

  if (!allowed.includes(selected)) {
    return {
      ok: false,
      code: "color_invalid",
      message: `Vybraná farba pre ${productName} už nie je v ponuke. Zvoľte inú farbu v košíku.`,
    };
  }

  return { ok: true };
}

/** Client helper: true when a cart line's colorId is still valid for product.colors. */
export function isCartLineColorValid(
  colorOptions: Array<{ id: string }> | null | undefined,
  colorId?: string | null,
): boolean {
  const ids = (colorOptions ?? []).map((c) => c.id);
  return validateOrderLineColor("x", ids, colorId).ok;
}
