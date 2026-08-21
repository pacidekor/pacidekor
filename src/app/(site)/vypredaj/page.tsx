import type { Metadata } from "next";
import Link from "next/link";
import { ProductCollectionBrowser } from "@/components/ProductCollectionBrowser";
import { getVypredajProducts } from "@/lib/products";
import { listPricedProducts } from "@/lib/products-server";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: "Výpredaj",
  description:
    "Výpredajové umelé kvety, dekorácie a aranžérsky materiál od PACIDEKOR.",
  path: "/vypredaj",
});

export default async function VypredajPage() {
  const all = await listPricedProducts();
  const products = getVypredajProducts(all);

  return (
    <main className="flex flex-1 flex-col py-6 pb-14">
      <nav className="mb-6 text-sm text-[#2f2924]/55">
        <Link href="/" className="transition-colors hover:text-[#75825B]">
          Domov
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <span className="text-[#2f2924]">Výpredaj</span>
      </nav>

      <ProductCollectionBrowser
        title="Výpredaj"
        products={products}
        emptyState={
          <div className="rounded-2xl border border-dashed border-[#2f2924]/12 bg-white/50 px-6 py-16 text-center">
            <p className="text-sm font-medium text-[#2f2924]">
              Momentálne nie sú žiadne výpredajové produkty
            </p>
            <p className="mt-1 text-sm text-[#2f2924]/50">
              Nové produkty vo výpredaji sa tu zobrazia automaticky.
            </p>
          </div>
        }
      />
    </main>
  );
}
