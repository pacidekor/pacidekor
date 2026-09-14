import type { Metadata } from "next";
import Link from "next/link";
import { ProductCollectionBrowser } from "@/components/ProductCollectionBrowser";
import { getBestsellerProducts } from "@/lib/products";
import { listPricedProducts } from "@/lib/products-server";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: "Bestsellery",
  description:
    "Najobľúbenejšie umelé kvety, dekorácie a aranžérsky materiál z ponuky PACIDEKOR.",
  path: "/bestsellery",
});

export default async function BestselleryPage() {
  const all = await listPricedProducts();
  const products = getBestsellerProducts(all);

  return (
    <main className="flex flex-1 flex-col py-6 pb-14">
      <nav className="mb-6 text-sm text-[#2f2924]/55">
        <Link href="/" className="transition-colors hover:text-[#75825B]">
          Domov
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <span className="text-[#2f2924]">Bestsellery</span>
      </nav>

      <ProductCollectionBrowser title="Bestsellery" products={products} />
    </main>
  );
}
