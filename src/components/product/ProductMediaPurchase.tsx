"use client";

import { useState } from "react";
import { ProductDetailsCards } from "@/components/product/ProductDetailsCards";
import { ProductImageGallery } from "@/components/product/ProductImageGallery";
import { ProductPurchase } from "@/components/product/ProductPurchase";
import {
  getGalleryForColor,
  resolveProductColorForFilters,
  type Product,
} from "@/lib/products";

type ProductMediaPurchaseProps = {
  product: Product;
  /** Color from catalog filter / card (`?farba=`). */
  initialColorId?: string;
};

function resolveInitialColor(product: Product, initialColorId?: string) {
  const fallback = product.colors?.[0]?.id ?? "";
  if (!initialColorId) return fallback;

  if (product.colors?.some((color) => color.id === initialColorId)) {
    return initialColorId;
  }

  return (
    resolveProductColorForFilters(product, [initialColorId]) ?? fallback
  );
}

export function ProductMediaPurchase({
  product,
  initialColorId,
}: ProductMediaPurchaseProps) {
  const [selectedColor, setSelectedColor] = useState(() =>
    resolveInitialColor(product, initialColorId),
  );

  const gallery = getGalleryForColor(
    product,
    selectedColor || undefined,
  );

  return (
    <>
      <ProductImageGallery
        key={selectedColor || "default"}
        images={gallery}
        alt={product.name}
        discount={product.discount}
      />

      <div>
        <h1 className="text-3xl text-[#2f2924] sm:text-4xl lg:text-5xl">
          {product.name}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[#2f2924]/70 sm:text-lg">
          {product.description}
        </p>
        <ProductPurchase
          product={product}
          selectedColor={selectedColor}
          onSelectColor={setSelectedColor}
        />
        <ProductDetailsCards />
      </div>
    </>
  );
}
