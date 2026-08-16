"use server";

import { createClient } from "@/lib/supabase/server";
import type { CartItemRow } from "@/lib/supabase/database.types";

export type CartLineInput = {
  productId: string;
  quantity: number;
  colorId?: string;
};

export type CartActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type CartLineDto = {
  productId: string;
  quantity: number;
  colorId?: string;
};

async function requireCustomer() {
  const supabase = await createClient();
  // Cookie session only — avoids Auth API roundtrip on every cart click.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  if (!user) {
    return { ok: false as const, error: "Nie ste prihlásený.", supabase };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role === "admin" || profile.status !== "aktivny") {
    return {
      ok: false as const,
      error: "Košík v účte je dostupný len pre zákazníkov.",
      supabase,
    };
  }

  return { ok: true as const, supabase, userId: user.id };
}

function mapRows(rows: CartItemRow[] | null): CartLineDto[] {
  return (rows ?? []).map((row) => ({
    productId: row.product_id,
    quantity: row.quantity,
    colorId: row.color_id ?? undefined,
  }));
}

async function listLines(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<CartActionResult<CartLineDto[]>> {
  const { data, error } = await supabase
    .from("cart_items")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: mapRows(data as CartItemRow[] | null) };
}

export async function listCartAction(): Promise<
  CartActionResult<CartLineDto[]>
> {
  const auth = await requireCustomer();
  if (!auth.ok) return { ok: false, error: auth.error };
  return listLines(auth.supabase, auth.userId);
}

export async function upsertCartItemAction(
  input: CartLineInput,
): Promise<CartActionResult<CartLineDto[]>> {
  const auth = await requireCustomer();
  if (!auth.ok) return { ok: false, error: auth.error };

  const quantity = Math.max(1, Math.floor(input.quantity));
  const { error } = await auth.supabase.from("cart_items").upsert(
    {
      user_id: auth.userId,
      product_id: input.productId,
      quantity,
      color_id: input.colorId?.trim() || null,
    },
    { onConflict: "user_id,product_id" },
  );

  if (error) return { ok: false, error: error.message };
  // Skip full re-list — client keeps optimistic cart; hydrate refreshes later.
  return {
    ok: true,
    data: [
      {
        productId: input.productId,
        quantity,
        colorId: input.colorId?.trim() || undefined,
      },
    ],
  };
}

export async function setCartItemQuantityAction(
  productId: string,
  quantity: number,
): Promise<CartActionResult<CartLineDto[]>> {
  const auth = await requireCustomer();
  if (!auth.ok) return { ok: false, error: auth.error };

  const qty = Math.floor(quantity);
  if (qty < 1) {
    const { error } = await auth.supabase
      .from("cart_items")
      .delete()
      .eq("user_id", auth.userId)
      .eq("product_id", productId);
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: [] };
  }

  const { error } = await auth.supabase
    .from("cart_items")
    .update({ quantity: qty })
    .eq("user_id", auth.userId)
    .eq("product_id", productId);

  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    data: [{ productId, quantity: qty }],
  };
}

export async function removeCartItemAction(
  productId: string,
): Promise<CartActionResult<CartLineDto[]>> {
  return setCartItemQuantityAction(productId, 0);
}

export async function clearCartAction(): Promise<
  CartActionResult<CartLineDto[]>
> {
  const auth = await requireCustomer();
  if (!auth.ok) return { ok: false, error: auth.error };

  const { error } = await auth.supabase
    .from("cart_items")
    .delete()
    .eq("user_id", auth.userId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: [] };
}

/** Merge guest localStorage lines into the account cart (add quantities). */
export async function mergeGuestCartAction(
  guestLines: CartLineInput[],
): Promise<CartActionResult<CartLineDto[]>> {
  const auth = await requireCustomer();
  if (!auth.ok) return { ok: false, error: auth.error };

  const existing = await listLines(auth.supabase, auth.userId);
  if (!existing.ok) return existing;

  const byId = new Map(
    existing.data.map((line) => [line.productId, line] as const),
  );

  for (const guest of guestLines) {
    const qty = Math.max(1, Math.floor(guest.quantity));
    const prev = byId.get(guest.productId);
    byId.set(guest.productId, {
      productId: guest.productId,
      quantity: (prev?.quantity ?? 0) + qty,
      colorId: guest.colorId ?? prev?.colorId,
    });
  }

  const upserts = [...byId.values()].map((line) => ({
    user_id: auth.userId,
    product_id: line.productId,
    quantity: line.quantity,
    color_id: line.colorId?.trim() || null,
  }));

  if (upserts.length > 0) {
    const { error } = await auth.supabase
      .from("cart_items")
      .upsert(upserts, { onConflict: "user_id,product_id" });
    if (error) return { ok: false, error: error.message };
  }

  return listLines(auth.supabase, auth.userId);
}
