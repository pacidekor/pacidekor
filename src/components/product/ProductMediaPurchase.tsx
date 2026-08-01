"use client";

import { useState } from "react";
import { ProductDetailsCards } from "@/components/product/ProductDetailsCards";
import { ProductImageGallery } from "@/components/product/ProductImageGallery";
import { ProductPurchase } from "@/components/product/ProductPurchase";
import { getGalleryForColor, type Product } from "@/lib/products";

type ProductMediaPurchaseProps = {
  product: Product;
};

export function ProductMediaPurchase({ product }: ProductMediaPurchaseProps) {
  const [selectedColor, setSelectedColor] = useState(
    product.colors?.[0]?.id ?? "",
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
