"use server";

import {
  normalizePromoCode,
  type ValidatePromoResult,
} from "@/lib/promo";
import { createServiceClient } from "@/lib/supabase/server";

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
