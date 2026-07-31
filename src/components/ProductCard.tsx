"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ProductCardActions } from "@/components/ProductCardActions";
import {
  colorSwatchStyle,
  getColorPreviewImages,
  productHref,
  type Product,
} from "@/lib/products";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const href = productHref(product.slug);
  const colors = product.colors ?? [];
  const showSwatches = colors.length > 1;

  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);

  const preview =
    selectedColorId != null
      ? getColorPreviewImages(product, selectedColorId)
      : {
          image: product.image,
          hoverImage: product.hoverImage,
        };

  const hoverImage = preview.hoverImage ?? null;

  return (
    <article className="flex min-w-0 flex-col">
      <div className="relative aspect-square overflow-hidden rounded-3xl bg-white">
        <Link
          href={href}
          className={`group absolute inset-0${hoverImage ? "" : " transition-opacity hover:opacity-95"}`}
        >
          <Image
            key={preview.image}
            src={preview.image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
            quality={90}
            className={`object-cover${hoverImage ? " transition-opacity duration-700 ease-out group-hover:opacity-0" : ""}`}
          />
          {hoverImage ? (
            <Image
              key={hoverImage}
              src={hoverImage}
              alt=""
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
              quality={90}
              className="object-cover opacity-0 transition-opacity duration-700 ease-out group-hover:opacity-100"
              aria-hidden
            />
          ) : null}
        </Link>

        <FavoriteButton
          productId={product.id}
          productName={product.name}
          className="absolute top-3 left-3 z-10"
        />

        {product.discount ? (
          <span className="absolute top-3 right-3 z-10 rounded-full bg-[#c45c4a] px-2.5 py-1 text-xs font-bold text-white sm:text-sm">
            -{product.discount}%
          </span>
        ) : null}

        {showSwatches ? (
          <div
            className="absolute bottom-3 left-3 z-10 hidden max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-1.5 rounded-full bg-white/85 px-2 py-1.5 shadow-[0_2px_10px_rgba(47,41,36,0.12)] backdrop-blur-sm md:flex"
            role="list"
            aria-label="Farby"
          >
            {colors.map((color) => {
              const selected = selectedColorId === color.id;
              return (
                <button
                  key={color.id}
                  type="button"
                  role="listitem"
                  aria-label={color.label}
                  aria-pressed={selected}
                  title={color.label}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setSelectedColorId((prev) =>
                      prev === color.id ? null : color.id,
                    );
                  }}
                  className={`size-4 shrink-0 cursor-pointer rounded-full border transition-transform hover:scale-110 sm:size-[1.125rem] ${
                    selected
                      ? "border-[#2f2924] ring-2 ring-[#75825B]/40 ring-offset-1"
                      : "border-black/15"
                  }`}
                  style={colorSwatchStyle(color)}
                />
              );
            })}
          </div>
        ) : null}
      </div>

      <Link
        href={href}
        title={product.name}
        className="mt-3 block truncate text-left font-sans text-sm font-semibold text-[#2f2924] transition-colors hover:text-[#75825B] sm:text-base"
      >
        {product.name}
      </Link>

      <ProductCardActions product={product} />
    </article>
  );
}
