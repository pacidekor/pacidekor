import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductMediaPurchase } from "@/components/product/ProductMediaPurchase";
import { RelatedProducts } from "@/components/product/RelatedProducts";
import {
  applyDiscountToProduct,
  applyDiscountsToProducts,
} from "@/lib/discounts";
import { listDiscounts } from "@/lib/discounts-server";
import { getRelatedProducts } from "@/lib/products";
import {
  getProductBySlug,
  listProducts,
} from "@/lib/products-server";
import { categoryHref } from "@/lib/navigation";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ farba?: string | string[] }>;
};

/** Catalog changes in admin — prefer request-time rendering. */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [product, discounts] = await Promise.all([
    getProductBySlug(slug),
    listDiscounts(),
  ]);

  if (!product) {
    return { title: "Produkt nenájdený" };
  }

  const priced = applyDiscountToProduct(product, discounts);

  return {
    title: priced.name,
    description: priced.description,
  };
}

export default async function ProductPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const farbaRaw = query.farba;
  const initialColorId = Array.isArray(farbaRaw)
    ? farbaRaw[0]
    : farbaRaw?.split(",")[0];

  const [rawProduct, discounts, allProducts] = await Promise.all([
    getProductBySlug(slug),
    listDiscounts(),
    listProducts(),
  ]);

  if (!rawProduct) {
    notFound();
  }

  const product = applyDiscountToProduct(rawProduct, discounts);
  const related = getRelatedProducts(
    applyDiscountsToProducts(allProducts, discounts),
    product.slug,
  );

  return (
    <main className="flex flex-1 flex-col py-6 pb-14">
      <nav className="mb-6 text-sm text-[#2f2924]/55">
        <Link href="/" className="transition-colors hover:text-[#75825B]">
          Domov
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <Link
          href={categoryHref(product.category)}
          className="transition-colors hover:text-[#75825B]"
        >
          {product.category}
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <span className="text-[#2f2924]">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-12">
        <ProductMediaPurchase
          product={product}
          initialColorId={initialColorId}
        />
      </div>

      <RelatedProducts products={related} />
    </main>
  );
}
