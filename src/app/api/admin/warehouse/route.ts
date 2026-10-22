import { NextResponse } from "next/server";
import { saveWarehouseStock } from "@/lib/warehouse-admin-server";
import { normalizeStockQty } from "@/lib/warehouse-stock";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Neplatný JSON." },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Neplatné telo požiadavky." },
      { status: 400 },
    );
  }

  const row = body as Record<string, unknown>;
  const productId =
    typeof row.productId === "string" ? row.productId.trim() : "";

  const colorStockRaw =
    row.colorStock && typeof row.colorStock === "object"
      ? (row.colorStock as Record<string, unknown>)
      : undefined;
  const variantStockRaw =
    row.variantStock && typeof row.variantStock === "object"
      ? (row.variantStock as Record<string, unknown>)
      : undefined;

  const colorStock = colorStockRaw
    ? Object.fromEntries(
        Object.entries(colorStockRaw).map(([k, v]) => [k, normalizeStockQty(v)]),
      )
    : undefined;
  const variantStock = variantStockRaw
    ? Object.fromEntries(
        Object.entries(variantStockRaw).map(([k, v]) => [
          k,
          normalizeStockQty(v),
        ]),
      )
    : undefined;

  const result = await saveWarehouseStock({
    productId,
    productQty: normalizeStockQty(row.productQty),
    colorStock,
    variantStock,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: result.status ?? 400 },
    );
  }

  return NextResponse.json({ ok: true, product: result.product });
}
