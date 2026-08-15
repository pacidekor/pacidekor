"use server";

import { revalidatePath } from "next/cache";
import {
  normalizePromoCode,
  type ValidatePromoResult,
} from "@/lib/promo";
import type { PromoCodeRow } from "@/lib/supabase/database.types";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export type PromoActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type AdminPromoCode = {
  id: string;
  code: string;
  discountPercent: number;
  active: boolean;
  startsAt?: string;
  endsAt?: string;
  minOrderEur?: number;
  maxUses?: number;
  usedCount: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type PromoUpsertInput = {
  id?: string;
  code: string;
  discountPercent: number;
  active: boolean;
  startsAt?: string;
  endsAt?: string;
  minOrderEur?: number;
  maxUses?: number;
  note?: string;
};

function mapPromoRow(row: PromoCodeRow): AdminPromoCode {
  return {
    id: row.id,
    code: row.code,
    discountPercent: row.discount_percent,
    active: row.active,
    startsAt: row.starts_at ?? undefined,
    endsAt: row.ends_at ?? undefined,
    minOrderEur:
      row.min_order_eur == null ? undefined : Number(row.min_order_eur),
    maxUses: row.max_uses ?? undefined,
    usedCount: row.used_count,
    note: row.note ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: "Nie ste prihlásený." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { ok: false as const, error: "Nemáte oprávnenie administrátora." };
  }

  return { ok: true as const, user };
}

function revalidatePromoPaths() {
  revalidatePath("/admin/zlavy");
  revalidatePath("/kosik");
  revalidatePath("/pokladna");
}

export async function validatePromoCodeAction(
  codeRaw: string,
  subtotalEur: number,
): Promise<ValidatePromoResult> {
  const code = normalizePromoCode(codeRaw);
  if (!code || code.length < 3) {
    return { ok: false, error: "Zadajte platný zľavový kód." };
  }

  let db;
  try {
    db = createServiceClient();
  } catch {
    return {
      ok: false,
      error: "Overenie kódu nie je momentálne dostupné.",
    };
  }

  const { data, error } = await db
    .from("promo_codes")
    .select(
      "code, discount_percent, active, starts_at, ends_at, min_order_eur, max_uses, used_count",
    )
    .eq("code", code)
    .maybeSingle();

  if (error) {
    console.error("validatePromoCodeAction:", error.message);
    return { ok: false, error: "Overenie kódu zlyhalo. Skúste znova." };
  }

  if (!data || !data.active) {
    return { ok: false, error: "Tento zľavový kód neplatí." };
  }

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  if (data.starts_at && data.starts_at > todayIso) {
    return { ok: false, error: "Tento zľavový kód ešte nie je aktívny." };
  }
  if (data.ends_at && data.ends_at < todayIso) {
    return { ok: false, error: "Platnosť tohto zľavového kódu už vypršala." };
  }
  if (
    typeof data.max_uses === "number" &&
    data.used_count >= data.max_uses
  ) {
    return { ok: false, error: "Tento zľavový kód už bol vyčerpaný." };
  }

  const minOrder =
    data.min_order_eur == null ? 0 : Number(data.min_order_eur);
  if (Number.isFinite(minOrder) && minOrder > 0 && subtotalEur < minOrder) {
    return {
      ok: false,
      error: `Kód platí od objednávky ${minOrder.toFixed(2).replace(".", ",")} €.`,
    };
  }

  return {
    ok: true,
    data: {
      code: data.code,
      discountPercent: data.discount_percent,
    },
  };
}

export async function listPromoCodesAction(): Promise<
  PromoActionResult<AdminPromoCode[]>
> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const db = createServiceClient();
  const { data, error } = await db
    .from("promo_codes")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) return { ok: false, error: error.message };

  return {
    ok: true,
    data: ((data as PromoCodeRow[] | null) ?? []).map(mapPromoRow),
  };
}

export async function upsertPromoCodeAction(
  input: PromoUpsertInput,
): Promise<PromoActionResult<AdminPromoCode>> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const code = normalizePromoCode(input.code);
  if (!code || code.length < 3) {
    return { ok: false, error: "Zadajte zľavový kód (min. 3 znaky)." };
  }

  const percent = Math.round(input.discountPercent);
  if (!Number.isFinite(percent) || percent < 1 || percent > 100) {
    return { ok: false, error: "Zľava musí byť 1–100 %." };
  }

  if (input.startsAt && input.endsAt && input.startsAt > input.endsAt) {
    return { ok: false, error: "Dátum „od“ musí byť pred dátumom „do“." };
  }

  const maxUses =
    input.maxUses == null || input.maxUses === 0
      ? null
      : Math.round(input.maxUses);
  if (maxUses != null && maxUses < 1) {
    return { ok: false, error: "Max. počet použití musí byť aspoň 1." };
  }

  const minOrder =
    input.minOrderEur == null || input.minOrderEur === 0
      ? null
      : input.minOrderEur;
  if (minOrder != null && (!Number.isFinite(minOrder) || minOrder < 0)) {
    return { ok: false, error: "Minimálna objednávka musí byť 0 alebo viac." };
  }

  const db = createServiceClient();
  const now = new Date().toISOString();
  const payload = {
    code,
    discount_percent: percent,
    active: input.active,
    starts_at: input.startsAt || null,
    ends_at: input.endsAt || null,
    min_order_eur: minOrder,
    max_uses: maxUses,
    note: input.note?.trim() || null,
    updated_at: now,
  };

  if (input.id) {
    const { data, error } = await db
      .from("promo_codes")
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: "Tento zľavový kód už existuje." };
      }
      return { ok: false, error: error.message };
    }
    if (!data) return { ok: false, error: "Zľavový kód sa nenašiel." };

    revalidatePromoPaths();
    return { ok: true, data: mapPromoRow(data as PromoCodeRow) };
  }

  const { data, error } = await db
    .from("promo_codes")
    .insert(payload)
    .select("*")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Tento zľavový kód už existuje." };
    }
    return { ok: false, error: error.message };
  }
  if (!data) return { ok: false, error: "Uloženie zlyhalo." };

  revalidatePromoPaths();
  return { ok: true, data: mapPromoRow(data as PromoCodeRow) };
}

export async function setPromoCodeActiveAction(
  id: string,
  active: boolean,
): Promise<PromoActionResult<AdminPromoCode>> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const db = createServiceClient();
  const { data, error } = await db
    .from("promo_codes")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Zľavový kód sa nenašiel." };

  revalidatePromoPaths();
  return { ok: true, data: mapPromoRow(data as PromoCodeRow) };
}

export async function deletePromoCodeAction(
  id: string,
): Promise<PromoActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const db = createServiceClient();
  const { error } = await db.from("promo_codes").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePromoPaths();
  return { ok: true, data: undefined };
}
