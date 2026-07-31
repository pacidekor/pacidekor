import type { Metadata } from "next";
import Link from "next/link";
import { ProductCollectionBrowser } from "@/components/ProductCollectionBrowser";
import { listProducts } from "@/lib/products-server";

export const metadata: Metadata = {
  title: "Produkty",
  description: "Kompletná ponuka produktov PACIDEKOR.",
};

export default async function ProduktyPage() {
  const products = await listProducts();

  return (
    <main className="flex flex-1 flex-col py-6 pb-14">
      <nav className="mb-6 text-sm text-[#2f2924]/55">
        <Link href="/" className="transition-colors hover:text-[#75825B]">
          Domov
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <span className="text-[#2f2924]">Produkty</span>
      </nav>

      <ProductCollectionBrowser
        title="Produkty"
        products={products}
        emptyState={
          <p className="text-sm text-[#2f2924]/55">
            Zatiaľ tu nie sú žiadne produkty.
          </p>
        }
      />
    </main>
  );
}
