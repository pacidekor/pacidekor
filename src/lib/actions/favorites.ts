"use server";

import { createClient } from "@/lib/supabase/server";

export type FavoriteActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function requireCustomer() {
  const supabase = await createClient();
  // Cookie session only — avoids Auth API roundtrip on every heart click.
  // RLS on `favorites` remains the access backstop.
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
      error: "Obľúbené sú dostupné len pre zákaznícky účet.",
      supabase,
    };
  }

  return { ok: true as const, supabase, userId: user.id };
}

export async function listFavoriteIdsAction(): Promise<
  FavoriteActionResult<string[]>
> {
  const auth = await requireCustomer();
  if (!auth.ok) return { ok: false, error: auth.error };

  const { data, error } = await auth.supabase
    .from("favorites")
    .select("product_id")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false });

  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    data: ((data as { product_id: string }[] | null) ?? []).map(
      (row) => row.product_id,
    ),
  };
}

export async function toggleFavoriteAction(
  productId: string,
): Promise<FavoriteActionResult<{ active: boolean }>> {
  const auth = await requireCustomer();
  if (!auth.ok) return { ok: false, error: auth.error };

  const { data: existing } = await auth.supabase
    .from("favorites")
    .select("product_id")
    .eq("user_id", auth.userId)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    const { error } = await auth.supabase
      .from("favorites")
      .delete()
      .eq("user_id", auth.userId)
      .eq("product_id", productId);
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: { active: false } };
  }

  const { error } = await auth.supabase.from("favorites").insert({
    user_id: auth.userId,
    product_id: productId,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { active: true } };
}
