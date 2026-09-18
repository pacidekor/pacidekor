import { COMPANY } from "@/lib/company";

/** Produkčný IBAN PACIDEKOR (bez medzier). */
const DEFAULT_IBAN = "SK1011000000002943087315";

/**
 * Fixný dodávateľ pre faktúry.
 * IBAN cez `INVOICE_IBAN`, inak default vyššie.
 */
export const INVOICE_ISSUER = {
  name: COMPANY.name,
  address: COMPANY.addressFull,
  ico: COMPANY.ico,
  dic: COMPANY.dic,
  icDph: COMPANY.icDph,
  email: COMPANY.email,
  phone: COMPANY.phone,
  iban: (
    process.env.INVOICE_IBAN?.replace(/\s+/g, "").trim() || DEFAULT_IBAN
  ).toUpperCase(),
  currency: "EUR" as const,
  vatNote: `Platiteľ DPH · IČ DPH ${COMPANY.icDph}`,
} as const;

/** IBAN so skupinami po 4 znakoch. */
export function formatIbanDisplay(iban: string) {
  const compact = iban.replace(/\s+/g, "").toUpperCase();
  return compact.replace(/(.{4})(?=.)/g, "$1 ").trim();
}
