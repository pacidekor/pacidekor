"use client";

import { useEffect, useState } from "react";
import { AddToCartButton } from "@/components/AddToCartButton";
import { QuantityStepper } from "@/components/QuantityStepper";
import { ProductColorPills } from "@/components/product/ProductColorPills";
import {
  inventoryMaxOrderable,
  isInventoryAvailable,
} from "@/lib/inventory";
import type { Product } from "@/lib/products";
import { useProductInventory } from "@/lib/use-product-inventory";

type ProductPurchaseProps = {
  product: Product;
  selectedColor?: string;
  onSelectColor?: (colorId: string) => void;
};

export function ProductPurchase({
  product,
  selectedColor: controlledColor,
  onSelectColor,
}: ProductPurchaseProps) {
  const inventory = useProductInventory(product);
  const available = isInventoryAvailable(inventory);
  const maxQty = inventoryMaxOrderable(inventory);

  const [quantity, setQuantity] = useState(1);
  const [internalColor, setInternalColor] = useState(
    product.colors?.[0]?.id ?? "",
  );
  const selectedColor = controlledColor ?? internalColor;
  const setSelectedColor = onSelectColor ?? setInternalColor;

  useEffect(() => {
    if (!available) {
      setQuantity(1);
      return;
    }
    if (typeof maxQty === "number") {
      setQuantity((prev) => Math.min(Math.max(1, prev), maxQty));
    }
  }, [available, maxQty]);

  const hasColors = Boolean(product.colors && product.colors.length > 0);

  return (
    <div className="mt-6 flex flex-col gap-6">
      {hasColors ? (
        <ProductColorPills
          colors={product.colors!}
          selectedColorId={selectedColor}
          onSelect={setSelectedColor}
        />
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          {product.originalPrice ? (
            <div className="flex items-baseline gap-3">
              <span className="font-heading text-3xl font-semibold text-[#c45c4a] sm:text-4xl">
                {product.price}
              </span>
              <span className="text-lg text-[#2f2924]/45 line-through">
                {product.originalPrice}
              </span>
            </div>
          ) : (
            <p className="font-heading text-3xl font-semibold text-[#2f2924] sm:text-4xl">
              {product.price}
            </p>
          )}

          <p
            className={`mt-2 text-sm ${
              available
                ? "text-[#2f2924]/55"
                : "font-medium text-[#c45c4a]"
            }`}
          >
            {available
              ? typeof maxQty === "number"
                ? `Na sklade: ${maxQty} ks`
                : "Na sklade"
              : "Momentálne nie je na sklade"}
          </p>
        </div>

        <div className="flex w-full items-center gap-3 sm:w-auto sm:shrink-0">
          <QuantityStepper
            value={quantity}
            onChange={setQuantity}
            max={typeof maxQty === "number" ? maxQty : undefined}
            min={1}
          />

          <AddToCartButton
            product={product}
            quantity={quantity}
            colorId={selectedColor || undefined}
            disabled={!available}
            size="page"
          />
        </div>
      </div>
    </div>
  );
}
