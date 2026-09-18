import "server-only";

import { createHash, randomInt, timingSafeEqual } from "crypto";
import { normalizeEmail, type ActionResult } from "@/lib/customers";
import { EMAIL_BRAND } from "@/lib/emails/brand";
import { buildVerifyEmailCodeEmail } from "@/lib/emails/verify-email-code";
import { buildWelcomeRetailEmail } from "@/lib/emails/welcome-retail";
import { buildWholesaleApprovedEmail } from "@/lib/emails/wholesale-approved";
import { buildWholesaleRequestReceivedEmail } from "@/lib/emails/wholesale-request-received";
import { sendBrevoTemplateEmail } from "@/lib/emails/brevo";
import { createServiceClient } from "@/lib/supabase/server";

export type EmailVerifyPurpose = "retail_register" | "wholesale_register";

const CODE_TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || EMAIL_BRAND.defaultSiteUrl
  ).replace(/\/$/, "");
}

function codePepper() {
  return (
    process.env.ORDER_VIEW_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "pacidekor-dev-verify"
  );
}

function hashVerifyCode(email: string, code: string) {
  return createHash("sha256")
    .update(`${normalizeEmail(email)}:${code}:${codePepper()}`)
    .digest("hex");
}

function codesEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function generateVerifyCode() {
  return String(randomInt(0, 100_000)).padStart(5, "0");
}

type StoredVerifyRow = {
  email: string;
  code_hash: string;
  purpose: EmailVerifyPurpose;
  customer_name: string | null;
  company_name: string | null;
  expires_at: string;
  created_at: string;
};

/**
 * Vygeneruje 5-miestny kód, uloží hash a odošle Brevo e-mail.
 */
export async function issueAndSendEmailVerifyCode(input: {
  email: string;
  customerName: string;
  purpose: EmailVerifyPurpose;
  companyName?: string;
}): Promise<ActionResult> {
  const email = normalizeEmail(input.email);
  if (!email) return { ok: false, error: "Neplatný e-mail." };

  const db = createServiceClient();
  const { data: existing } = await db
    .from("email_verification_codes")
    .select("created_at")
    .eq("email", email)
    .maybeSingle();

  if (existing?.created_at) {
    const age = Date.now() - new Date(existing.created_at).getTime();
    if (Number.isFinite(age) && age < RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil((RESEND_COOLDOWN_MS - age) / 1000);
      return {
        ok: false,
        error: `Nový kód môžete poslať o ${waitSec}s.`,
      };
    }
  }

  const code = generateVerifyCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  const { error: upsertError } = await db.from("email_verification_codes").upsert(
    {
      email,
      code_hash: hashVerifyCode(email, code),
      purpose: input.purpose,
      customer_name: input.customerName.trim() || null,
      company_name: input.companyName?.trim() || null,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    },
    { onConflict: "email" },
  );

  if (upsertError) {
    console.error("issueAndSendEmailVerifyCode upsert:", upsertError.message);
    return { ok: false, error: "Nepodarilo sa pripraviť overovací kód." };
  }

  const emailTemplate = buildVerifyEmailCodeEmail({
    customerName: input.customerName,
    code,
    siteUrl: siteUrl(),
  });

  const sendResult = await sendBrevoTemplateEmail({
    to: email,
    email: emailTemplate,
    tags: ["pacidekor", "auth", "verify-email"],
  });

  if (!sendResult.ok) {
    console.error("issueAndSendEmailVerifyCode send:", sendResult.error);
    // Allow immediate resend from UI after a failed delivery.
    await db
      .from("email_verification_codes")
      .update({ created_at: new Date(0).toISOString() })
      .eq("email", email);
    if (process.env.NODE_ENV === "development") {
      console.info(`[dev] verify code for ${email}: ${code}`);
    }
    return {
      ok: false,
      error: "Nepodarilo sa odoslať overovací e-mail. Skúste to znova.",
    };
  }

  if (process.env.NODE_ENV === "development") {
    console.info(`[dev] verify code for ${email}: ${code}`);
  }

  return { ok: true, data: undefined };
}

async function sendFollowUpAfterVerify(row: StoredVerifyRow) {
  const email = row.email;
  const name = row.customer_name?.trim() || "";
  const base = siteUrl();

  try {
    if (row.purpose === "retail_register") {
      const { subscribeNewsletter } = await import("@/lib/newsletter");
      void subscribeNewsletter({ email, name });

      const template = buildWelcomeRetailEmail({
        customerName: name,
        siteUrl: base,
        supportEmail: EMAIL_BRAND.supportEmail,
        phone: EMAIL_BRAND.phone,
      });
      const result = await sendBrevoTemplateEmail({
        to: email,
        email: template,
        tags: ["pacidekor", "auth", "welcome-retail"],
      });
      if (!result.ok) console.error("welcome-retail:", result.error);
      return;
    }

    const template = buildWholesaleRequestReceivedEmail({
      customerName: name,
      companyName: row.company_name?.trim() || name,
      siteUrl: base,
    });
    const result = await sendBrevoTemplateEmail({
      to: email,
      email: template,
      tags: ["pacidekor", "auth", "wholesale-request"],
    });
    if (!result.ok) console.error("wholesale-request:", result.error);
  } catch (error) {
    console.error("sendFollowUpAfterVerify:", error);
  }
}

/**
 * Overí kód. Pri úspechu zmaže OTP a odošle welcome / VO žiadosť.
 */
export async function verifyEmailCode(input: {
  email: string;
  code: string;
}): Promise<ActionResult> {
  const email = normalizeEmail(input.email);
  const code = input.code.replace(/\D/g, "").slice(0, 5);
  if (!email || code.length !== 5) {
    return { ok: false, error: "Zadajte 5-miestny kód z e-mailu." };
  }

  const db = createServiceClient();
  const { data, error } = await db
    .from("email_verification_codes")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error("verifyEmailCode select:", error.message);
    return { ok: false, error: "Overenie zlyhalo. Skúste to znova." };
  }

  const row = data as StoredVerifyRow | null;
  if (!row) {
    return {
      ok: false,
      error: "Kód vypršal alebo neexistuje. Požiadajte o nový.",
    };
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await db.from("email_verification_codes").delete().eq("email", email);
    return {
      ok: false,
      error: "Kód vypršal. Požiadajte o nový.",
    };
  }

  const expected = hashVerifyCode(email, code);
  if (!codesEqual(expected, row.code_hash)) {
    return { ok: false, error: "Nesprávny kód. Skúste to znova." };
  }

  await db.from("email_verification_codes").delete().eq("email", email);
  await sendFollowUpAfterVerify(row);

  return { ok: true, data: undefined };
}

export async function notifyWholesaleApproved(input: {
  email: string;
  customerName: string;
  companyName: string;
}): Promise<void> {
  const to = normalizeEmail(input.email);
  if (!to) return;

  try {
    const template = buildWholesaleApprovedEmail({
      customerName: input.customerName,
      companyName: input.companyName,
      siteUrl: siteUrl(),
    });
    const result = await sendBrevoTemplateEmail({
      to,
      email: template,
      tags: ["pacidekor", "auth", "wholesale-approved"],
    });
    if (!result.ok) {
      console.error("notifyWholesaleApproved:", result.error);
    }
  } catch (error) {
    console.error("notifyWholesaleApproved:", error);
  }
}
