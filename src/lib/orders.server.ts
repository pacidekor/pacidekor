import "server-only";

import type { Order, OrderItem, OrderStatus } from "@/lib/orders";
import { formatPrice } from "@/lib/price";
import {
  PAYMENT_OPTIONS,
  SHIPPING_OPTIONS,
  type PaymentMethodId,
  type ShippingMethodId,
} from "@/lib/shipping";
import { createServiceClient } from "@/lib/supabase/server";

export type OrderRow = {
  id: string;
  order_number: string;
  user_id: string | null;
  status: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_company: string | null;
  customer_ico: string | null;
  customer_dic: string | null;
  customer_street: string;
  customer_city: string;
  customer_zip: string;
  customer_country: string;
  note: string | null;
  shipping_method: string;
  payment_method: string;
  packeta_point_id: string | null;
  packeta_point_name: string | null;
  packeta_packet_id: string | null;
  gopay_payment_id?: string | null;
  subtotal_eur: number | string;
  discount_eur: number | string;
  promo_code: string | null;
  shipping_cost_eur: number | string;
  total_eur: number | string;
  created_at: string;
  updated_at: string;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  unit_price: string;
  quantity: number;
  color_id: string | null;
};

function shippingLabel(id: string) {
  return (
    SHIPPING_OPTIONS.find((option) => option.id === id)?.label ??
    id
  );
}

function paymentLabel(id: string) {
  return PAYMENT_OPTIONS.find((option) => option.id === id)?.label ?? id;
}

export function formatOrderRelativeLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / 86_400_000,
  );

  if (diffDays === 0) return "dnes";
  if (diffDays === 1) return "včera";
  if (diffDays > 1 && diffDays < 7) return `pred ${diffDays} dňami`;

  return new Intl.DateTimeFormat("sk-SK", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  }).format(date);
}

export function mapDbOrderToOrder(
  row: OrderRow,
  items: OrderItemRow[],
): Order {
  return {
    id: row.order_number,
    dbId: row.id,
    status: row.status as OrderStatus,
    createdAt: row.created_at,
    createdAtLabel: formatOrderRelativeLabel(row.created_at),
    customer: {
      name: row.customer_name,
      email: row.customer_email,
      phone: row.customer_phone,
      company: row.customer_company ?? undefined,
      ico: row.customer_ico ?? undefined,
      dic: row.customer_dic ?? undefined,
      street: row.customer_street,
      city: row.customer_city,
      zip: row.customer_zip,
      country: row.customer_country,
    },
    items: items.map(
      (item): OrderItem => ({
        productId: item.product_id,
        name: item.product_name,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        colorId: item.color_id ?? undefined,
      }),
    ),
    shippingCost: formatPrice(Number(row.shipping_cost_eur)),
    paymentMethod: paymentLabel(row.payment_method),
    shippingMethod: shippingLabel(row.shipping_method),
    paymentMethodId: row.payment_method as PaymentMethodId,
    shippingMethodId: row.shipping_method as ShippingMethodId,
    note: row.note ?? undefined,
    packetaPointId: row.packeta_point_id ?? undefined,
    packetaPointName: row.packeta_point_name ?? undefined,
    packetaPacketId: row.packeta_packet_id ?? undefined,
    promoCode: row.promo_code ?? undefined,
    subtotalEur: Number(row.subtotal_eur),
    discountEur: Number(row.discount_eur),
    totalEur: Number(row.total_eur),
  };
}

async function fetchItemsByOrderIds(orderIds: string[]) {
  if (orderIds.length === 0) return new Map<string, OrderItemRow[]>();

  const db = createServiceClient();
  const { data, error } = await db
    .from("order_items")
    .select("*")
    .in("order_id", orderIds);

  if (error) throw new Error(error.message);

  const grouped = new Map<string, OrderItemRow[]>();
  for (const row of (data as OrderItemRow[] | null) ?? []) {
    const list = grouped.get(row.order_id) ?? [];
    list.push(row);
    grouped.set(row.order_id, list);
  }
  return grouped;
}

export async function listOrdersFromDb(): Promise<Order[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data as OrderRow[] | null) ?? [];
  const itemsByOrder = await fetchItemsByOrderIds(rows.map((row) => row.id));

  return rows.map((row) =>
    mapDbOrderToOrder(row, itemsByOrder.get(row.id) ?? []),
  );
}

export async function getOrderByNumberFromDb(
  orderNumber: string,
): Promise<Order | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("orders")
    .select("*")
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as OrderRow;
  const itemsByOrder = await fetchItemsByOrderIds([row.id]);
  return mapDbOrderToOrder(row, itemsByOrder.get(row.id) ?? []);
}

export async function getOrderByDbIdFromDb(dbId: string): Promise<Order | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("orders")
    .select("*")
    .eq("id", dbId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as OrderRow;
  const itemsByOrder = await fetchItemsByOrderIds([row.id]);
  return mapDbOrderToOrder(row, itemsByOrder.get(row.id) ?? []);
}

export async function listOrdersForCustomerEmail(email: string): Promise<Order[]> {
  const normalized = email.trim().toLowerCase();
  const db = createServiceClient();
  const { data, error } = await db
    .from("orders")
    .select("*")
    .ilike("customer_email", normalized)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data as OrderRow[] | null) ?? [];
  const itemsByOrder = await fetchItemsByOrderIds(rows.map((row) => row.id));
  return rows.map((row) =>
    mapDbOrderToOrder(row, itemsByOrder.get(row.id) ?? []),
  );
}
