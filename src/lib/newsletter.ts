import "server-only";

import { createHash, randomBytes } from "crypto";
import { normalizeEmail, type ActionResult } from "@/lib/customers";
import { EMAIL_BRAND } from "@/lib/emails/brand";
import { buildNewsletterEmail } from "@/lib/emails/newsletter";
import {
  getNewsletterCatalogProducts,
  NEWSLETTER_FRESH_NEW_DAYS,
  NEWSLETTER_MIN_FRESH_NEW,
} from "@/lib/emails/newsletter-data";
import { sendBrevoTemplateEmail } from "@/lib/emails/brevo";
import { createServiceClient } from "@/lib/supabase/server";

function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || EMAIL_BRAND.defaultSiteUrl
  ).replace(/\/$/, "");
}

function tokenPepper() {
  return (
    process.env.ORDER_VIEW_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "pacidekor-newsletter"
  );
}

export function createNewsletterUnsubscribeToken(email: string) {
  const salt = randomBytes(8).toString("hex");
  const hash = createHash("sha256")
    .update(`${normalizeEmail(email)}:${salt}:${tokenPepper()}`)
    .digest("hex")
    .slice(0, 24);
  return `${salt}${hash}`;
}

export function buildNewsletterUnsubscribeUrl(
  email: string,
  token: string,
  baseUrl = siteUrl(),
) {
  const params = new URLSearchParams({
    email: normalizeEmail(email),
    t: token,
  });
  return `${baseUrl}/odhlasenie-newsletter?${params.toString()}`;
}

export async function subscribeNewsletter(input: {
  email: string;
  name?: string;
}): Promise<ActionResult> {
  const email = normalizeEmail(input.email);
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Zadajte platný e-mail." };
  }

  const db = createServiceClient();
  const { data: existing } = await db
    .from("newsletter_subscribers")
    .select("email, active, unsubscribe_token, name")
    .eq("email", email)
    .maybeSingle();

  const token =
    existing?.unsubscribe_token || createNewsletterUnsubscribeToken(email);

  const { error } = await db.from("newsletter_subscribers").upsert(
    {
      email,
      name: input.name?.trim() || existing?.name || null,
      unsubscribe_token: token,
      active: true,
      subscribed_at: new Date().toISOString(),
      unsubscribed_at: null,
    },
    { onConflict: "email" },
  );

  if (error) {
    console.error("subscribeNewsletter:", error.message);
    return { ok: false, error: "Prihlásenie na newsletter zlyhalo." };
  }

  return { ok: true, data: undefined };
}

export async function unsubscribeNewsletter(input: {
  email: string;
  token: string;
}): Promise<ActionResult> {
  const email = normalizeEmail(input.email);
  const token = input.token.trim();
  if (!email || !token) {
    return { ok: false, error: "Neplatný odkaz na odhlásenie." };
  }

  const db = createServiceClient();
  const { data, error } = await db
    .from("newsletter_subscribers")
    .select("email, unsubscribe_token, active")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error("unsubscribeNewsletter:", error.message);
    return { ok: false, error: "Odhlásenie zlyhalo." };
  }

  if (!data || data.unsubscribe_token !== token) {
    return { ok: false, error: "Neplatný alebo expirovaný odkaz." };
  }

  if (!data.active) {
    return { ok: true, data: undefined };
  }

  const { error: updateError } = await db
    .from("newsletter_subscribers")
    .update({
      active: false,
      unsubscribed_at: new Date().toISOString(),
    })
    .eq("email", email);

  if (updateError) {
    console.error("unsubscribeNewsletter update:", updateError.message);
    return { ok: false, error: "Odhlásenie zlyhalo." };
  }

  return { ok: true, data: undefined };
}

export type NewsletterSendSummary = {
  attempted: number;
  sent: number;
  failed: number;
  skipped: boolean;
  reason?: string;
};

/**
 * Odošle aktuálny newsletter všetkým aktívnym odberateľom.
 * Pošle sa len ak sú aspoň NEWSLETTER_MIN_FRESH_NEW čerstvé novinky
 * (označené / vytvorené v posledných NEWSLETTER_FRESH_NEW_DAYS dňoch).
 * Akcie idú ako bonus, samé o sebe newsletter nespustia.
 */
export async function sendNewsletterCampaign(): Promise<NewsletterSendSummary> {
  const base = siteUrl();
  const catalog = await getNewsletterCatalogProducts(base);

  if (catalog.freshNewCount < NEWSLETTER_MIN_FRESH_NEW) {
    return {
      attempted: 0,
      sent: 0,
      failed: 0,
      skipped: true,
      reason: `Málo čerstvých noviniek (${catalog.freshNewCount}/${NEWSLETTER_MIN_FRESH_NEW} za posledných ${NEWSLETTER_FRESH_NEW_DAYS} dní).`,
    };
  }

  const db = createServiceClient();
  const { data: subscribers, error } = await db
    .from("newsletter_subscribers")
    .select("email, name, unsubscribe_token")
    .eq("active", true);

  if (error) {
    throw new Error(error.message);
  }

  const list = subscribers ?? [];
  let sent = 0;
  let failed = 0;

  for (const row of list) {
    const email = normalizeEmail(row.email);
    if (!email) continue;

    const template = buildNewsletterEmail({
      customerName: row.name?.trim() || undefined,
      siteUrl: base,
      newProducts: catalog.newProducts,
      saleProducts: catalog.saleProducts,
      unsubscribeUrl: buildNewsletterUnsubscribeUrl(
        email,
        row.unsubscribe_token,
        base,
      ),
    });

    const result = await sendBrevoTemplateEmail({
      to: email,
      email: template,
      tags: ["pacidekor", "newsletter"],
    });

    if (result.ok) sent += 1;
    else {
      failed += 1;
      console.error("newsletter send:", email, result.error);
    }
  }

  return {
    attempted: list.length,
    sent,
    failed,
    skipped: false,
  };
}
