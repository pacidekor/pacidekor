import "server-only";

import {
  computeVariantSummary,
  normalizeTextVariants,
} from "@/lib/product-variants";
import { resolveVariantMode } from "@/lib/products";
import { createServiceClient } from "@/lib/supabase/server";
import type { ProductRow } from "@/lib/supabase/database.types";
import {
  mergeColorStockWithUnavailable,
  normalizeStockQty,
  parseColorStock,
  serializeColorStock,
  textVariantWithStock,
  unavailableColorIdsFromStock,
  type StockQty,
} from "@/lib/warehouse-stock";

type ServiceClient = ReturnType<typeof createServiceClient>;

function decrementTrackedQty(current: StockQty, delta: number): StockQty {
  if (current === null) return null; // unlimited stays unlimited
  return Math.max(0, current - delta);
}

/**
 * Deduct warehouse stock for an order once (idempotent via
 * orders.warehouse_stock_decremented_at). Call after Packeta label print.
 */
export async function decrementWarehouseStockForOrder(
  db: ServiceClient,
  orderId: string,
): Promise<{ ok: true; skipped?: boolean } | { ok: false; error: string }> {
  const claimedAt = new Date().toISOString();
  const { data: claimed, error: claimError } = await db
    .from("orders")
    .update({ warehouse_stock_decremented_at: claimedAt })
    .eq("id", orderId)
    .is("warehouse_stock_decremented_at", null)
    .select("id")
    .maybeSingle();

  if (claimError) {
    return { ok: false, error: claimError.message };
  }
  if (!claimed) {
    return { ok: true, skipped: true };
  }

  const { data: items, error: itemsError } = await db
    .from("order_items")
    .select("product_id, quantity, color_id, variant_id")
    .eq("order_id", orderId);

  if (itemsError) {
    await db
      .from("orders")
      .update({ warehouse_stock_decremented_at: null })
      .eq("id", orderId);
    return { ok: false, error: itemsError.message };
  }

  // Aggregate per product so we load each product once.
  const byProduct = new Map<
    string,
    { quantity: number; colorId: string | null; variantId: string | null }[]
  >();
  for (const item of items ?? []) {
    const list = byProduct.get(item.product_id) ?? [];
    list.push({
      quantity: Math.max(0, Math.floor(Number(item.quantity) || 0)),
      colorId: item.color_id,
      variantId: item.variant_id ?? null,
    });
    byProduct.set(item.product_id, list);
  }

  try {
    for (const [productId, lines] of byProduct) {
      const { data: row, error: loadError } = await db
        .from("products")
        .select(
          "id, images, color_ids, unavailable_color_ids, color_stock, in_stock, stock_quantity, variant_mode, variant_axis_label, text_variants, default_variant_id",
        )
        .eq("id", productId)
        .maybeSingle();

      if (loadError) throw new Error(loadError.message);
      if (!row) continue;

      const product = row as ProductRow;
      const images = Array.isArray(product.images)
        ? product.images.filter((u): u is string => typeof u === "string")
        : [];
      const colorIds = product.color_ids ?? [];
      const mode = resolveVariantMode(product, colorIds);

      if (mode === "colors" && colorIds.length > 0) {
        const stock = mergeColorStockWithUnavailable({
          colorIds,
          colorStock: parseColorStock(product.color_stock),
          unavailableColorIds: product.unavailable_color_ids,
        });

        for (const line of lines) {
          if (!line.colorId || line.quantity <= 0) continue;
          if (!colorIds.includes(line.colorId)) continue;
          const current =
            line.colorId in stock ? normalizeStockQty(stock[line.colorId]) : null;
          stock[line.colorId] = decrementTrackedQty(current, line.quantity);
        }

        const serialized = serializeColorStock(colorIds, stock);
        const unavailable = unavailableColorIdsFromStock(
          colorIds,
          Object.fromEntries(
            colorIds.map((id) => [
              id,
              id in serialized ? (serialized[id] as StockQty) : null,
            ]),
          ),
        );
        const anyOrderable = colorIds.some((id) => {
          if (!(id in serialized)) return true;
          const q = serialized[id];
          return q === null || (typeof q === "number" && q > 0);
        });

        const { error } = await db
          .from("products")
          .update({
            color_stock: serialized,
            unavailable_color_ids: unavailable,
            in_stock: anyOrderable,
            stock_quantity: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", productId);
        if (error) throw new Error(error.message);
        continue;
      }

      if (mode === "custom") {
        const existing = normalizeTextVariants(product.text_variants, images);
        const next = existing.map((v) => {
          const used = lines
            .filter((l) => l.variantId === v.id)
            .reduce((sum, l) => sum + l.quantity, 0);
          if (used <= 0) return v;
          const current =
            v.stockQuantity !== undefined
              ? normalizeStockQty(v.stockQuantity)
              : v.available === false
                ? 0
                : null;
          return textVariantWithStock(v, decrementTrackedQty(current, used));
        });
        const axisLabel = product.variant_axis_label?.trim() || null;
        const defaultVariantId = product.default_variant_id?.trim() || null;
        const summary = computeVariantSummary(
          "custom",
          next,
          axisLabel,
          defaultVariantId,
        );
        const { error } = await db
          .from("products")
          .update({
            text_variants: next,
            variant_total_count: summary.totalCount,
            variant_orderable_count: summary.orderableCount,
            variant_min_price_cents: summary.minPriceCents,
            variant_price_varies: summary.priceVaries,
            in_stock: summary.orderableCount > 0,
            stock_quantity: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", productId);
        if (error) throw new Error(error.message);
        continue;
      }

      // none — product-level stock
      const totalQty = lines.reduce((sum, l) => sum + l.quantity, 0);
      if (totalQty <= 0) continue;
      const { error: stockError } = await db.rpc("adjust_product_stock", {
        p_product_id: productId,
        p_delta: -totalQty,
      });
      if (stockError) throw new Error(stockError.message);
    }
  } catch (error) {
    await db
      .from("orders")
      .update({ warehouse_stock_decremented_at: null })
      .eq("id", orderId);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Strhnutie skladu zlyhalo.",
    };
  }

  return { ok: true };
}
