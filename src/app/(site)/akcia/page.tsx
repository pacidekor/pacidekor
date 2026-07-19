import type { Metadata } from "next";
import Link from "next/link";
import { ListFilter } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { akciaSlugs, getProductsBySlugs } from "@/lib/products";

export const metadata: Metadata = {
  title: "Akcia",
  description: "Aktuálne akciové produkty z ponuky PACIDEKOR.",
};

export default function AkciaPage() {
  const products = getProductsBySlugs(akciaSlugs);

  return (
    <main className="flex flex-1 flex-col py-6 pb-14">
      <nav className="mb-6 text-sm text-[#2f2924]/55">
        <Link href="/" className="transition-colors hover:text-[#75825B]">
          Domov
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <span className="text-[#2f2924]">Akcia</span>
      </nav>

      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl text-[#2f2924] sm:text-4xl">Akcia</h1>

        <button
          type="button"
          className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border border-[#2f2924]/12 bg-white px-4 text-sm font-medium text-[#2f2924] transition-colors hover:border-[#75825B]/40 hover:text-[#75825B] sm:px-5"
        >
          <ListFilter className="size-4" strokeWidth={1.75} aria-hidden />
          Filtrovať
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6 md:grid-cols-3 md:gap-7 lg:grid-cols-4 lg:gap-8">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} enableHoverImage />
        ))}
      </div>
    </main>
  );
}
