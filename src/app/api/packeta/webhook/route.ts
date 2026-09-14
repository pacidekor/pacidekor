import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { advanceOrderStatus } from "@/lib/order-status-transitions";
import type { Order } from "@/lib/orders";
import {
  mapPacketaStatusToOrderStatus,
  parsePacketaWebhookPayload,
  verifyPacketaWebhookSignature,
} from "@/lib/packeta-tracking";
import { createServiceClient } from "@/lib/supabase/server";
import {
  mapDbOrderToOrder,
  type OrderItemRow,
  type OrderRow,
} from "@/lib/orders.server";

export const runtime = "nodejs";

async function findOrderByPacket(
  packetId: string | null,
  barcode: string | null,
): Promise<Order | null> {
  if (!packetId && !barcode) return null;

  const db = createServiceClient();
  let row: OrderRow | null = null;

  if (packetId) {
    const { data, error } = await db
      .from("orders")
      .select("*")
      .eq("packeta_packet_id", packetId)
      .maybeSingle();
    if (error) {
      console.error("packeta webhook lookup by packetId:", error.message);
      return null;
    }
    row = (data as OrderRow | null) ?? null;
  }

  // Barcode fallback — Packeta sometimes sends Z… barcode instead of numeric id.
  if (!row && barcode) {
    const { data, error } = await db
      .from("orders")
      .select("*")
      .eq("packeta_packet_id", barcode)
      .maybeSingle();
    if (error) {
      console.error("packeta webhook lookup by barcode:", error.message);
      return null;
    }
    row = (data as OrderRow | null) ?? null;
  }

  if (!row) return null;

  const { data: items, error: itemsError } = await db
    .from("order_items")
    .select("*")
    .eq("order_id", row.id);

  if (itemsError) {
    console.error("packeta webhook items:", itemsError.message);
    return mapDbOrderToOrder(row, []);
  }

  return mapDbOrderToOrder(row, (items as OrderItemRow[] | null) ?? []);
}

export async function POST(request: Request) {
  const signingKey = process.env.PACKETA_WEBHOOK_SIGNING_KEY?.trim();
  if (!signingKey) {
    console.error("packeta webhook: missing PACKETA_WEBHOOK_SIGNING_KEY");
    return NextResponse.json(
      { ok: false, error: "Webhook not configured" },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const timestamp = request.headers.get("x-webhook-timestamp");
  const signature = request.headers.get("x-webhook-signature");

  if (
    !verifyPacketaWebhookSignature({
      rawBody,
      timestamp,
      signature,
      signingKey,
    })
  ) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  const event = parsePacketaWebhookPayload(rawBody);
  if (!event || event.statusCode == null) {
    // Ack unknown shape so Packeta stops retrying.
    return NextResponse.json({ ok: true, ignored: true });
  }

  const nextStatus = mapPacketaStatusToOrderStatus(event.statusCode);
  if (!nextStatus) {
    return NextResponse.json({ ok: true, ignored: true, reason: "status" });
  }

  const order = await findOrderByPacket(event.packetId, event.barcode);
  if (!order) {
    // Unknown packet — 200 so Packeta does not keep retrying forever.
    console.warn("packeta webhook: order not found", {
      packetId: event.packetId,
      barcode: event.barcode,
      statusCode: event.statusCode,
    });
    return NextResponse.json({ ok: true, ignored: true, reason: "order" });
  }

  const applied = await advanceOrderStatus({
    order,
    nextStatus,
    notify: true,
  });

  if (applied) {
    revalidatePath("/admin/objednavky");
    revalidatePath("/ucet");
  }

  return NextResponse.json({
    ok: true,
    orderNumber: order.id,
    status: applied ?? order.status,
    advanced: Boolean(applied),
  });
}
