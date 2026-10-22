import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  computeVariantSummary,
  normalizeTextVariants,
  type TextVariant,
} from "@/lib/product-variants";
import { resolveVariantMode } from "@/lib/products";
import type { ProductRow } from "@/lib/supabase/database.types";
import {
  applyStockToTextVariants,
  normalizeStockQty,
  serializeColorStock,
  unavailableColorIdsFromStock,
  type StockQty,
} from "@/lib/warehouse-stock";

export type WarehouseSaveInput = {
  productId: string;
  /** none-mode product qty; ignored for colors/custom */
  productQty?: StockQty;
  /** colorId → qty */
  colorStock?: Record<string, StockQty>;
  /** variantId → qty */
  variantStock?: Record<string, StockQty>;
};

export type WarehouseSaveResult =
  | {
      ok: true;
      product: {
        id: string;
        inStock: boolean;
        stockQuantity: number | null;
        unavailableColorIds: string[];
        colorStock: Record<string, StockQty>;
        textVariants: TextVariant[];
        variantOrderableCount: number;
        variantTotalCount: number;
      };
    }
  | { ok: false; error: string; status?: number };

async function requireAdmin() {
  const supabase = await createClient("admin");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Nie ste prihlásený.", status: 401 };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { ok: false as const, error: "Nemáte oprávnenie administrátora.", status: 403 };
  }

  return { ok: true as const, supabase };
}

export async function saveWarehouseStock(
  input: WarehouseSaveInput,
): Promise<WarehouseSaveResult> {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return { ok: false, error: auth.error, status: auth.status };
  }

  const productId = input.productId?.trim();
  if (!productId) {
    return { ok: false, error: "Chýba ID produktu.", status: 400 };
  }

  const { data: row, error: loadError } = await auth.supabase
    .from("products")
    .select(
      "id, images, color_ids, unavailable_color_ids, color_stock, in_stock, stock_quantity, variant_mode, variant_axis_label, text_variants, default_variant_id",
    )
    .eq("id", productId)
    .maybeSingle();

  if (loadError) {
    return { ok: false, error: loadError.message, status: 500 };
  }
  if (!row) {
    return { ok: false, error: "Produkt neexistuje.", status: 404 };
  }

  const product = row as ProductRow;
  const images = Array.isArray(product.images)
    ? product.images.filter((u): u is string => typeof u === "string")
    : [];
  const colorIds = product.color_ids ?? [];
  const mode = resolveVariantMode(product, colorIds);

  if (mode === "colors") {
    const nextStock: Record<string, StockQty> = {};
    for (const id of colorIds) {
      if (input.colorStock && id in input.colorStock) {
        nextStock[id] = normalizeStockQty(input.colorStock[id]);
      }
    }
    const serialized = serializeColorStock(colorIds, nextStock);
    const unavailableFixed = unavailableColorIdsFromStock(
      colorIds,
      Object.fromEntries(
        colorIds.map((id) => [
          id,
          id in serialized ? (serialized[id] as StockQty) : null,
        ]),
      ),
    );
    const anyOrderable = colorIds.some((id) => {
      if (!(id in serialized)) return true; // unlimited
      const q = serialized[id];
      return q === null || (typeof q === "number" && q > 0);
    });

    const { error } = await auth.supabase
      .from("products")
      .update({
        color_stock: serialized,
        unavailable_color_ids: unavailableFixed,
        in_stock: anyOrderable,
        stock_quantity: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId);

    if (error) return { ok: false, error: error.message, status: 500 };

    return {
      ok: true,
      product: {
        id: productId,
        inStock: anyOrderable,
        stockQuantity: null,
        unavailableColorIds: unavailableFixed,
        colorStock: {
          ...Object.fromEntries(colorIds.map((id) => [id, null as StockQty])),
          ...Object.fromEntries(
            Object.entries(serialized).map(([k, v]) => [k, v as StockQty]),
          ),
        },
        textVariants: [],
        variantOrderableCount: colorIds.length - unavailableFixed.length,
        variantTotalCount: colorIds.length,
      },
    };
  }

  if (mode === "custom") {
    const existing = normalizeTextVariants(product.text_variants, images);
    const qtyById = input.variantStock ?? {};
    const nextVariants = applyStockToTextVariants(existing, qtyById);
    const axisLabel = product.variant_axis_label?.trim() || null;
    const defaultVariantId = product.default_variant_id?.trim() || null;
    const summary = computeVariantSummary(
      "custom",
      nextVariants,
      axisLabel,
      defaultVariantId,
    );
    const anyOrderable = summary.orderableCount > 0;

    const { error } = await auth.supabase
      .from("products")
      .update({
        text_variants: nextVariants,
        variant_total_count: summary.totalCount,
        variant_orderable_count: summary.orderableCount,
        variant_min_price_cents: summary.minPriceCents,
        variant_price_varies: summary.priceVaries,
        in_stock: anyOrderable,
        stock_quantity: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId);

    if (error) return { ok: false, error: error.message, status: 500 };

    return {
      ok: true,
      product: {
        id: productId,
        inStock: anyOrderable,
        stockQuantity: null,
        unavailableColorIds: [],
        colorStock: {},
        textVariants: nextVariants,
        variantOrderableCount: summary.orderableCount,
        variantTotalCount: summary.totalCount,
      },
    };
  }

  // none
  const qty = normalizeStockQty(input.productQty);
  const inStock = qty === null || qty > 0;
  const stockQuantity = inStock ? qty : null;

  const { error } = await auth.supabase
    .from("products")
    .update({
      in_stock: inStock,
      stock_quantity: stockQuantity,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (error) return { ok: false, error: error.message, status: 500 };

  return {
    ok: true,
    product: {
      id: productId,
      inStock,
      stockQuantity,
      unavailableColorIds: [],
      colorStock: {},
      textVariants: [],
      variantOrderableCount: inStock ? 1 : 0,
      variantTotalCount: 1,
    },
  };
}
