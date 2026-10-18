"use client";

import { useEffect, useState } from "react";
import { AddToCartButton } from "@/components/AddToCartButton";
import { BellIcon } from "@/components/icons/BellIcon";
import { ProductPriceDisplay } from "@/components/ProductPriceDisplay";
import { QuantityStepper } from "@/components/QuantityStepper";
import { ProductColorPills } from "@/components/product/ProductColorPills";
import { ProductVariantPills } from "@/components/product/ProductVariantPills";
import { RestockNotifyModal } from "@/components/product/RestockNotifyModal";
import {
  inventoryMaxOrderable,
  isInventoryAvailable,
} from "@/lib/inventory";
import {
  firstOrderableColorId,
  isColorOrderable,
  isProductOrderableByColors,
} from "@/lib/order-line-color";
import type { Product } from "@/lib/products";
import {
  catalogNetForTextVariant,
  firstOrderableVariant,
  formatCentsAsPrice,
  findTextVariant,
} from "@/lib/product-variants";
import {
  alignMaxToOrderMultiple,
  formatPackagingDeliveryHint,
  formatPackagingDeliveryHintShort,
  getPrimaryPackagingOption,
  getProductOrderMultiple,
  snapQuantityToMultiple,
} from "@/lib/taxonomy";
import { useIsWholesale } from "@/lib/use-is-wholesale";
import { useProductInventory } from "@/lib/use-product-inventory";

type ProductPurchaseProps = {
  product: Product;
  selectedColor?: string;
  onSelectColor?: (colorId: string) => void;
  selectedVariantId?: string;
  onSelectVariant?: (variantId: string) => void;
};

