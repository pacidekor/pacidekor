import type { Metadata } from "next";
import Link from "next/link";
import { ProductCollectionBrowser } from "@/components/ProductCollectionBrowser";
import { getNewestProducts } from "@/lib/products";
import { listPricedProducts } from "@/lib/products-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Novinky",
  description: "Najnovšie produkty z ponuky PACIDEKOR.",
};

export default async function NovinkyPage() {
  const all = await listPricedProducts();
  const products = getNewestProducts(all);

  return (
    <main className="flex flex-1 flex-col py-6 pb-14">
      <nav className="mb-6 text-sm text-[#2f2924]/55">
        <Link href="/" className="transition-colors hover:text-[#75825B]">
          Domov
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <span className="text-[#2f2924]">Novinky</span>
      </nav>

      <ProductCollectionBrowser title="Novinky" products={products} />
    </main>
  );
}
