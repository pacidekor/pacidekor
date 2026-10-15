import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { CategoryProductBrowser } from "@/components/CategoryProductBrowser";
import { JsonLd } from "@/components/JsonLd";
import { listTaxonomy } from "@/lib/categories-server";
import { toSlug } from "@/lib/navigation";
import { listPricedProductsPage } from "@/lib/products-server";
import { breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { parseCategoryFilters } from "@/lib/taxonomy";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** ISR — admin taxonomy/product writes still bust cache via revalidatePath. */
export const revalidate = 120;

/** Older public URLs that should still resolve after renames. */
const CATEGORY_SLUG_ALIASES: Record<string, string> = {
  aranzerstvo: "aranz-material",
};

async function resolveCategory(slug: string) {
  const taxonomy = await listTaxonomy();
  const resolvedSlug = CATEGORY_SLUG_ALIASES[slug] ?? slug;

  return (
    taxonomy.categories.find((category) => category.id === resolvedSlug) ??
    taxonomy.categories.find((category) => toSlug(category.label) === slug) ??
    null
  );
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const canonicalSlug = CATEGORY_SLUG_ALIASES[slug] ?? slug;
  const category = await resolveCategory(slug);

  if (!category) {
    return { title: "Kategória nenájdená" };
  }

  return pageMetadata({
    title: category.label,
    description:
      category.description?.trim() ||
      `Produkty v kategórii ${category.label} v ponuke PACIDEKOR.`,
    path: `/kategorie/${category.id || canonicalSlug}`,
    image: category.image,
  });
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const rawSearch = await searchParams;

  const aliasTarget = CATEGORY_SLUG_ALIASES[slug];
  if (aliasTarget) {
    permanentRedirect(`/kategorie/${aliasTarget}`);
  }

  const category = await resolveCategory(slug);

  if (!category) {
    notFound();
  }

  const filters = parseCategoryFilters(rawSearch);
  const page = await listPricedProductsPage({
    filters: {
      category: category.label,
      subcategoryId: filters.sub,
      druhId: filters.druh,
      colors: filters.farba,
    },
    offset: 0,
    limit: 24,
  });

  return (
    <main className="flex flex-1 flex-col py-6 pb-14">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Domov", path: "/" },
          { name: category.label, path: `/kategorie/${category.id}` },
        ])}
      />
      <nav className="mb-6 text-sm text-[#2f2924]/55">
        <Link href="/" className="transition-colors hover:text-[#75825B]">
          Domov
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <span className="text-[#2f2924]">{category.label}</span>
      </nav>

      <Suspense
        fallback={
          <div>
            <h1 className="text-3xl text-[#2f2924] sm:text-4xl">
              {category.label}
            </h1>
            <p className="mt-4 text-sm text-[#2f2924]/55">Načítavam produkty…</p>
          </div>
        }
      >
        <CategoryProductBrowser
          categoryLabel={category.label}
          categorySlug={category.id}
          initialProducts={page.products}
          initialTotal={page.total}
          initialHasMore={page.hasMore}
        />
      </Suspense>
    </main>
  );
}
