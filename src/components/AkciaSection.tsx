import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProductCarousel } from "@/components/ProductCarousel";
import { akciaSlugs, getProductsBySlugs } from "@/lib/products";

export function AkciaSection() {
  const products = getProductsBySlugs(akciaSlugs);

  return (
    <section className="mt-14 w-full">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-3xl text-[#2f2924] sm:text-4xl">Akcia</h2>

        <Link
          href="/akcia"
          className="inline-flex cursor-pointer items-center gap-1 text-base font-normal text-[#2f2924] transition-colors hover:text-[#75825B] sm:text-lg"
        >
          Zobraziť všetko
          <ChevronRight className="size-5 sm:size-6" strokeWidth={1.75} aria-hidden />
        </Link>
      </div>

      <ProductCarousel products={products} enableHoverImage />
    </section>
  );
}
