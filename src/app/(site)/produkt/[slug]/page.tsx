import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { ProductMediaPurchase } from "@/components/product/ProductMediaPurchase";
import { RelatedProducts } from "@/components/product/RelatedProducts";
import { listTaxonomy } from "@/lib/categories-server";
import {
  applyDiscountToProduct,
  applyDiscountsToProducts,
} from "@/lib/discounts";
import { listDiscounts } from "@/lib/discounts-server";
import { categoryHrefById, categoryHref } from "@/lib/navigation";
import { parsePrice } from "@/lib/price";
import { getRelatedProducts } from "@/lib/products";
import {
  getProductBySlug,
  listProducts,
} from "@/lib/products-server";
import {
  breadcrumbJsonLd,
  pageMetadata,
  productJsonLd,
} from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ farba?: string | string[] }>;
};

/** Catalog changes in admin - prefer request-time rendering. */
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
  const description =
    priced.description?.trim() ||
    `${priced.name} - umelé kvety a dekorácie v ponuke PACIDEKOR.`;

  return pageMetadata({
    title: priced.name,
    description,
    path: `/produkt/${priced.slug}`,
    image: priced.image,
  });
}

export default async function ProductPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const farbaRaw = query.farba;
  const initialColorId = Array.isArray(farbaRaw)
    ? farbaRaw[0]
    : farbaRaw?.split(",")[0];

  const [rawProduct, discounts, allProducts, taxonomy] = await Promise.all([
    getProductBySlug(slug),
    listDiscounts(),
    listProducts(),
    listTaxonomy(),
  ]);

  if (!rawProduct) {
    notFound();
  }

  const product = applyDiscountToProduct(rawProduct, discounts);
  const related = getRelatedProducts(
    applyDiscountsToProducts(allProducts, discounts),
    product.slug,
  );
  const categoryMatch = taxonomy.categories.find(
    (category) => category.label === product.category,
  );
  const categoryLink = categoryMatch
    ? categoryHrefById(categoryMatch.id)
    : categoryHref(product.category);
  const categoryPath = categoryMatch
    ? `/kategorie/${categoryMatch.id}`
    : categoryLink;

  return (
    <main className="flex flex-1 flex-col py-6 pb-14">
      <JsonLd
        data={[
          productJsonLd({
            name: product.name,
            description: product.description,
            slug: product.slug,
            image: product.image,
            sku: product.sku,
            price: parsePrice(product.price),
            inStock: product.inStock,
            category: product.category,
          }),
          breadcrumbJsonLd([
            { name: "Domov", path: "/" },
            { name: product.category, path: categoryPath },
            { name: product.name, path: `/produkt/${product.slug}` },
          ]),
        ]}
      />
      <nav className="mb-6 text-sm text-[#2f2924]/55">
        <Link href="/" className="transition-colors hover:text-[#75825B]">
          Domov
        </Link>
        <span className="mx-2" aria-hidden>
          /
        </span>
        <Link
          href={categoryLink}
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
