"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { adjustInventory } from "@/lib/inventory";
import type { Product } from "@/lib/products";

type AddToCartButtonProps = {
  product: Product;
  quantity?: number;
  disabled?: boolean;
  size?: "card" | "page";
};

const RESET_MS = 1800;

export function AddToCartButton({
  product,
  quantity = 1,
  disabled = false,
  size = "card",
}: AddToCartButtonProps) {
  const [added, setAdded] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleClick() {
    if (added || disabled) return;

    const result = adjustInventory(product, -quantity);
    if (!result.ok) return;

    setAdded(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setAdded(false), RESET_MS);
  }

  const isCard = size === "card";
  const productName = product.name;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={
        added
          ? `${productName} pridané do košíka`
          : `Pridať ${productName} do košíka`
      }
      aria-live="polite"
      className={
        isCard
          ? `inline-flex h-9 shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full px-2.5 text-white transition-[background-color,transform] duration-300 sm:gap-1.5 sm:px-4 ${
              disabled
                ? "cursor-not-allowed bg-[#2f2924]/25"
                : added
                  ? "cursor-pointer bg-[#5f6a49] scale-[1.03]"
                  : "cursor-pointer bg-[#75825B] hover:opacity-90 active:scale-[0.97]"
            }`
          : `inline-flex h-12 flex-1 items-center justify-center gap-2 overflow-hidden rounded-full px-6 text-base font-medium text-white transition-[background-color,transform] duration-300 sm:flex-none ${
              disabled
                ? "cursor-not-allowed bg-[#2f2924]/25"
                : added
                  ? "cursor-pointer bg-[#5f6a49] scale-[1.02]"
                  : "cursor-pointer bg-[#75825B] hover:opacity-90 active:scale-[0.98]"
            }`
      }
    >
      <span
        className={`relative grid place-items-center ${isCard ? "size-4" : "size-5"}`}
      >
        <ShoppingCart
          className={`${isCard ? "size-4" : "size-5"} transition-all duration-300 ease-out ${
            added
              ? "scale-50 rotate-12 opacity-0"
              : "scale-100 rotate-0 opacity-100"
          }`}
          strokeWidth={1.75}
          aria-hidden
        />
        <Check
          className={`absolute ${isCard ? "size-4" : "size-5"} transition-all duration-300 ease-out ${
            added
              ? "scale-100 rotate-0 opacity-100"
              : "scale-50 -rotate-12 opacity-0"
          }`}
          strokeWidth={2.25}
          aria-hidden
        />
      </span>

      <span
        className={`relative grid ${
          isCard
            ? "hidden min-w-[4.5rem] place-items-center text-xs font-medium min-[380px]:grid sm:min-w-[5rem] sm:text-sm"
            : "min-w-[5.5rem] place-items-center"
        }`}
      >
        <span
          className={`col-start-1 row-start-1 transition-all duration-300 ease-out ${
            added
              ? "translate-y-2 scale-95 opacity-0"
              : "translate-y-0 scale-100 opacity-100"
          }`}
        >
          {disabled ? "Vypredané" : "Do košíka"}
        </span>
        <span
          className={`col-start-1 row-start-1 transition-all duration-300 ease-out ${
            added
              ? "translate-y-0 scale-100 opacity-100"
              : "-translate-y-2 scale-95 opacity-0"
          }`}
        >
          Pridané
        </span>
      </span>
    </button>
  );
}
