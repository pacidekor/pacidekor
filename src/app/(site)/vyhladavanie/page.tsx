import type { Metadata } from "next";
import Link from "next/link";
import { ProductCollectionBrowser } from "@/components/ProductCollectionBrowser";
import { listTaxonomy } from "@/lib/categories-server";
import { listPricedProducts } from "@/lib/products-server";
import { filterProductsBySearchQuery } from "@/lib/search";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ q?: string | string[] }>;
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
    return {
      title: "Vyhľadávanie",
      description: "Vyhľadávanie produktov v ponuke PACIDEKOR.",
    };
  }

  return {
    title: `Výsledok hľadania: ${query}`,
    description: `Produkty nájdené pre „${query}“.`,
  };
}

export default async function VyhladavaniePage({ searchParams }: PageProps) {
  const query = resolveQuery((await searchParams).q);
  const [allProducts, taxonomy] = await Promise.all([
    listPricedProducts(),
    listTaxonomy(),
  ]);

  const druhLabels = Object.fromEntries(
    taxonomy.druhy.map((druh) => [druh.id, druh.label]),
  );

  const products = query
    ? filterProductsBySearchQuery(allProducts, query, { druhLabels })
    : [];

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

      <ProductCollectionBrowser
        title={title}
        products={products}
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
    </main>
  );
}
