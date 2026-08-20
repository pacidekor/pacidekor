"use client";

import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductPriceDisplay } from "@/components/ProductPriceDisplay";
import type { Product } from "@/lib/products";
import { useProductInventory } from "@/lib/use-product-inventory";
import { isInventoryAvailable } from "@/lib/inventory";

export function ProductCardActions({ product }: { product: Product }) {
  const inventory = useProductInventory(product);
  const available = isInventoryAvailable(inventory);

  return (
    <div className="mt-2 flex min-w-0 items-center justify-between gap-1.5">
      <ProductPriceDisplay
        price={product.price}
        originalPrice={product.originalPrice}
        variant="card"
      />
      <AddToCartButton
        product={product}
        quantity={1}
        disabled={!available}
        size="card"
      />
    </div>
  );
}
