import { NextResponse } from "next/server";
import type { StorefrontCollection } from "@/lib/produkty-url";
import { listPricedProductsPage } from "@/lib/products-server";

export const runtime = "nodejs";

const COLLECTIONS = new Set<StorefrontCollection>([
  "novinky",
  "bestsellery",
  "vypredaj",
  "akcia",
]);

function parseCollection(
  raw: string | null,
): StorefrontCollection | undefined {
  if (!raw) return undefined;
  return COLLECTIONS.has(raw as StorefrontCollection)
    ? (raw as StorefrontCollection)
    : undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || undefined;
  const category = searchParams.get("kategoria")?.trim() || undefined;
  const subcategoryId = searchParams.get("sub")?.trim() || undefined;
  const druhId = searchParams.get("druh")?.trim() || undefined;
  const collection = parseCollection(searchParams.get("kolekcia"));
  const colorsRaw = searchParams.get("farba")?.trim() ?? "";
  const colors = colorsRaw
    ? colorsRaw
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    : undefined;
  const offset = Number(searchParams.get("offset") ?? 0);
  const limit = Number(searchParams.get("limit") ?? 24);

  const page = await listPricedProductsPage({
    filters: {
      q,
      category,
      subcategoryId,
      druhId,
      collection,
      colors: colors && colors.length > 0 ? colors : undefined,
    },
    offset: Number.isFinite(offset) ? offset : 0,
    limit: Number.isFinite(limit) ? limit : 24,
  });

  return NextResponse.json(page, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
