/** Client-safe helpers for the e-mail verification UI. */

export const EMAIL_VERIFY_CODE_LENGTH = 5;
export const EMAIL_VERIFY_RESEND_SECONDS = 60;

/** Preview-only sample code in `/dev/emails` — not accepted by the server. */
export const DEV_EMAIL_VERIFY_CODE = "11111";

export function normalizeEmailVerifyCode(value: string) {
  return value.replace(/\D/g, "").slice(0, EMAIL_VERIFY_CODE_LENGTH);
}
