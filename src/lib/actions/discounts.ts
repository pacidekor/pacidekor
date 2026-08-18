"use server";

import { revalidatePath } from "next/cache";
import { mapDiscountRow } from "@/lib/discounts-server";
import type { ProductDiscount } from "@/lib/discounts";
import type {
  ProductDiscountInsert,
  ProductDiscountRow,
  ProductDiscountUpdate,
} from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type DiscountActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type DiscountUpsertInput = {
  id?: string;
  productId: string;
  originalPrice: string;
  salePrice: string;
  discountPercent: number;
  showOnAkciaPage: boolean;
  active: boolean;
  startsAt?: string;
  endsAt?: string;
};

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      error: "Nie ste prihlásený.",
      supabase,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return {
      ok: false as const,
      error: "Nemáte oprávnenie administrátora.",
      supabase,
    };
  }

  return { ok: true as const, supabase, user };
}

function revalidateDiscountPaths() {
  revalidatePath("/");
  revalidatePath("/akcia");
  revalidatePath("/produkty");
  revalidatePath("/novinky");
  revalidatePath("/vypredaj");
  revalidatePath("/admin/zlavy");
}

export async function listDiscountsAction(): Promise<
  DiscountActionResult<ProductDiscount[]>
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_discounts")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    data: ((data as ProductDiscountRow[] | null) ?? []).map(mapDiscountRow),
  };
}

export async function upsertDiscountAction(
  input: DiscountUpsertInput,
): Promise<DiscountActionResult<ProductDiscount>> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const payload: ProductDiscountUpdate = {
    product_id: input.productId,
    original_price: input.originalPrice.trim(),
    sale_price: input.salePrice.trim(),
    discount_percent: Math.min(100, Math.max(0, Math.round(input.discountPercent))),
    show_on_akcia_page: input.showOnAkciaPage,
    active: input.active,
    starts_at: input.startsAt?.trim() || null,
    ends_at: input.endsAt?.trim() || null,
  };

  if (input.id) {
    const { data, error } = await auth.supabase
      .from("product_discounts")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "Zľava sa nenašla." };

    revalidateDiscountPaths();
    return { ok: true, data: mapDiscountRow(data as ProductDiscountRow) };
  }

  const insertPayload: ProductDiscountInsert = {
    product_id: input.productId,
    original_price: input.originalPrice.trim(),
    sale_price: input.salePrice.trim(),
    discount_percent: Math.min(
      100,
      Math.max(0, Math.round(input.discountPercent)),
    ),
    show_on_akcia_page: input.showOnAkciaPage,
    active: input.active,
    starts_at: input.startsAt?.trim() || null,
    ends_at: input.endsAt?.trim() || null,
  };

  const { data, error } = await auth.supabase
    .from("product_discounts")
    .upsert(insertPayload, { onConflict: "product_id" })
    .select("*")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Zľavu sa nepodarilo uložiť." };

  revalidateDiscountPaths();
  return { ok: true, data: mapDiscountRow(data as ProductDiscountRow) };
}

export async function setDiscountActiveAction(
  id: string,
  active: boolean,
): Promise<DiscountActionResult<ProductDiscount>> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const { data, error } = await auth.supabase
    .from("product_discounts")
    .update({ active })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Zľava sa nenašla." };

  revalidateDiscountPaths();
  return { ok: true, data: mapDiscountRow(data as ProductDiscountRow) };
}

export async function deleteDiscountAction(
  id: string,
): Promise<DiscountActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const { error } = await auth.supabase
    .from("product_discounts")
    .delete()
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidateDiscountPaths();
  return { ok: true, data: undefined };
}
