import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import type { Product } from "@/lib/products";
import { productHref } from "@/lib/products";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const href = productHref(product.slug);

  return (
    <article className="flex flex-col">
      <Link
        href={href}
        className="relative aspect-square overflow-hidden rounded-3xl bg-white transition-opacity hover:opacity-95"
      >
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover"
        />
        {product.discount ? (
          <span className="absolute top-3 left-3 rounded-full bg-[#c45c4a] px-2.5 py-1 text-xs font-bold text-white sm:text-sm">
            -{product.discount}%
          </span>
        ) : null}
      </Link>

      <Link
        href={href}
        className="mt-3 text-left font-sans text-sm font-semibold text-[#2f2924] transition-colors hover:text-[#75825B] sm:text-base"
      >
        {product.name}
      </Link>

      <div className="mt-2 flex items-center justify-between gap-2">
        {product.originalPrice ? (
          <div className="flex flex-col gap-0.5">
            <span className="font-sans text-xs text-[#2f2924]/50 line-through sm:text-sm">
              {product.originalPrice}
            </span>
            <span className="font-sans text-sm font-bold text-[#c45c4a] sm:text-base">
              {product.price}
            </span>
          </div>
        ) : (
          <span className="font-sans text-sm font-semibold text-[#2f2924] sm:text-base">
            {product.price}
          </span>
        )}
        <button
          type="button"
          aria-label={`Pridať ${product.name} do košíka`}
          className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-[#75825B] px-4 text-white transition-opacity hover:opacity-90"
        >
          <ShoppingCart className="size-4" strokeWidth={1.75} aria-hidden />
          <span className="text-xs font-medium sm:text-sm">Do košíka</span>
        </button>
      </div>
    </article>
  );
}
