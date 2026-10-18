"use client";

import { useState } from "react";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductPriceDisplay } from "@/components/ProductPriceDisplay";
import { AddToCartQuantityModal } from "@/components/product/AddToCartQuantityModal";
import type { Product } from "@/lib/products";
import { useProductInventory } from "@/lib/use-product-inventory";
import { isInventoryAvailable } from "@/lib/inventory";
import {
  isColorOrderable,
  isProductOrderableByColors,
} from "@/lib/order-line-color";

type ProductCardActionsProps = {
  product: Product;
  /** Selected swatch / filter color from the card preview. */
  colorId?: string | null;
};

export function ProductCardActions({
  product,
  colorId,
}: ProductCardActionsProps) {
  const inventory = useProductInventory(product);
  const inventoryAvailable = isInventoryAvailable(inventory);
  const isCustom = product.variantMode === "custom";
  const colorIds =
    product.attributes?.colors ?? product.colors?.map((c) => c.id);
  const productOrderable = isProductOrderableByColors({
    productInStock: inventoryAvailable,
    colorIds: isCustom ? [] : colorIds,
    unavailableColorIds: product.unavailableColorIds,
  });
  const selectedOk =
    !colorId ||
    !colorIds?.length ||
    isColorOrderable(colorId, colorIds, product.unavailableColorIds);

  const orderableVariants =
    typeof product.variantOrderableCount === "number"
      ? product.variantOrderableCount
      : (product.textVariants ?? []).filter((v) => v.available).length;

  const customSoldOut = isCustom && orderableVariants === 0;
  const available = isCustom
    ? inventoryAvailable && orderableVariants > 0
    : productOrderable && selectedOk;

  const showFrom =
    isCustom &&
    Boolean(product.variantPriceVaries) &&
    orderableVariants > 0;

  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="mt-2 flex min-w-0 flex-col gap-1.5">
      {customSoldOut ? (
        <div className="text-[11px] font-medium text-[#c45c4a]">Vypredané</div>
      ) : null}

      <div className="flex min-w-0 items-center justify-between gap-1.5 md:gap-2">
        <ProductPriceDisplay
          price={product.price}
          originalPrice={product.originalPrice}
          variant="card"
          fromPrice={showFrom}
        />
        <AddToCartButton
          product={product}
          quantity={1}
          colorId={isCustom ? undefined : (colorId ?? undefined)}
          disabled={!available}
          size="card"
          onOpenQuantityPicker={() => setModalOpen(true)}
        />
        <AddToCartQuantityModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          product={product}
          colorId={isCustom ? undefined : (colorId ?? undefined)}
        />
      </div>
    </div>
  );
}
