"use client";

import { ProductAxisLabel } from "@/components/product/ProductAxisLabel";
import type { TextVariant } from "@/lib/product-variants";

type ProductVariantPillsProps = {
  axisLabel: string;
  variants: TextVariant[];
  selectedVariantId: string;
  onSelect: (variantId: string) => void;
};

export function ProductVariantPills({
  axisLabel,
  variants,
  selectedVariantId,
  onSelect,
}: ProductVariantPillsProps) {
  if (variants.length === 0) return null;

  return (
    <div>
      <ProductAxisLabel>{axisLabel}</ProductAxisLabel>
      <div className="relative mt-3">
        <div
          className="flex flex-wrap gap-2"
          role="listbox"
          aria-label={axisLabel}
        >
          {variants.map((variant) => {
            const selected = variant.id === selectedVariantId;
            const soldOut = !variant.available;
            return (
              <button
                key={variant.id}
                type="button"
                role="option"
                aria-selected={selected}
                aria-label={
                  soldOut ? `${variant.label} — Vypredané` : variant.label
                }
                disabled={soldOut}
                onClick={() => onSelect(variant.id)}
                className={[
                  "inline-flex shrink-0 items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  soldOut
                    ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                    : selected
                    ? "cursor-pointer border-[#75825B] bg-[#75825B] text-white"
                    : "cursor-pointer border-[#2f2924]/15 bg-white text-[#2f2924] hover:border-[#75825B]/50",
                ].join(" ")}
              >
                {variant.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
