"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProductDetailsCards } from "@/components/product/ProductDetailsCards";
import { ProductImageGallery } from "@/components/product/ProductImageGallery";
import { ProductPurchase } from "@/components/product/ProductPurchase";
import { firstOrderableColorId } from "@/lib/order-line-color";
import {
  getGalleryForColor,
  getGalleryForTextVariant,
  resolveProductColorForFilters,
  type Product,
} from "@/lib/products";
import { firstOrderableVariant } from "@/lib/product-variants";

type ProductMediaPurchaseProps = {
  product: Product;
};

function resolveInitialColor(product: Product, initialColorId?: string) {
  const colorIds =
    product.attributes?.colors ?? product.colors?.map((c) => c.id) ?? [];
  const firstAvailable =
    firstOrderableColorId(colorIds, product.unavailableColorIds) ||
    product.colors?.[0]?.id ||
    "";
  if (!initialColorId) return firstAvailable;

  if (product.colors?.some((color) => color.id === initialColorId)) {
    return initialColorId;
  }

  return (
    resolveProductColorForFilters(product, [initialColorId]) ?? firstAvailable
  );
}

function colorIdFromSearchParams(searchParams: URLSearchParams) {
  const raw = searchParams.get("farba");
  if (!raw) return undefined;
  return raw.split(",")[0] || undefined;
}

export function ProductMediaPurchase({ product }: ProductMediaPurchaseProps) {
  const searchParams = useSearchParams();
  const farbaFromUrl = colorIdFromSearchParams(searchParams);
  const isCustom = product.variantMode === "custom";
  const variants = product.textVariants ?? [];

  const [selectedColor, setSelectedColor] = useState(() =>
    resolveInitialColor(product, farbaFromUrl),
  );
  const [selectedVariantId, setSelectedVariantId] = useState(
    () =>
      firstOrderableVariant(variants, product.defaultVariantId)?.id ??
      variants[0]?.id ??
      "",
  );

  useEffect(() => {
    setSelectedColor(resolveInitialColor(product, farbaFromUrl));
  }, [product, farbaFromUrl]);

  useEffect(() => {
    setSelectedVariantId(
      firstOrderableVariant(
        product.textVariants ?? [],
        product.defaultVariantId,
      )?.id ??
        product.textVariants?.[0]?.id ??
        "",
    );
  }, [product]);

  const gallery = isCustom
    ? getGalleryForTextVariant(product, selectedVariantId || undefined)
    : getGalleryForColor(product, selectedColor || undefined);

  return (
    <>
      <ProductImageGallery
        key={
          isCustom
            ? `v:${selectedVariantId || "default"}`
            : selectedColor || "default"
        }
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
          selectedVariantId={selectedVariantId}
          onSelectVariant={setSelectedVariantId}
        />
        <ProductDetailsCards />
      </div>
    </>
  );
}
