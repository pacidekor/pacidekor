import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ProduktyBrowser } from "@/components/ProduktyBrowser";
import { parseProduktySearchParams } from "@/lib/produkty-url";
import { listPricedProductsPage } from "@/lib/products-server";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 120;

export const metadata: Metadata = pageMetadata({
  title: "Produkty",
  description:
    "Kompletná ponuka umelých kvetov, dekorácií a aranžérskeho materiálu PACIDEKOR.",
  path: "/produkty",
});

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProduktyPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const filters = parseProduktySearchParams(raw);
  const page = await listPricedProductsPage({
    filters: {
      category: filters.category,
      colors: filters.colors.length > 0 ? filters.colors : undefined,
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
        <span className="text-[#2f2924]">Produkty</span>
      </nav>

      <Suspense
        fallback={
          <div>
            <h1 className="text-3xl text-[#2f2924] sm:text-4xl">Produkty</h1>
            <p className="mt-4 text-sm text-[#2f2924]/55">Načítavam produkty…</p>
          </div>
        }
      >
        <ProduktyBrowser
          initialProducts={page.products}
          initialTotal={page.total}
          initialHasMore={page.hasMore}
        />
      </Suspense>
    </main>
  );
}
