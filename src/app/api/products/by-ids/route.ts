import { NextResponse } from "next/server";
import type { Product } from "@/lib/products";
import { listPricedProductsByIds } from "@/lib/products-server";

export const runtime = "nodejs";

/** Catalog net (+ akcia) only — B2C markup stays client-side. Never CDN-cache. */
function slimProduct(product: Product) {
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
    hoverImage: product.hoverImage,
    inStock: product.inStock,
    stockQuantity: product.stockQuantity,
    attributes: product.attributes,
    colors: product.colors,
    unavailableColorIds: product.unavailableColorIds ?? [],
    variantMode: product.variantMode,
    variantAxisLabel: product.variantAxisLabel,
    textVariants: product.textVariants,
    defaultVariantId: product.defaultVariantId,
    variantTotalCount: product.variantTotalCount,
    variantOrderableCount: product.variantOrderableCount,
    variantMinPriceCents: product.variantMinPriceCents,
    variantPriceVaries: product.variantPriceVaries,
  };
}

async function handleByIds(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("ids")?.trim() ?? "";
  const ids = [
    ...new Set(
      raw
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ].slice(0, 100);

  if (ids.length === 0) {
    return NextResponse.json({
      products: [] as ReturnType<typeof slimProduct>[],
    });
  }

  const products = await listPricedProductsByIds(ids);

  return NextResponse.json(
    { products: products.map(slimProduct) },
    {
      headers: {
        // Audience markup is client-side, but avoid shared CDN cache anyway.
        "Cache-Control": "private, no-store",
      },
    },
  );
}

export async function GET(request: Request) {
  return handleByIds(request);
}

/** OpenNext/CF sometimes probes HEAD; mirror GET to avoid intermittent 405. */
export async function HEAD(request: Request) {
  const res = await handleByIds(request);
  return new NextResponse(null, { status: res.status, headers: res.headers });
}
