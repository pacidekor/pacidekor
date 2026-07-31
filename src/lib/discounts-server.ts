import "server-only";

import type { ProductDiscount } from "@/lib/discounts";
import type { ProductDiscountRow } from "@/lib/supabase/database.types";
import { createPublicClient } from "@/lib/supabase/server";

export function mapDiscountRow(row: ProductDiscountRow): ProductDiscount {
  return {
    id: row.id,
    productId: row.product_id,
    originalPrice: row.original_price,
    salePrice: row.sale_price,
    discountPercent: row.discount_percent,
    showOnAkciaPage: row.show_on_akcia_page,
    active: row.active,
    startsAt: row.starts_at ?? undefined,
    endsAt: row.ends_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listDiscounts(): Promise<ProductDiscount[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("product_discounts")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("listDiscounts:", error.message);
    return [];
  }

  return ((data as ProductDiscountRow[] | null) ?? []).map(mapDiscountRow);
}
