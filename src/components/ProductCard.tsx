import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import type { Product } from "@/lib/products";
import { productHref } from "@/lib/products";

type ProductCardProps = {
  product: Product;
  enableHoverImage?: boolean;
};

export function ProductCard({
  product,
  enableHoverImage = false,
}: ProductCardProps) {
  const href = productHref(product.slug);
  const hoverImage =
    enableHoverImage && product.hoverImage ? product.hoverImage : null;

  return (
    <article className="flex min-w-0 flex-col">
      <Link
        href={href}
        className={`group relative aspect-square overflow-hidden rounded-3xl bg-white${hoverImage ? "" : " transition-opacity hover:opacity-95"}`}
      >
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
          quality={90}
          className={`object-cover${hoverImage ? " transition-opacity duration-700 ease-out group-hover:opacity-0" : ""}`}
        />
        {hoverImage ? (
          <Image
            src={hoverImage}
            alt=""
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
            quality={90}
            className="object-cover opacity-0 transition-opacity duration-700 ease-out group-hover:opacity-100"
            aria-hidden
          />
        ) : null}
        {product.discount ? (
          <span className="absolute top-3 left-3 z-10 rounded-full bg-[#c45c4a] px-2.5 py-1 text-xs font-bold text-white sm:text-sm">
            -{product.discount}%
          </span>
        ) : null}
      </Link>

      <Link
        href={href}
        title={product.name}
        className="mt-3 block truncate text-left font-sans text-sm font-semibold text-[#2f2924] transition-colors hover:text-[#75825B] sm:text-base"
      >
        {product.name}
      </Link>

      <div className="mt-2 flex min-w-0 items-center justify-between gap-1.5">
        {product.originalPrice ? (
          <div className="min-w-0 shrink">
            <span className="block whitespace-nowrap font-sans text-[11px] text-[#2f2924]/50 line-through sm:text-sm">
              {product.originalPrice}
            </span>
            <span className="block whitespace-nowrap font-sans text-sm font-bold text-[#c45c4a] sm:text-base">
              {product.price}
            </span>
          </div>
        ) : (
          <span className="min-w-0 shrink whitespace-nowrap font-sans text-sm font-semibold text-[#2f2924] sm:text-base">
            {product.price}
          </span>
        )}
        <button
          type="button"
          aria-label={`Pridať ${product.name} do košíka`}
          className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1 rounded-full bg-[#75825B] px-2.5 text-white transition-opacity hover:opacity-90 sm:gap-1.5 sm:px-4"
        >
          <ShoppingCart className="size-4" strokeWidth={1.75} aria-hidden />
          <span className="hidden text-xs font-medium min-[380px]:inline sm:text-sm">
            Do košíka
          </span>
        </button>
      </div>
    </article>
  );
}
