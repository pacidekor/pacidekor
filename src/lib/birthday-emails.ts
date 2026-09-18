import "server-only";

import { buildBirthdayEmail } from "@/lib/emails/birthday";
import { EMAIL_BRAND } from "@/lib/emails/brand";
import { sendBrevoTemplateEmail } from "@/lib/emails/brevo";
import { createServiceClient } from "@/lib/supabase/server";

const BIRTHDAY_DISCOUNT_PERCENT = 10;
const BIRTHDAY_VALID_DAYS = 14;

function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || EMAIL_BRAND.defaultSiteUrl
  ).replace(/\/$/, "");
}

function todayParts(now = new Date()) {
  // Europe/Bratislava calendar day for birthday matching.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bratislava",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  return { year, month, day };
}

function endsAtIso(validDays: number) {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() + validDays);
  return end.toISOString().slice(0, 10);
}

export type BirthdaySendSummary = {
  candidates: number;
  sent: number;
  failed: number;
  skippedAlreadySent: number;
};

export async function sendBirthdayEmailsForToday(): Promise<BirthdaySendSummary> {
  const { year, month, day } = todayParts();
  const db = createServiceClient();
  const base = siteUrl();

  const { data: profiles, error } = await db
    .from("profiles")
    .select("id, name, email, birth_date, status, role")
    .eq("role", "customer")
    .eq("status", "aktivny")
    .not("birth_date", "is", null);

  if (error) throw new Error(error.message);

  const candidates = (profiles ?? []).filter((row) => {
    if (!row.birth_date) return false;
    // birth_date is YYYY-MM-DD
    const [, m, d] = row.birth_date.split("-").map(Number);
    return m === month && d === day;
  });

  let sent = 0;
  let failed = 0;
  let skippedAlreadySent = 0;

  for (const profile of candidates) {
    const email = profile.email?.trim().toLowerCase();
    if (!email) continue;

    const { data: already } = await db
      .from("birthday_emails_sent")
      .select("profile_id")
      .eq("profile_id", profile.id)
      .eq("year", year)
      .maybeSingle();

    if (already) {
      skippedAlreadySent += 1;
      continue;
    }

    const promoCode = `NARO${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}${profile.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;

    const { error: promoError } = await db.from("promo_codes").insert({
      code: promoCode,
      discount_percent: BIRTHDAY_DISCOUNT_PERCENT,
      active: true,
      starts_at: new Date().toISOString().slice(0, 10),
      ends_at: endsAtIso(BIRTHDAY_VALID_DAYS),
      max_uses: 1,
      used_count: 0,
      note: `Narodeniny ${year} · ${profile.email}`,
    });

    if (promoError) {
      // Unique collision — reuse existing code if present.
      if (promoError.code !== "23505") {
        console.error("birthday promo:", promoError.message);
        failed += 1;
        continue;
      }
    }

    const template = buildBirthdayEmail({
      customerName: profile.name,
      promoCode,
      discountPercent: BIRTHDAY_DISCOUNT_PERCENT,
      validDays: BIRTHDAY_VALID_DAYS,
      siteUrl: base,
    });

    const result = await sendBrevoTemplateEmail({
      to: email,
      email: template,
      tags: ["pacidekor", "birthday"],
    });

    if (!result.ok) {
      console.error("birthday email:", email, result.error);
      failed += 1;
      continue;
    }

    const { error: ledgerError } = await db.from("birthday_emails_sent").insert({
      profile_id: profile.id,
      year,
      promo_code: promoCode,
    });

    if (ledgerError) {
      console.error("birthday ledger:", ledgerError.message);
    }

    sent += 1;
  }

  return {
    candidates: candidates.length,
    sent,
    failed,
    skippedAlreadySent,
  };
}
