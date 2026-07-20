import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListFilter } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { categoryList, getCategoryBySlug } from "@/lib/navigation";
import { getProductsByCategory } from "@/lib/products";

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

  const categoryProducts = getProductsByCategory(category.label);

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

      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl text-[#2f2924] sm:text-4xl">{category.label}</h1>

        <button
          type="button"
          className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border border-[#2f2924]/12 bg-white px-4 text-sm font-medium text-[#2f2924] transition-colors hover:border-[#75825B]/40 hover:text-[#75825B] sm:px-5"
        >
          <ListFilter className="size-4" strokeWidth={1.75} aria-hidden />
          Filtrovať
        </button>
      </div>

      {categoryProducts.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {categoryProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl bg-white px-6 py-12 text-center sm:px-10">
          <p className="font-heading text-xl text-[#2f2924] sm:text-2xl">
            Produkty pripravujeme
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#2f2924]/65 sm:text-base">
            V tejto kategórii zatiaľ nie sú žiadne produkty. Čoskoro ich
            doplníme.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex cursor-pointer rounded-full bg-[#75825B] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Späť na úvod
          </Link>
        </div>
      )}
    </main>
  );
}
