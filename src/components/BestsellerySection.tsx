import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProductCarousel } from "@/components/ProductCarousel";
import { getBestsellerProducts } from "@/lib/products";
import { listPricedProducts } from "@/lib/products-server";

export async function BestsellerySection() {
  const all = await listPricedProducts();
  const products = getBestsellerProducts(all, 5);

  if (products.length === 0) return null;

  return (
    <section className="mt-14 w-full">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-3xl text-[#2f2924] sm:text-4xl">Bestsellery</h2>

        <Link
          href="/bestsellery"
          className="inline-flex cursor-pointer items-center gap-1 text-base font-normal text-[#2f2924] transition-colors hover:text-[#75825B] sm:text-lg"
        >
          Zobraziť všetko
          <ChevronRight className="size-5 sm:size-6" strokeWidth={1.75} aria-hidden />
        </Link>
      </div>

      <ProductCarousel products={products} />
    </section>
  );
}
