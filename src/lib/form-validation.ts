/** Shared registration / profile field helpers (SK forms). */

const EMAIL_RE =
  /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

/** Letters (incl. diacritics), digits, spaces and common company punctuation. */
const COMPANY_RE =
  /^[\p{L}\p{N}\s.\-&'/(),]+$/u;

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function sanitizeIco(value: string) {
  return digitsOnly(value).slice(0, 8);
}

export function isValidIco(value: string) {
  return /^\d{8}$/.test(value.trim());
}

export function sanitizeCompany(value: string) {
  return value.replace(/[^\p{L}\p{N}\s.\-&'/(),]/gu, "");
}

export function isValidCompany(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 && COMPANY_RE.test(trimmed);
}

export function isValidEmail(value: string) {
  const trimmed = value.trim();
  return EMAIL_RE.test(trimmed);
}

/** Phone: digits only (no +, spaces, dashes while typing). */
export function sanitizePhone(value: string) {
  return digitsOnly(value).slice(0, 15);
}

export function isValidPhone(value: string) {
  const digits = digitsOnly(value);
  return digits.length >= 9 && digits.length <= 15;
}

/** PSČ: digits only, typically 5 in SK/CZ. */
export function sanitizeZip(value: string) {
  return digitsOnly(value).slice(0, 5);
}

export function isValidZip(value: string) {
  return /^\d{5}$/.test(digitsOnly(value));
}

export function icoError(value: string): string | null {
  const v = value.trim();
  if (!v) return "Zadajte IČO.";
  if (!isValidIco(v)) return "IČO musí obsahovať presne 8 číslic.";
  return null;
}

export function companyError(value: string): string | null {
  const v = value.trim();
  if (!v) return "Zadajte názov firmy.";
  if (!isValidCompany(v)) {
    return "Názov firmy obsahuje nepovolené znaky.";
  }
  return null;
}

export function emailError(value: string): string | null {
  const v = value.trim();
  if (!v) return "Zadajte e-mail.";
  if (!isValidEmail(v)) {
    return "Zadajte platný e-mail (napr. meno@email.sk).";
  }
  return null;
}

export function phoneError(value: string): string | null {
  const v = value.trim();
  if (!v) return "Zadajte telefón.";
  if (!isValidPhone(v)) {
    return "Telefón musí obsahovať aspoň 9 číslic.";
  }
  return null;
}

export function zipError(value: string): string | null {
  const v = value.trim();
  if (!v) return "Zadajte PSČ.";
  if (!isValidZip(v)) return "PSČ musí obsahovať 5 číslic.";
  return null;
}
