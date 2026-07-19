"use client";

import { useState } from "react";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import type { Product } from "@/lib/products";

type ProductPurchaseProps = {
  product: Product;
};

export function ProductPurchase({ product }: ProductPurchaseProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState(
    product.colors?.[0]?.id ?? "",
  );

  function decrease() {
    setQuantity((value) => Math.max(1, value - 1));
  }

  function increase() {
    setQuantity((value) => value + 1);
  }

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

        <div className="flex w-full items-center gap-3 sm:w-auto sm:shrink-0">
          <div className="inline-flex h-12 items-center rounded-full border border-[#2f2924]/15 bg-white">
            <button
              type="button"
              onClick={decrease}
              aria-label="Znížiť množstvo"
              className="flex size-12 cursor-pointer items-center justify-center text-[#2f2924] transition-opacity hover:opacity-70"
            >
              <Minus className="size-4" strokeWidth={2} aria-hidden />
            </button>
            <span className="min-w-8 text-center font-sans text-base font-semibold text-[#2f2924]">
              {quantity}
            </span>
            <button
              type="button"
              onClick={increase}
              aria-label="Zvýšiť množstvo"
              className="flex size-12 cursor-pointer items-center justify-center text-[#2f2924] transition-opacity hover:opacity-70"
            >
              <Plus className="size-4" strokeWidth={2} aria-hidden />
            </button>
          </div>

          <button
            type="button"
            className="inline-flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#75825B] px-6 text-base font-medium text-white transition-opacity hover:opacity-90 sm:flex-none"
          >
            <ShoppingCart className="size-5" strokeWidth={1.75} aria-hidden />
            Do košíka
          </button>
        </div>
      </div>
    </div>
  );
}
