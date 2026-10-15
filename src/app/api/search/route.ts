import { NextResponse } from "next/server";
import { listTaxonomy } from "@/lib/categories-server";
import { listPricedProductsUnstable } from "@/lib/products-server";
import type { Product } from "@/lib/products";
import { filterProductsBySearchQuery } from "@/lib/search";

export const runtime = "nodejs";

function slimSearchProduct(product: Product) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    sku: product.sku,
    price: product.price,
    originalPrice: product.originalPrice,
    discount: product.discount,
    category: product.category,
    image: product.image,
    inStock: product.inStock,
    colors: product.colors,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return NextResponse.json({ products: [] as ReturnType<typeof slimSearchProduct>[] });
  }

  const limitRaw = Number(searchParams.get("limit") ?? 8);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(1, Math.floor(limitRaw)), 24)
    : 8;

  const [products, taxonomy] = await Promise.all([
    listPricedProductsUnstable(),
    listTaxonomy(),
  ]);

  const druhLabels = Object.fromEntries(
    taxonomy.druhy.map((druh) => [druh.id, druh.label]),
  );

  const matched = filterProductsBySearchQuery(products, q, { druhLabels }).slice(
    0,
    limit,
  );

  return NextResponse.json(
    { products: matched.map(slimSearchProduct) },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    },
  );
}
