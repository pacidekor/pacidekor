import "server-only";

import type { EmailTemplate } from "@/lib/emails/types";

export type BrevoAttachment = {
  /** Base64 bez data: prefixu */
  content: string;
  name: string;
};

export type BrevoSendInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Optional tags in Brevo dashboard */
  tags?: string[];
  attachments?: BrevoAttachment[];
};

export type BrevoSendResult =
  | { ok: true; messageId: string | null }
  | { ok: false; error: string };

function getBrevoConfig():
  | { ok: true; apiKey: string; sender: { email: string; name: string } }
  | { ok: false; error: string } {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
  const senderName =
    process.env.BREVO_SENDER_NAME?.trim() || "PACIDEKOR";

  if (!apiKey) {
    return { ok: false, error: "Chýba BREVO_API_KEY v .env.local." };
  }
  if (!senderEmail) {
    return { ok: false, error: "Chýba BREVO_SENDER_EMAIL v .env.local." };
  }

  return {
    ok: true,
    apiKey,
    sender: { email: senderEmail, name: senderName },
  };
}

/**
 * Pošle transakčný e-mail cez Brevo Transactional API.
 * Server-only — nikdy nevolať z klienta priamo.
 */
export async function sendBrevoEmail(
  input: BrevoSendInput,
): Promise<BrevoSendResult> {
  const config = getBrevoConfig();
  if (!config.ok) {
    return { ok: false, error: config.error };
  }

  const to = input.to.trim();
  if (!to) {
    return { ok: false, error: "Chýba príjemca e-mailu." };
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": config.apiKey,
      },
      body: JSON.stringify({
        sender: config.sender,
        to: [{ email: to }],
        subject: input.subject,
        htmlContent: input.html,
        ...(input.text ? { textContent: input.text } : {}),
        ...(input.tags?.length ? { tags: input.tags } : {}),
        ...(input.attachments?.length
          ? {
              attachment: input.attachments.map((file) => ({
                content: file.content,
                name: file.name,
              })),
            }
          : {}),
      }),
    });

    const payload = (await response.json().catch(() => null)) as {
      messageId?: string;
      message?: string;
      code?: string;
    } | null;

    if (!response.ok) {
      const detail =
        payload?.message ||
        `Brevo API chyba (${response.status}).`;
      console.error("sendBrevoEmail:", detail, payload);
      return { ok: false, error: detail };
    }

    return { ok: true, messageId: payload?.messageId ?? null };
  } catch (error) {
    console.error("sendBrevoEmail:", error);
    return {
      ok: false,
      error: "Nepodarilo sa odoslať e-mail (sieťová chyba).",
    };
  }
}

export async function sendBrevoTemplateEmail(input: {
  to: string;
  email: EmailTemplate;
  tags?: string[];
  attachments?: BrevoAttachment[];
}): Promise<BrevoSendResult> {
  return sendBrevoEmail({
    to: input.to,
    subject: input.email.subject,
    html: input.email.html,
    text: input.email.text,
    tags: input.tags ?? ["pacidekor", input.email.id],
    attachments: input.attachments,
  });
}
