import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CollectionCatalogBrowser } from "@/components/CollectionCatalogBrowser";
import { parseProduktySearchParams } from "@/lib/produkty-url";
import { listPricedProductsPage } from "@/lib/products-server";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 120;

export const metadata: Metadata = pageMetadata({
  title: "Bestsellery",
  description:
    "Najobľúbenejšie umelé kvety, dekorácie a aranžérsky materiál z ponuky PACIDEKOR.",
  path: "/bestsellery",
});

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BestselleryPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const { colors } = parseProduktySearchParams(raw);
  const page = await listPricedProductsPage({
    filters: {
      collection: "bestsellery",
      colors: colors.length > 0 ? colors : undefined,
    },
    offset: 0,
    limit: 24,
  });

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

      <Suspense
        fallback={
          <p className="text-sm text-[#2f2924]/55">Načítavam produkty…</p>
        }
      >
        <CollectionCatalogBrowser
          title="Bestsellery"
          collection="bestsellery"
          initialProducts={page.products}
          initialTotal={page.total}
          initialHasMore={page.hasMore}
        />
      </Suspense>
    </main>
  );
}
