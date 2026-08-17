/** Dočasný mock kód pre localhost / UI. Neskôr nahradí server. */
export const DEV_EMAIL_VERIFY_CODE = "11111";

export const EMAIL_VERIFY_RESEND_SECONDS = 60;

export function normalizeEmailVerifyCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 5);
}

export function isValidEmailVerifyCode(value: string) {
  return normalizeEmailVerifyCode(value) === DEV_EMAIL_VERIFY_CODE;
}
