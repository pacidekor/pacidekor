import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import type { Order } from "@/lib/orders";
import { orderItemsSubtotal } from "@/lib/orders";
import { VAT_RATE, parsePrice, priceIncludingVat } from "@/lib/price";
import { INVOICE_ISSUER } from "@/lib/invoicing/issuer";
import {
  getNextInvoiceNumber,
  invoiceNumberToVariableSymbol,
} from "@/lib/invoicing/invoice-number";
import { generateInvoicePdfBuffer } from "@/lib/invoicing/generate-invoice-pdf";
import type { InvoicePdfData, InvoicePdfLineItem } from "@/lib/invoicing/types";
import { createServiceClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/seo";

export type InvoiceRow = {
  id: string;
  order_id: string;
  invoice_number: string;
  variable_symbol: string;
  issued_at: string;
  due_at: string;
  currency: string;
  subtotal_ex_vat: number;
  vat_amount: number;
  total_inc_vat: number;
  payment_method: string;
  paid: boolean;
  customer: {
    name: string;
    address: string;
    ico?: string;
    dic?: string;
    email?: string;
  };
  items: InvoicePdfLineItem[];
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysIso(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function customerAddressFromOrder(order: Order) {
  return [
    order.customer.street,
    `${order.customer.zip} ${order.customer.city}`,
    order.customer.country,
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

function buildItemsFromOrder(order: Order): InvoicePdfLineItem[] {
  const items: InvoicePdfLineItem[] = order.items.map((line) => {
    const unit = parsePrice(line.unitPrice);
    return {
      description: line.name,
      quantity: line.quantity,
      unitPriceExVat: unit,
      lineTotalExVat: unit * line.quantity,
    };
  });

  const shipping = parsePrice(order.shippingCost);
  if (shipping > 0) {
    items.push({
      description: order.shippingMethod || "Doprava",
      quantity: 1,
      unitPriceExVat: shipping,
      lineTotalExVat: shipping,
    });
  }

  if ((order.discountEur ?? 0) > 0) {
    items.push({
      description: order.promoCode
        ? `Zľava ${order.promoCode}`
        : "Zľava",
      quantity: 1,
      unitPriceExVat: -(order.discountEur ?? 0),
      lineTotalExVat: -(order.discountEur ?? 0),
    });
  }

  return items;
}

function totalsFromOrder(order: Order) {
  // Rovnaká logika ako checkout: DPH z produktov po zľave, doprava flat.
  const productsEx =
    typeof order.subtotalEur === "number"
      ? Math.max(0, order.subtotalEur - (order.discountEur ?? 0))
      : Math.max(0, orderItemsSubtotal(order) - (order.discountEur ?? 0));
  const shipping = parsePrice(order.shippingCost);
  const subtotalExVat = productsEx + shipping;
  const vatAmount = priceIncludingVat(productsEx) - productsEx;
  const totalIncVat =
    typeof order.totalEur === "number"
      ? order.totalEur
      : priceIncludingVat(productsEx) + shipping;
  return { subtotalExVat, vatAmount, totalIncVat };
}

export function invoiceRowToPdfData(row: InvoiceRow): InvoicePdfData {
  return {
    invoiceNumber: row.invoice_number,
    issueDate: row.issued_at,
    dueDate: row.due_at,
    items: row.items,
    subtotalExVat: Number(row.subtotal_ex_vat),
    vatRate: VAT_RATE,
    vatAmount: Number(row.vat_amount),
    totalIncVat: Number(row.total_inc_vat),
    currency: row.currency || "EUR",
    issuerName: INVOICE_ISSUER.name,
    issuerAddress: INVOICE_ISSUER.address,
    issuerIco: INVOICE_ISSUER.ico,
    issuerDic: INVOICE_ISSUER.dic,
    issuerIcDph: INVOICE_ISSUER.icDph,
    issuerIban: INVOICE_ISSUER.iban,
    issuerVatNote: INVOICE_ISSUER.vatNote,
    customerName: row.customer.name,
    customerAddress: row.customer.address,
    customerIco: row.customer.ico,
    customerDic: row.customer.dic,
    variableSymbol: row.variable_symbol,
    paymentMethod: row.payment_method,
    paid: row.paid,
  };
}

export async function getInvoiceByOrderDbId(
  orderDbId: string,
): Promise<InvoiceRow | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("invoices")
    .select("*")
    .eq("order_id", orderDbId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as InvoiceRow | null) ?? null;
}

export async function getInvoiceByNumber(
  invoiceNumber: string,
): Promise<InvoiceRow | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("invoices")
    .select("*")
    .eq("invoice_number", invoiceNumber)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as InvoiceRow | null) ?? null;
}

/**
 * Vytvorí faktúru k objednávke (idempotentné — ak už existuje, vráti ju).
 */
export async function ensureInvoiceForOrder(
  order: Order,
  options?: { paid?: boolean },
): Promise<InvoiceRow> {
  if (!order.dbId) {
    throw new Error("Objednávka nemá databázové ID.");
  }

  const existing = await getInvoiceByOrderDbId(order.dbId);
  if (existing) {
    if (options?.paid && !existing.paid) {
      const db = createServiceClient();
      const { data, error } = await db
        .from("invoices")
        .update({ paid: true })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data as InvoiceRow;
    }
    return existing;
  }

  const invoiceNumber = await getNextInvoiceNumber();
  const variableSymbol = invoiceNumberToVariableSymbol(invoiceNumber);
  const items = buildItemsFromOrder(order);
  const { subtotalExVat, vatAmount, totalIncVat } = totalsFromOrder(order);
  const paid =
    options?.paid ??
    (order.status === "zaplatena" ||
      [
        "pripravuje_sa",
        "pripravena_na_odoslanie",
        "predana_dopravcovi",
        "dorucena",
      ].includes(order.status));

  const customer = {
    name: order.customer.company?.trim() || order.customer.name,
    address: customerAddressFromOrder(order),
    ico: order.customer.ico,
    dic: order.customer.dic,
    email: order.customer.email,
  };

  const db = createServiceClient();
  const { data, error } = await db
    .from("invoices")
    .insert({
      order_id: order.dbId,
      invoice_number: invoiceNumber,
      variable_symbol: variableSymbol,
      issued_at: todayIso(),
      due_at: paid ? todayIso() : plusDaysIso(14),
      currency: "EUR",
      subtotal_ex_vat: subtotalExVat,
      vat_amount: vatAmount,
      total_inc_vat: totalIncVat,
      payment_method: order.paymentMethod,
      paid,
      customer,
      items,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as InvoiceRow;
}

export async function renderInvoicePdf(invoice: InvoiceRow): Promise<Buffer> {
  return generateInvoicePdfBuffer(invoiceRowToPdfData(invoice));
}

function invoiceViewSecret() {
  const dedicated = process.env.ORDER_VIEW_SECRET?.trim();
  if (dedicated) return dedicated;
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (fallback) return fallback;
  throw new Error("Chýba ORDER_VIEW_SECRET.");
}

export function createInvoiceViewToken(invoiceNumber: string) {
  return createHmac("sha256", invoiceViewSecret())
    .update(`invoice:${invoiceNumber}`)
    .digest("base64url");
}

export function verifyInvoiceViewToken(invoiceNumber: string, token: string) {
  if (!token?.trim()) return false;
  try {
    const expected = createInvoiceViewToken(invoiceNumber);
    const a = Buffer.from(expected);
    const b = Buffer.from(token.trim());
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function buildInvoiceDownloadUrl(
  invoiceNumber: string,
  siteUrl?: string,
) {
  const token = createInvoiceViewToken(invoiceNumber);
  const path = `/api/invoices/${encodeURIComponent(invoiceNumber)}?t=${encodeURIComponent(token)}`;
  if (siteUrl) return `${siteUrl.replace(/\/$/, "")}${path}`;
  return absoluteUrl(path);
}
