"use server";

import { createClient } from "@/lib/supabase/server";

export type StockActionResult = {
  ok: true;
  data: { inStock: boolean; stockQuantity: number | null };
} | {
  ok: false;
  error: string;
};

/** Negative delta decreases stock. Unlimited stock (null qty) ignores decreases. */
export async function adjustStockAction(
  productId: string,
  delta: number,
): Promise<StockActionResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("adjust_product_stock", {
      p_product_id: productId,
      p_delta: Math.trunc(delta),
    });

    if (error) return { ok: false, error: error.message };

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { ok: false, error: "Nepodarilo sa upraviť sklad." };

    return {
      ok: true,
      data: {
        inStock: Boolean(row.out_in_stock),
        stockQuantity:
          row.out_stock_quantity == null
            ? null
            : Number(row.out_stock_quantity),
      },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Úprava skladu zlyhala.",
    };
  }
}
