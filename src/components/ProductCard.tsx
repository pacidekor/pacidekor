import Image from "next/image";
import Link from "next/link";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ProductCardActions } from "@/components/ProductCardActions";
import type { Product } from "@/lib/products";
import { productHref } from "@/lib/products";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const href = productHref(product.slug);
  const hoverImage = product.hoverImage ?? null;

  return (
    <article className="flex min-w-0 flex-col">
      <div className="relative aspect-square overflow-hidden rounded-3xl bg-white">
        <Link
          href={href}
          className={`group absolute inset-0${hoverImage ? "" : " transition-opacity hover:opacity-95"}`}
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
