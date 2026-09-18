import "server-only";

import { revalidatePath } from "next/cache";
import { getGopayPaymentStatus, isGopayPaidState } from "@/lib/gopay";
import type { OrderStatus } from "@/lib/orders";
import { notifyOrderPaid } from "@/lib/order-paid-notify";
import { getOrderByDbIdFromDb } from "@/lib/orders.server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Fetch GoPay status and mark matching order as paid when applicable.
 * Safe to call repeatedly (notify + return page).
 *
 * Do NOT pass revalidate:true from a Server Component render —
 * revalidatePath during render throws in Next.js.
 */
export async function syncOrderPaidFromGopayPayment(
  paymentId: string | number,
  options?: { revalidate?: boolean },
): Promise<{
  orderNumber: string | null;
  state: string | null;
  markedPaid: boolean;
}> {
  const payment = await getGopayPaymentStatus(paymentId);
  const db = createServiceClient();

  const { data: order, error } = await db
    .from("orders")
    .select("id, order_number, status, gopay_payment_id")
    .eq("gopay_payment_id", String(payment.id))
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!order) {
    return {
      orderNumber: payment.order_number ?? null,
      state: payment.state,
      markedPaid: false,
    };
  }

  if (!isGopayPaidState(payment.state)) {
    return {
      orderNumber: order.order_number,
      state: payment.state,
      markedPaid: false,
    };
  }

  const current = order.status as OrderStatus;
  if (current === "stornovana") {
    return {
      orderNumber: order.order_number,
      state: payment.state,
      markedPaid: false,
    };
  }

  if (current !== "nezaplatena" && current !== "nova") {
    return {
      orderNumber: order.order_number,
      state: payment.state,
      markedPaid: current === "zaplatena",
    };
  }

  const { data: updated, error: updateError } = await db
    .from("orders")
    .update({ status: "zaplatena" })
    .eq("id", order.id)
    .in("status", ["nezaplatena", "nova"])
    .select("status")
    .maybeSingle();

  if (updateError) {
    throw new Error(updateError.message);
  }

  const markedPaid = updated?.status === "zaplatena";
  if (markedPaid) {
    try {
      const fullOrder = await getOrderByDbIdFromDb(order.id);
      if (fullOrder) await notifyOrderPaid(fullOrder);
    } catch (error) {
      console.error("syncOrderPaidFromGopayPayment notify:", error);
    }

    if (options?.revalidate) {
      revalidatePath("/admin");
      revalidatePath("/admin/objednavky");
      revalidatePath("/ucet");
    }
  }

  return {
    orderNumber: order.order_number,
    state: payment.state,
    markedPaid,
  };
}
