"use server";

import {
  cartLineOptionKeyFromParts,
  migrateLegacyCartOptionKey,
  parseCartLineOptionKey,
} from "@/lib/cart-line-key";
import { createCustomerClient } from "@/lib/supabase/server";
import type { CartItemRow } from "@/lib/supabase/database.types";

export type CartLineInput = {
  productId: string;
  quantity: number;
  colorId?: string;
  variantId?: string;
  /** Prefer when known; otherwise derived from colorId/variantId. */
  lineOptionKey?: string;
};

export type CartActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type CartLineDto = {
  productId: string;
  quantity: number;
  colorId?: string;
  variantId?: string;
  lineOptionKey: string;
};

async function requireCustomer() {
  const supabase = await createCustomerClient();
  // Prefer getUser() so identity comes from Auth server, not only cookie parse.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
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

function resolveOptionKey(input: {
  lineOptionKey?: string;
  colorId?: string | null;
  variantId?: string | null;
}): string {
  if (typeof input.lineOptionKey === "string") {
    return input.lineOptionKey.trim();
  }
  return cartLineOptionKeyFromParts({
    colorId: input.colorId,
    variantId: input.variantId,
  });
}

function mapRow(row: CartItemRow): CartLineDto {
  const key =
    typeof row.line_option_key === "string"
      ? row.line_option_key
      : migrateLegacyCartOptionKey(row.color_id);
  const selection = parseCartLineOptionKey(key);
  return {
    productId: row.product_id,
    quantity: row.quantity,
    lineOptionKey: key,
    colorId:
      selection.kind === "color"
        ? selection.colorId
        : row.color_id ?? undefined,
    variantId: selection.kind === "variant" ? selection.variantId : undefined,
  };
}

function mapRows(rows: CartItemRow[] | null): CartLineDto[] {
  return (rows ?? []).map(mapRow);
}

async function listLines(
  supabase: Awaited<ReturnType<typeof createCustomerClient>>,
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
  const lineOptionKey = resolveOptionKey(input);
  const selection = parseCartLineOptionKey(lineOptionKey);
  const colorId =
    selection.kind === "color" ? selection.colorId : null;

  const { error } = await auth.supabase.from("cart_items").upsert(
    {
      user_id: auth.userId,
      product_id: input.productId,
      quantity,
      color_id: colorId,
      line_option_key: lineOptionKey,
    },
    { onConflict: "user_id,product_id,line_option_key" },
  );

  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    data: [
      {
        productId: input.productId,
        quantity,
        lineOptionKey,
        colorId: colorId ?? undefined,
        variantId:
          selection.kind === "variant" ? selection.variantId : undefined,
      },
    ],
  };
}

export async function setCartItemQuantityAction(
  productId: string,
  quantity: number,
  lineOptionKey = "",
): Promise<CartActionResult<CartLineDto[]>> {
  const auth = await requireCustomer();
  if (!auth.ok) return { ok: false, error: auth.error };

  const key = lineOptionKey.trim();
  const qty = Math.floor(quantity);
  if (qty < 1) {
    const { error } = await auth.supabase
      .from("cart_items")
      .delete()
      .eq("user_id", auth.userId)
      .eq("product_id", productId)
      .eq("line_option_key", key);
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: [] };
  }

  const { error } = await auth.supabase
    .from("cart_items")
    .update({ quantity: qty })
    .eq("user_id", auth.userId)
    .eq("product_id", productId)
    .eq("line_option_key", key);

  if (error) return { ok: false, error: error.message };
  const selection = parseCartLineOptionKey(key);
  return {
    ok: true,
    data: [
      {
        productId,
        quantity: qty,
        lineOptionKey: key,
        colorId: selection.kind === "color" ? selection.colorId : undefined,
        variantId:
          selection.kind === "variant" ? selection.variantId : undefined,
      },
    ],
  };
}

export async function removeCartItemAction(
  productId: string,
  lineOptionKey = "",
): Promise<CartActionResult<CartLineDto[]>> {
  return setCartItemQuantityAction(productId, 0, lineOptionKey);
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

/**
 * Merge guest lines into the account cart exactly once per mergeId
 * (Postgres function: operation row + cart writes in one transaction).
 */
export async function mergeGuestCartAction(
  guestLines: CartLineInput[],
  mergeId: string,
): Promise<CartActionResult<CartLineDto[]>> {
  const auth = await requireCustomer();
  if (!auth.ok) return { ok: false, error: auth.error };

  const id = mergeId.trim();
  if (!id) {
    return { ok: false, error: "Chýba identifikátor zlúčenia košíka." };
  }

  const payload = guestLines.map((guest) => {
    const lineOptionKey = resolveOptionKey(guest);
    const selection = parseCartLineOptionKey(lineOptionKey);
    return {
      product_id: guest.productId,
      quantity: Math.max(1, Math.floor(guest.quantity)),
      line_option_key: lineOptionKey,
      color_id:
        selection.kind === "color"
          ? selection.colorId
          : guest.colorId?.trim() || null,
    };
  });

  const { data, error } = await auth.supabase.rpc("merge_guest_cart_lines", {
    p_merge_id: id,
    p_lines: payload,
  });

  if (error) return { ok: false, error: error.message };

  const rows = Array.isArray(data) ? data : [];
  return {
    ok: true,
    data: rows.map((row: Record<string, unknown>) =>
      mapRow({
        product_id: String(row.product_id),
        quantity: Number(row.quantity) || 1,
        color_id:
          typeof row.color_id === "string" ? row.color_id : null,
        line_option_key:
          typeof row.line_option_key === "string" ? row.line_option_key : "",
        user_id: auth.userId,
        created_at: "",
        updated_at: "",
      } as CartItemRow),
    ),
  };
}
