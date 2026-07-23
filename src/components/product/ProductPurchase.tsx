"use client";

import { useEffect, useState } from "react";
import { AddToCartButton } from "@/components/AddToCartButton";
import { QuantityStepper } from "@/components/QuantityStepper";
import {
  inventoryMaxOrderable,
  isInventoryAvailable,
} from "@/lib/inventory";
import type { Product } from "@/lib/products";
import { useProductInventory } from "@/lib/use-product-inventory";

type ProductPurchaseProps = {
  product: Product;
};

export function ProductPurchase({ product }: ProductPurchaseProps) {
  const inventory = useProductInventory(product);
  const available = isInventoryAvailable(inventory);
  const maxQty = inventoryMaxOrderable(inventory);

  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState(
    product.colors?.[0]?.id ?? "",
  );

  useEffect(() => {
    if (!available) {
      setQuantity(1);
      return;
    }
    if (typeof maxQty === "number") {
      setQuantity((prev) => Math.min(Math.max(1, prev), maxQty));
    }
  }, [available, maxQty]);

  return (
    <div className="mt-8 flex flex-col gap-6">
      {product.colors && product.colors.length > 0 ? (
        <div>
          <p className="font-sans text-sm font-semibold text-[#2f2924]">
            Farba
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {product.colors.map((color) => {
              const isSelected = selectedColor === color.id;

              return (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setSelectedColor(color.id)}
                  aria-pressed={isSelected}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    isSelected
                      ? "border-[#75825B] bg-[#75825B] text-white"
                      : "border-[#2f2924]/15 bg-white text-[#2f2924] hover:border-[#75825B]/50"
                  }`}
                >
                  <span
                    className="size-3.5 rounded-full border border-black/10"
                    style={{ backgroundColor: color.hex }}
                    aria-hidden
                  />
                  {color.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        {product.originalPrice ? (
          <div className="flex min-w-0 items-baseline gap-3">
            <span className="font-heading text-3xl font-semibold text-[#c45c4a] sm:text-4xl">
              {product.price}
            </span>
            <span className="text-lg text-[#2f2924]/45 line-through">
              {product.originalPrice}
            </span>
          </div>
        ) : (
          <p className="min-w-0 font-heading text-3xl font-semibold text-[#2f2924] sm:text-4xl">
            {product.price}
          </p>
        )}

        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
          {available ? (
            typeof maxQty === "number" ? (
              <p className="text-sm text-[#2f2924]/55 sm:text-right">
                Na sklade: {maxQty} ks
              </p>
            ) : (
              <p className="text-sm text-[#2f2924]/55 sm:text-right">
                Na sklade
              </p>
            )
          ) : (
            <p className="text-sm font-medium text-[#c45c4a] sm:text-right">
              Momentálne nie je na sklade
            </p>
          )}

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
              disabled={!available}
              size="page"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
