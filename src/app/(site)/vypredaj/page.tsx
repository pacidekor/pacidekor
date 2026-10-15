import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CollectionCatalogBrowser } from "@/components/CollectionCatalogBrowser";
import { parseProduktySearchParams } from "@/lib/produkty-url";
import { listPricedProductsPage } from "@/lib/products-server";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 120;

export const metadata: Metadata = pageMetadata({
  title: "Výpredaj",
  description:
    "Výpredajové umelé kvety, dekorácie a aranžérsky materiál od PACIDEKOR.",
  path: "/vypredaj",
});

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VypredajPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const { colors } = parseProduktySearchParams(raw);
  const page = await listPricedProductsPage({
    filters: {
      collection: "vypredaj",
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
        <span className="text-[#2f2924]">Výpredaj</span>
      </nav>

      <Suspense
        fallback={
          <p className="text-sm text-[#2f2924]/55">Načítavam produkty…</p>
        }
      >
        <CollectionCatalogBrowser
          title="Výpredaj"
          collection="vypredaj"
          initialProducts={page.products}
          initialTotal={page.total}
          initialHasMore={page.hasMore}
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
      </Suspense>
    </main>
  );
}
