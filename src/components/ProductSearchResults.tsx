"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { productHref, type Product } from "@/lib/products";
import { usePricedProducts } from "@/lib/use-priced-product";

type ProductSearchResultsProps = {
  products: Product[];
  query: string;
  onSelect?: () => void;
  /** Keep input focus on desktop when clicking a result. */
  preventMouseDownBlur?: boolean;
  variant?: "desktop" | "mobile";
};

export function ProductSearchResults({
  products,
  query,
  onSelect,
  preventMouseDownBlur = false,
  variant = "desktop",
}: ProductSearchResultsProps) {
  const isMobile = variant === "mobile";
  const pricedProducts = usePricedProducts(products);

  if (pricedProducts.length === 0) {
    return (
      <p
        className={`text-[#2f2924]/55 ${
          isMobile ? "px-2 py-3 text-sm" : "px-4 py-4 text-sm"
        }`}
      >
        Žiadne produkty pre „{query.trim()}“
      </p>
    );
  }

  return (
    <ul className={isMobile ? "flex flex-col gap-0.5" : "flex flex-col gap-0.5 p-1.5"}>
      {pricedProducts.map((product) => (
        <li key={product.id}>
          <Link
            href={productHref(product.slug)}
            prefetch={false}
            onMouseDown={
              preventMouseDownBlur
                ? (event) => event.preventDefault()
                : undefined
            }
            onClick={onSelect}
            className="group flex items-center gap-3 rounded-xl bg-transparent px-2.5 py-2 transition-[background-color,transform] duration-200 ease-out hover:bg-[#e8ebe2] active:scale-[0.99]"
          >
            <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-[#f3efe9] sm:size-14">
              <Image
                src={product.image}
                alt=""
                fill
                sizes="56px"
                quality={90}
                className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium text-[#2f2924] sm:text-base">
                {product.name}
              </span>
              <span className="mt-0.5 block text-sm text-[#2f2924]/55">
                {product.originalPrice ? (
                  <>
                    <span className="mr-1.5 line-through">
                      {product.originalPrice}
                    </span>
                    <span className="font-semibold text-[#c45c4a]">
                      {product.price}
                    </span>
                  </>
                ) : (
                  <span className="font-semibold text-[#2f2924]">
                    {product.price}
                  </span>
                )}
              </span>
            </span>
            <ChevronRight
              className="size-5 shrink-0 text-[#2f2924]/30 transition-colors duration-200 group-hover:text-[#75825B]"
              strokeWidth={1.75}
              aria-hidden
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
