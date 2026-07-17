import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductDetailsCards } from "@/components/product/ProductDetailsCards";
import { ProductPurchase } from "@/components/product/ProductPurchase";
import { RelatedProducts } from "@/components/product/RelatedProducts";
import {
  getProductBySlug,
  getRelatedProducts,
  products,
} from "@/lib/products";
import { categoryHref } from "@/lib/navigation";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    return { title: "Produkt nenájdený" };
  }

  return {
    title: product.name,
    description: product.description,
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const related = getRelatedProducts(product.slug);

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

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 lg:items-start">
        <div className="relative aspect-square overflow-hidden rounded-3xl bg-white">
          <Image
            src={product.image}
            alt={product.name}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 40vw"
            className="object-cover"
          />
          {product.discount ? (
            <span className="absolute top-4 left-4 rounded-full bg-[#c45c4a] px-3 py-1.5 text-sm font-bold text-white">
              -{product.discount}%
            </span>
          ) : null}
        </div>

        <div>
          <h1 className="text-3xl text-[#2f2924] sm:text-4xl lg:text-5xl">
            {product.name}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[#2f2924]/70 sm:text-lg">
            {product.description}
          </p>
          <ProductPurchase product={product} />
          <ProductDetailsCards details={product.details} />
        </div>
      </div>

      <RelatedProducts products={related} />
    </main>
  );
}
