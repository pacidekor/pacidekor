export type InvoicePdfLineItem = {
  description: string;
  quantity: number;
  /** Jednotková cena bez DPH */
  unitPriceExVat: number;
  /** Riadok bez DPH */
  lineTotalExVat: number;
};

export type InvoicePdfData = {
  invoiceNumber: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string;
  items: InvoicePdfLineItem[];
  subtotalExVat: number;
  vatRate: number; // 0.23
  vatAmount: number;
  totalIncVat: number;
  currency: string;
  issuerName: string;
  issuerAddress: string;
  issuerIco: string;
  issuerDic?: string;
  issuerIcDph?: string;
  issuerIban: string;
  issuerVatNote?: string;
  /** ARES sa doplní neskôr; zatiaľ údaje z objednávky. */
  customerName: string;
  customerAddress: string;
  customerIco?: string;
  customerDic?: string;
  variableSymbol: string;
  paymentMethod: string;
  paid: boolean;
  /** Explicitná poznámka; inak sa odvodí z paid / dobierky. */
  footerNote?: string;
  logoDataUrl?: string | null;
};

export function formatInvoiceMoney(amount: number, currency = "EUR") {
  const value = amount.toFixed(2).replace(".", ",");
  return currency === "EUR" ? `${value} €` : `${value} ${currency}`;
}

export function formatInvoiceDateSk(isoDate: string) {
  const [y, m, d] = isoDate.split("-");
  if (!y || !m || !d) return isoDate;
  return `${d}.${m}.${y}`;
}

/** Adresa na 1 riadok (ulica/obec + PSČ + mesto). Krajinu (SK) vynechá. */
export function formatInvoiceAddressLines(address: string): string[] {
  const raw = address.trim();
  if (!raw) return [];

  const withZip = raw.replace(/\b(\d{3})(\d{2})\b/g, "$1 $2");
  const parts = withZip
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const isCountry = (value: string) =>
    /^(slovensk[áa]\s+republik[ay]|slovensko|slovakia|česk[áa]\s+republik[ay]|česko|czechia|czech\s+republic)$/i.test(
      value,
    );

  const filtered = parts.filter((part) => !isCountry(part));
  if (filtered.length === 0) return [withZip];
  return [filtered.join(", ")];
}

/** Em/en dash → obyčajná pomlčka. */
export function plainInvoiceDash(text: string) {
  return text.replace(/[—–−]/g, "-");
}

/** IČO / DIČ / IČ DPH na 1–2 riadkoch. */
export function formatInvoiceIdLines(input: {
  ico?: string;
  dic?: string;
  icDph?: string;
}): string[] {
  const bits: string[] = [];
  if (input.ico?.trim()) bits.push(`IČO ${input.ico.trim()}`);
  if (input.dic?.trim()) bits.push(`DIČ ${input.dic.trim()}`);
  if (bits.length === 0 && !input.icDph?.trim()) return [];

  const lines: string[] = [];
  if (bits.length) lines.push(bits.join(" · "));
  if (input.icDph?.trim()) lines.push(`IČ DPH ${input.icDph.trim()}`);
  return lines;
}

export function isCodPaymentMethod(paymentMethod: string) {
  return /dobier/i.test(paymentMethod);
}

export function invoicePaymentStatusLabel(data: {
  paid: boolean;
  paymentMethod: string;
}) {
  if (isCodPaymentMethod(data.paymentMethod)) {
    return "DOBIERKA - PLATBA PRI PREVZATÍ";
  }
  if (data.paid) return "UHRADENÉ - NEPLAŤTE ZNOVA";
  return undefined;
}

/** Text v patičke - zaplatené vs. dobierka. */
export function defaultInvoiceFooterNote(data: {
  paid: boolean;
  paymentMethod: string;
  footerNote?: string;
}) {
  if (data.footerNote?.trim()) return plainInvoiceDash(data.footerNote.trim());
  if (isCodPaymentMethod(data.paymentMethod)) {
    return "Platba na dobierku - uhrádza sa pri prevzatí zásielky. Neplaťte bankovým prevodom.";
  }
  if (data.paid) {
    return "Táto faktúra už bola uhradená online. Neplaťte znova.";
  }
  return undefined;
}

