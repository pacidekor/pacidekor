import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { getProductsBySlugs, novinkySlugs } from "@/lib/products";

export function NovinkySection() {
  const products = getProductsBySlugs(novinkySlugs);

  return (
    <section className="mt-14 w-full">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-3xl text-[#2f2924] sm:text-4xl">Novinky</h2>

        <Link
          href="/novinky"
          className="inline-flex cursor-pointer items-center gap-1 text-base font-normal text-[#2f2924] transition-colors hover:text-[#75825B] sm:text-lg"
        >
          Zobraziť všetko
          <ChevronRight className="size-5 sm:size-6" strokeWidth={1.75} aria-hidden />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-6 md:grid-cols-3 md:gap-7 lg:grid-cols-5 lg:gap-8">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
