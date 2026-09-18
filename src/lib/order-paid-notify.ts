import "server-only";

import { buildOrderPaidEmail } from "@/lib/emails/order-paid";
import { sendBrevoTemplateEmail } from "@/lib/emails/brevo";
import {
  buildInvoiceDownloadUrl,
  ensureInvoiceForOrder,
  renderInvoicePdf,
} from "@/lib/invoicing";
import { buildOrderViewUrl } from "@/lib/order-view-token";
import {
  formatOrderTotal,
  orderItemsSubtotal,
  type Order,
} from "@/lib/orders";
import { formatPrice, parsePrice } from "@/lib/price";
import { colorsFromIds } from "@/lib/products";

function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://pacidekor.sk"
  ).replace(/\/$/, "");
}

/**
 * Pošle zákazníkovi potvrdenie „Objednávka zaplatená“ + PDF faktúru.
 * Volaj len pri prvom prechode do stavu zaplatená (idempotentné volania
 * syncOrderPaidFromGopayPayment už `markedPaid: false` pri opätovnom syncu).
 */
export async function notifyOrderPaid(order: Order): Promise<void> {
  const to = order.customer.email.trim();
  if (!to) return;

  const base = siteUrl();
  const orderUrl = buildOrderViewUrl(order.id, base);

  let invoiceUrl: string | undefined;
  let attachments:
    | { content: string; name: string }[]
    | undefined;

  try {
    const invoice = await ensureInvoiceForOrder(order, { paid: true });
    invoiceUrl = buildInvoiceDownloadUrl(invoice.invoice_number, base);
    const pdf = await renderInvoicePdf(invoice);
    attachments = [
      {
        content: pdf.toString("base64"),
        name: `${invoice.invoice_number}.pdf`,
      },
    ];
  } catch (error) {
    console.error("notifyOrderPaid invoice:", error);
  }

  const items = order.items.map((line) => {
    const unit = parsePrice(line.unitPrice);
    const lineTotal = Number.isFinite(unit)
      ? formatPrice(unit * line.quantity)
      : line.unitPrice;
    const color = line.colorId
      ? colorsFromIds([line.colorId])[0]
      : undefined;
    return {
      name: line.name,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal,
      variant: color?.label,
    };
  });

  const shippingEur = parsePrice(order.shippingCost);
  const subtotal =
    typeof order.subtotalEur === "number"
      ? formatPrice(order.subtotalEur)
      : formatPrice(orderItemsSubtotal(order));
  const discount =
    typeof order.discountEur === "number" && order.discountEur > 0
      ? formatPrice(order.discountEur)
      : undefined;

  const email = buildOrderPaidEmail({
    customerName: order.customer.name,
    orderNumber: order.id,
    items,
    itemsTotalCount: items.length,
    subtotal,
    discount,
    promoCode: order.promoCode,
    shippingCost: shippingEur <= 0 ? "Zadarmo" : order.shippingCost,
    total: formatOrderTotal(order),
    paymentMethod: order.paymentMethod,
    shippingMethod: order.shippingMethod,
    deliveryLabel: order.packetaPointName,
    orderUrl,
    siteUrl: base,
    invoiceUrl,
  });

  try {
    const result = await sendBrevoTemplateEmail({
      to,
      email,
      tags: ["pacidekor", "order", "paid"],
      attachments,
    });
    if (!result.ok) {
      console.error("notifyOrderPaid:", result.error);
    }
  } catch (error) {
    console.error("notifyOrderPaid:", error);
  }
}
