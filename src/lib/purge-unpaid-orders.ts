import "server-only";

import { createServiceClient } from "@/lib/supabase/server";

const UNPAID_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type PurgeUnpaidSummary = {
  scanned: number;
  deleted: number;
  failed: number;
  orderNumbers: string[];
};

/**
 * Zmaže objednávky v stave `nezaplatena` staršie ako 24 h
 * (typicky nedokončená GoPay platba). Vráti sklad a zníži used_count promo.
 * Dobierka (`nova`) sa nemazá.
 */
export async function purgeUnpaidOrdersOlderThan24h(): Promise<PurgeUnpaidSummary> {
  const db = createServiceClient();
  const cutoff = new Date(Date.now() - UNPAID_MAX_AGE_MS).toISOString();

  const { data: orders, error } = await db
    .from("orders")
    .select("id, order_number, promo_code, payment_method")
    .eq("status", "nezaplatena")
    .lt("created_at", cutoff);

  if (error) throw new Error(error.message);

  const list = orders ?? [];
  let deleted = 0;
  let failed = 0;
  const orderNumbers: string[] = [];

  for (const order of list) {
    try {
      const { data: items, error: itemsError } = await db
        .from("order_items")
        .select("product_id, quantity")
        .eq("order_id", order.id);

      if (itemsError) throw new Error(itemsError.message);

      for (const item of items ?? []) {
        const { error: stockError } = await db.rpc("adjust_product_stock", {
          p_product_id: item.product_id,
          p_delta: item.quantity,
        });
        if (stockError) {
          console.error(
            "purgeUnpaid stock restore:",
            order.order_number,
            stockError.message,
          );
        }
      }

      if (order.promo_code) {
        const { data: promo } = await db
          .from("promo_codes")
          .select("used_count")
          .eq("code", order.promo_code)
          .maybeSingle();

        if (promo && promo.used_count > 0) {
          await db
            .from("promo_codes")
            .update({
              used_count: promo.used_count - 1,
              updated_at: new Date().toISOString(),
            })
            .eq("code", order.promo_code);
        }
      }

      const { error: deleteError } = await db
        .from("orders")
        .delete()
        .eq("id", order.id)
        .eq("status", "nezaplatena");

      if (deleteError) throw new Error(deleteError.message);

      deleted += 1;
      orderNumbers.push(order.order_number);
    } catch (err) {
      failed += 1;
      console.error(
        "purgeUnpaidOrders:",
        order.order_number,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return {
    scanned: list.length,
    deleted,
    failed,
    orderNumbers,
  };
}
