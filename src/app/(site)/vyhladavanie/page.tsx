import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SearchCatalogBrowser } from "@/components/SearchCatalogBrowser";
import { parseProduktySearchParams } from "@/lib/produkty-url";
import { listPricedProductsPage } from "@/lib/products-server";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function resolveQuery(raw: string | string[] | undefined) {
  if (Array.isArray(raw)) return raw[0]?.trim() ?? "";
  return raw?.trim() ?? "";
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const query = resolveQuery((await searchParams).q);

  if (!query) {
    return pageMetadata({
      title: "Vyhľadávanie",
      description: "Vyhľadávanie produktov v ponuke PACIDEKOR.",
      path: "/vyhladavanie",
      noIndex: true,
    });
  }

  return pageMetadata({
    title: `Výsledok hľadania: ${query}`,
    description: `Produkty nájdené pre „${query}“.`,
    path: `/vyhladavanie?q=${encodeURIComponent(query)}`,
    noIndex: true,
  });
}

export default async function VyhladavaniePage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const query = resolveQuery(raw.q);
  const { category, colors } = parseProduktySearchParams(raw);

  const page = query
    ? await listPricedProductsPage({
        filters: {
          q: query,
          category,
          colors: colors.length > 0 ? colors : undefined,
        },
        offset: 0,
        limit: 24,
      })
    : {
        products: [],
        total: 0,
        hasMore: false,
        offset: 0,
        limit: 24,
      };

  const title = query ? `Výsledok hľadania: ${query}` : "Vyhľadávanie";

  return (
    <main className="flex flex-1 flex-col py-6 pb-14">
      <nav className="mb-6 text-sm text-[#2f2924]/55">
        <Link href="/" className="transition-colors hover:text-[#75825B]">
          Domov
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <span className="text-[#2f2924]">Vyhľadávanie</span>
      </nav>

      <Suspense
        fallback={
          <p className="text-sm text-[#2f2924]/55">Načítavam výsledky…</p>
        }
      >
        <SearchCatalogBrowser
          query={query}
          title={title}
          initialProducts={page.products}
          initialTotal={page.total}
          initialHasMore={page.hasMore}
          emptyState={
            <div className="rounded-3xl bg-white px-6 py-12 text-center sm:px-10">
              <p className="font-heading text-xl text-[#2f2924] sm:text-2xl">
                {query ? "Nič sme nenašli" : "Zadajte hľadaný výraz"}
              </p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#2f2924]/65 sm:text-base">
                {query
                  ? `Pre „${query}“ sme nenašli žiadne produkty. Skúste iný výraz alebo prehliadajte kategórie.`
                  : "Použite vyhľadávanie v hornom paneli a stlačte Enter."}
              </p>
              <Link
                href="/produkty"
                className="mt-6 inline-flex cursor-pointer rounded-full bg-[#75825B] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Prejsť na produkty
              </Link>
            </div>
          }
        />
      </Suspense>
    </main>
  );
}
