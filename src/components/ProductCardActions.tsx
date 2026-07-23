"use client";

import { AddToCartButton } from "@/components/AddToCartButton";
import type { Product } from "@/lib/products";
import { useProductInventory } from "@/lib/use-product-inventory";
import { isInventoryAvailable } from "@/lib/inventory";

export function ProductCardActions({ product }: { product: Product }) {
  const inventory = useProductInventory(product);
  const available = isInventoryAvailable(inventory);

  return (
    <div className="mt-2 flex min-w-0 items-center justify-between gap-1.5">
      {product.originalPrice ? (
        <div className="min-w-0 shrink">
          <span className="block whitespace-nowrap font-sans text-[11px] text-[#2f2924]/50 line-through sm:text-sm">
            {product.originalPrice}
          </span>
          <span className="block whitespace-nowrap font-sans text-sm font-bold text-[#c45c4a] sm:text-base">
            {product.price}
          </span>
        </div>
      ) : (
        <span className="min-w-0 shrink whitespace-nowrap font-sans text-sm font-semibold text-[#2f2924] sm:text-base">
          {product.price}
        </span>
      )}
      <AddToCartButton
        product={product}
        quantity={1}
        disabled={!available}
        size="card"
      />
    </div>
  );
}
