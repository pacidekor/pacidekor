import "server-only";

import { buildOrderHandedToCarrierEmail } from "@/lib/emails/order-handed-to-carrier";
import { buildOrderDeliveredEmail } from "@/lib/emails/order-delivered";
import { sendBrevoTemplateEmail } from "@/lib/emails/brevo";
import { buildOrderViewUrl } from "@/lib/order-view-token";
import type { Order, OrderStatus } from "@/lib/orders";
import { canAdvanceOrderStatus } from "@/lib/packeta-tracking";
import { createServiceClient } from "@/lib/supabase/server";

function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://pacidekor.sk"
  ).replace(/\/$/, "");
}

async function notifyStatusEmail(order: Order, next: OrderStatus) {
  const to = order.customer.email.trim();
  if (!to) return;

  const base = siteUrl();
  const orderUrl = buildOrderViewUrl(order.id, base);

  try {
    if (next === "predana_dopravcovi") {
      const email = buildOrderHandedToCarrierEmail({
        customerName: order.customer.name,
        orderNumber: order.id,
        shippingMethod: order.shippingMethod,
        orderUrl,
        siteUrl: base,
      });
      const result = await sendBrevoTemplateEmail({
        to,
        email,
        tags: ["pacidekor", "order", "handed-to-carrier"],
      });
      if (!result.ok) {
        console.error("notifyStatusEmail handed-to-carrier:", result.error);
      }
      return;
    }

    if (next === "dorucena") {
      const reviewsUrl = process.env.NEXT_PUBLIC_GOOGLE_REVIEWS_URL?.trim();
      const email = buildOrderDeliveredEmail({
        customerName: order.customer.name,
        orderNumber: order.id,
        shippingMethod: order.shippingMethod,
        orderUrl,
        reviewsUrl,
        siteUrl: base,
      });
      const result = await sendBrevoTemplateEmail({
        to,
        email,
        tags: ["pacidekor", "order", "delivered"],
      });
      if (!result.ok) {
        console.error("notifyStatusEmail delivered:", result.error);
      }
    }
  } catch (error) {
    console.error("notifyStatusEmail:", error);
  }
}

/**
 * Atomically advance order status (never regress). Optionally send customer e-mail.
 * Returns the status that was applied, or null if unchanged.
 */
export async function advanceOrderStatus(input: {
  order: Order;
  nextStatus: OrderStatus;
  notify?: boolean;
}): Promise<OrderStatus | null> {
  const { order, nextStatus, notify = true } = input;
  if (!order.dbId) return null;
  if (!canAdvanceOrderStatus(order.status, nextStatus)) return null;

  const db = createServiceClient();
  const { data, error } = await db
    .from("orders")
    .update({ status: nextStatus })
    .eq("id", order.dbId)
    .eq("status", order.status)
    .select("status")
    .maybeSingle();

  if (error) {
    console.error("advanceOrderStatus:", error.message);
    return null;
  }

  // Another worker already moved it, or status raced.
  if (!data || data.status !== nextStatus) return null;

  if (notify) {
    await notifyStatusEmail(order, nextStatus);
  }

  return nextStatus;
}
