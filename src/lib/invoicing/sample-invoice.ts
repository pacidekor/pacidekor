import { VAT_RATE, priceIncludingVat } from "@/lib/price";
import { INVOICE_ISSUER } from "@/lib/invoicing/issuer";
import type { InvoicePdfData } from "@/lib/invoicing/types";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Ukážkové dáta pre /dev/invoices preview. */
export function buildSampleInvoicePdfData(
  variant: "paid" | "cod" = "paid",
): InvoicePdfData {
  const productsEx = 48.78;
  const shippingEx = 2.3;
  const vatAmount = priceIncludingVat(productsEx) - productsEx;
  const totalIncVat = priceIncludingVat(productsEx) + shippingEx;
  const isCod = variant === "cod";

  return {
    invoiceNumber: isCod ? "FA-2026-0002" : "FA-2026-0001",
    issueDate: todayIso(),
    dueDate: todayIso(),
    items: [
      {
        description: "Echinacea na stopke - oranžová",
        quantity: 2,
        unitPriceExVat: 12.5,
        lineTotalExVat: 25,
      },
      {
        description: "Dekoračná tráva - zelená",
        quantity: 3,
        unitPriceExVat: 7.9267,
        lineTotalExVat: 23.78,
      },
      {
        description: "Packeta / Zásielkovňa - výdajné miesto",
        quantity: 1,
        unitPriceExVat: shippingEx,
        lineTotalExVat: shippingEx,
      },
    ],
    subtotalExVat: productsEx + shippingEx,
    vatRate: VAT_RATE,
    vatAmount,
    totalIncVat,
    currency: "EUR",
    issuerName: INVOICE_ISSUER.name,
    issuerAddress: INVOICE_ISSUER.address,
    issuerIco: INVOICE_ISSUER.ico,
    issuerDic: INVOICE_ISSUER.dic,
    issuerIcDph: INVOICE_ISSUER.icDph,
    issuerIban: INVOICE_ISSUER.iban,
    issuerVatNote: INVOICE_ISSUER.vatNote,
    customerName: "Kvetinárstvo Demo s.r.o.",
    customerAddress: "Hlavná 12, 811 01 Bratislava, Slovenská republika",
    customerIco: "12345678",
    customerDic: "2020123456",
    variableSymbol: isCod ? "20260002" : "20260001",
    paymentMethod: isCod ? "Dobierka" : "Online platba (GoPay)",
    paid: !isCod,
  };
}
