import "server-only";

import { EMAIL_BRAND } from "@/lib/emails/brand";
import { buildPasswordChangedEmail } from "@/lib/emails/password-changed";
import { buildPasswordResetEmail } from "@/lib/emails/password-reset";
import {
  buildEmailChangedNewEmail,
  buildEmailChangedOldEmail,
} from "@/lib/emails/email-changed";
import { sendBrevoTemplateEmail } from "@/lib/emails/brevo";
import { createServiceClient } from "@/lib/supabase/server";
import { normalizeEmail } from "@/lib/customers";

function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || EMAIL_BRAND.defaultSiteUrl
  ).replace(/\/$/, "");
}

async function profileNameForEmail(email: string) {
  const db = createServiceClient();
  const { data } = await db
    .from("profiles")
    .select("name")
    .ilike("email", email)
    .maybeSingle();
  return data?.name?.trim() || "";
}

/** Brevo recovery e-mail with Supabase action link (no Supabase SMTP send). */
export async function sendPasswordResetEmail(input: {
  email: string;
  redirectTo: string;
}): Promise<void> {
  const email = normalizeEmail(input.email);
  if (!email) return;

  const service = createServiceClient();
  const name = await profileNameForEmail(email);

  const { data, error } = await service.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: input.redirectTo },
  });

  if (error || !data?.properties?.action_link) {
    console.error(
      "sendPasswordResetEmail generateLink:",
      error?.message ?? "missing action_link",
    );
    return;
  }

  const template = buildPasswordResetEmail({
    customerName: name,
    resetUrl: data.properties.action_link,
    siteUrl: siteUrl(),
  });

  const result = await sendBrevoTemplateEmail({
    to: email,
    email: template,
    tags: ["pacidekor", "auth", "password-reset"],
  });
  if (!result.ok) {
    console.error("sendPasswordResetEmail:", result.error);
  }
}

export async function sendPasswordChangedEmail(input: {
  email: string;
  customerName?: string;
}): Promise<void> {
  const email = normalizeEmail(input.email);
  if (!email) return;

  const name =
    input.customerName?.trim() || (await profileNameForEmail(email));

  try {
    const template = buildPasswordChangedEmail({
      customerName: name,
      siteUrl: siteUrl(),
    });
    const result = await sendBrevoTemplateEmail({
      to: email,
      email: template,
      tags: ["pacidekor", "auth", "password-changed"],
    });
    if (!result.ok) {
      console.error("sendPasswordChangedEmail:", result.error);
    }
  } catch (error) {
    console.error("sendPasswordChangedEmail:", error);
  }
}

export async function sendEmailChangedNotifications(input: {
  oldEmail: string;
  newEmail: string;
  customerName?: string;
}): Promise<void> {
  const oldEmail = normalizeEmail(input.oldEmail);
  const newEmail = normalizeEmail(input.newEmail);
  if (!oldEmail || !newEmail) return;

  const name =
    input.customerName?.trim() || (await profileNameForEmail(oldEmail));
  const base = siteUrl();

  try {
    const oldTemplate = buildEmailChangedOldEmail({
      customerName: name,
      newEmail,
      siteUrl: base,
    });
    const oldResult = await sendBrevoTemplateEmail({
      to: oldEmail,
      email: oldTemplate,
      tags: ["pacidekor", "auth", "email-changed-old"],
    });
    if (!oldResult.ok) {
      console.error("email-changed-old:", oldResult.error);
    }

    const newTemplate = buildEmailChangedNewEmail({
      customerName: name,
      oldEmail,
      newEmail,
      siteUrl: base,
    });
    const newResult = await sendBrevoTemplateEmail({
      to: newEmail,
      email: newTemplate,
      tags: ["pacidekor", "auth", "email-changed-new"],
    });
    if (!newResult.ok) {
      console.error("email-changed-new:", newResult.error);
    }
  } catch (error) {
    console.error("sendEmailChangedNotifications:", error);
  }
}
