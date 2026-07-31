import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CategoryProductBrowser } from "@/components/CategoryProductBrowser";
import { categoryList, getCategoryBySlug } from "@/lib/navigation";
import { getProductsByCategory } from "@/lib/products";
import { listProducts } from "@/lib/products-server";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return categoryList.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    return { title: "Kategória nenájdená" };
  }

  return {
    title: category.label,
    description: category.description,
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const allProducts = await listProducts();
  const categoryProducts = getProductsByCategory(allProducts, category.label);

  return (
    <main className="flex flex-1 flex-col py-6 pb-14">
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
          categorySlug={category.slug}
          products={categoryProducts}
        />
      </Suspense>
    </main>
  );
}
