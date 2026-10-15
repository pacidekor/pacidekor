"use client";

import { useState } from "react";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductPriceDisplay } from "@/components/ProductPriceDisplay";
import { AddToCartQuantityModal } from "@/components/product/AddToCartQuantityModal";
import type { Product } from "@/lib/products";
import { useProductInventory } from "@/lib/use-product-inventory";
import { isInventoryAvailable } from "@/lib/inventory";

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
  const available = isInventoryAvailable(inventory);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="mt-2 flex min-w-0 items-center justify-between gap-1.5 md:gap-2">
      <ProductPriceDisplay
        price={product.price}
        originalPrice={product.originalPrice}
        variant="card"
      />
      <AddToCartButton
        product={product}
        quantity={1}
        colorId={colorId ?? undefined}
        disabled={!available}
        size="card"
        onOpenQuantityPicker={() => setModalOpen(true)}
      />
      <AddToCartQuantityModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        product={product}
        colorId={colorId ?? undefined}
      />
    </div>
  );
}