export function ProductPurchase({
  product,
  selectedColor: controlledColor,
  onSelectColor,
  selectedVariantId: controlledVariant,
  onSelectVariant,
}: ProductPurchaseProps) {
  const isWholesale = useIsWholesale();
  const inventory = useProductInventory(product);
  const inventoryAvailable = isInventoryAvailable(inventory);
  const isCustom = product.variantMode === "custom";
  const variants = product.textVariants ?? [];
  const colorIds = product.attributes?.colors ?? product.colors?.map((c) => c.id);

  const productOrderableByColors = isProductOrderableByColors({
    productInStock: inventoryAvailable,
    colorIds: isCustom ? [] : colorIds,
    unavailableColorIds: product.unavailableColorIds,
  });
  const hasOrderableVariant =
    !isCustom || variants.some((v) => v.available);
  const available =
    inventoryAvailable &&
    (isCustom ? hasOrderableVariant : productOrderableByColors);

  const stockMax = inventoryMaxOrderable(inventory);
  const orderMultiple = getProductOrderMultiple(product.attributes?.packaging);
  const packagingOption = getPrimaryPackagingOption(
    product.attributes?.packaging,
  );
  const packagingHint = packagingOption
    ? formatPackagingDeliveryHint(packagingOption)
    : null;
  const packagingHintShort = packagingOption
    ? formatPackagingDeliveryHintShort(packagingOption)
    : null;
  const maxQty = alignMaxToOrderMultiple(stockMax, orderMultiple);
  const [quantity, setQuantity] = useState(orderMultiple);
  const [restockOpen, setRestockOpen] = useState(false);
  const [internalColor, setInternalColor] = useState(
    () =>
      firstOrderableColorId(colorIds, product.unavailableColorIds) ||
      product.colors?.[0]?.id ||
      "",
  );
  const [internalVariant, setInternalVariant] = useState(
    () =>
      firstOrderableVariant(variants, product.defaultVariantId)?.id ??
      variants[0]?.id ??
      "",
  );

  const selectedColor = controlledColor ?? internalColor;
  const setSelectedColor = onSelectColor ?? setInternalColor;
  const selectedVariantId = controlledVariant ?? internalVariant;
  const setSelectedVariant = onSelectVariant ?? setInternalVariant;

  const hasColors =
    !isCustom && Boolean(product.colors && product.colors.length > 0);
  const selectedColorOrderable = hasColors
    ? isColorOrderable(
        selectedColor,
        colorIds,
        product.unavailableColorIds,
      )
    : true;
  const selectedVariant = findTextVariant(variants, selectedVariantId);
  const selectedVariantOrderable = isCustom
    ? Boolean(selectedVariant?.available)
    : true;

  const canOrderPack =
    available &&
    selectedColorOrderable &&
    selectedVariantOrderable &&
    (typeof maxQty !== "number" || maxQty >= orderMultiple);

  // Custom: variant net ± percent discount (same math as order-line-selection).
  // product.price already includes discount for none/colors modes.
  const displayPrice =
    isCustom && selectedVariant
      ? catalogNetForTextVariant(
          selectedVariant.priceCents,
          product.discount,
        )
      : product.price;
  const displayOriginalPrice =
    isCustom && selectedVariant && product.discount
      ? formatCentsAsPrice(selectedVariant.priceCents)
      : isCustom
        ? undefined
        : product.originalPrice;

  useEffect(() => {
    if (!canOrderPack) {
      setQuantity(orderMultiple);
      return;
    }
    setQuantity((prev) =>
      snapQuantityToMultiple(
        prev,
        orderMultiple,
        typeof maxQty === "number" ? maxQty : undefined,
      ) || orderMultiple,
    );
  }, [canOrderPack, maxQty, orderMultiple]);

  const purchaseActions = (
    <div className="flex w-full items-center gap-3 sm:w-auto">
      <QuantityStepper
        value={quantity}
        onChange={setQuantity}
        max={typeof maxQty === "number" ? maxQty : undefined}
        min={orderMultiple}
        step={orderMultiple}
      />

      <AddToCartButton
        product={product}
        quantity={quantity}
        colorId={isCustom ? undefined : selectedColor || undefined}
        variantId={isCustom ? selectedVariantId || undefined : undefined}
        disabled={!canOrderPack}
        size="page"
      />

      {!available ? (
        <button
          type="button"
          onClick={() => setRestockOpen(true)}
          aria-label="Upozorniť na naskladnenie"
          title="Upozorniť na naskladnenie"
          className="inline-flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#75825B] text-white transition-[opacity,transform] hover:opacity-90 active:scale-[0.97]"
        >
          <BellIcon className="size-5" />
        </button>
      ) : null}
    </div>
  );

  const stockLine = (
    <StockLine
      available={available}
      canOrderPack={canOrderPack}
      stockMax={stockMax}
      orderMultiple={orderMultiple}
      packagingHint={packagingHint}
      packagingHintShort={packagingHintShort}
    />
  );

  const priceDisplay = (
    <ProductPriceDisplay
      price={displayPrice}
      originalPrice={displayOriginalPrice}
      variant="pdp"
    />
  );

  return (
    <div className="mt-6 flex flex-col gap-4">
      {isCustom && variants.length > 0 ? (
        <ProductVariantPills
          axisLabel={product.variantAxisLabel || "Varianta"}
          variants={variants}
          selectedVariantId={selectedVariantId}
          onSelect={setSelectedVariant}
        />
      ) : null}

      {hasColors ? (
        <ProductColorPills
          colors={product.colors!}
          selectedColorId={selectedColor}
          onSelect={setSelectedColor}
          unavailableColorIds={product.unavailableColorIds}
        />
      ) : null}

      {isWholesale ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0">{priceDisplay}</div>

          <div className="flex w-full min-w-0 flex-col gap-1.5 sm:w-auto sm:max-w-full sm:items-end">
            {purchaseActions}
            {stockLine}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">{priceDisplay}</div>
            {purchaseActions}
          </div>

          <div className="sm:flex sm:justify-end">{stockLine}</div>
        </div>
      )}

      <RestockNotifyModal
        open={restockOpen}
        onClose={() => setRestockOpen(false)}
        product={product}
        colorId={isCustom ? undefined : selectedColor || undefined}
      />
    </div>
  );
}

function StockLine({
  available,
  canOrderPack,
  stockMax,
  orderMultiple,
  packagingHint,
  packagingHintShort,
}: {
  available: boolean;
  canOrderPack: boolean;
  stockMax: number | undefined;
  orderMultiple: number;
  packagingHint: string | null;
  packagingHintShort: string | null;
}) {
  return (
    <div
      className={`w-full text-sm ${
        canOrderPack ? "text-[#2f2924]/55" : "font-medium text-[#c45c4a]"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3 sm:hidden">
        {packagingHintShort ? (
          <span className="min-w-0">{packagingHintShort}</span>
        ) : (
          <span />
        )}
        <span className="shrink-0 text-right">
          {available
            ? typeof stockMax === "number"
              ? `Na sklade: ${stockMax} ks`
              : "Na sklade"
            : "Momentálne nie je na sklade"}
        </span>
      </div>

      <p className="hidden text-right sm:block">
        {packagingHint ? (
          <>
            {packagingHint}
            <span className="mx-1.5 text-[#2f2924]/30" aria-hidden>
              ·
            </span>
          </>
        ) : null}
        {available
          ? typeof stockMax === "number"
            ? `Na sklade: ${stockMax} ks`
            : "Na sklade"
          : "Momentálne nie je na sklade"}
      </p>

      {available && !canOrderPack && orderMultiple > 1 ? (
        <p className="mt-0.5 text-right">
          Nedostatok skladu na celé balenie ({orderMultiple} ks).
        </p>
      ) : null}
    </div>
  );
}
