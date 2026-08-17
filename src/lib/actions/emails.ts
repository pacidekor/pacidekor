"use server";

import { getEmailPreviewById } from "@/lib/emails/catalog";
import { getNewsletterCatalogProducts } from "@/lib/emails/newsletter-data";
import { sendBrevoTemplateEmail } from "@/lib/emails/brevo";
import type { ActionResult } from "@/lib/customers";
import { emailError } from "@/lib/form-validation";

/**
 * Dev-only: odošle aktuálnu preview šablónu na zadaný e-mail cez Brevo.
 */
export async function sendDevTestEmail(input: {
  templateId: string;
  to: string;
  siteUrl?: string;
}): Promise<ActionResult<{ messageId: string | null }>> {
  if (process.env.NODE_ENV !== "development") {
    return { ok: false, error: "Testovacie e-maily sú dostupné len v development." };
  }

  const emailCheck = emailError(input.to);
  if (emailCheck) return { ok: false, error: emailCheck };

  const definition = getEmailPreviewById(input.templateId);
  if (!definition) {
    return { ok: false, error: "Neznáma e-mailová šablóna." };
  }

  const siteUrl =
    input.siteUrl?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  const newsletter =
    definition.id === "newsletter"
      ? await getNewsletterCatalogProducts(siteUrl)
      : undefined;

  const email = definition.build(siteUrl, { newsletter });
  const result = await sendBrevoTemplateEmail({
    to: input.to.trim(),
    email,
    tags: ["pacidekor", "dev-test", email.id],
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true, data: { messageId: result.messageId } };
}
