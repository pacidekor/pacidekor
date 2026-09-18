import { formatPrice, parsePrice } from "@/lib/price";
import type {
  PaymentMethodId,
  ShippingMethodId,
} from "@/lib/shipping";

export type OrderStatus =
  | "nova"
  | "nezaplatena"
  | "zaplatena"
  | "pripravuje_sa"
  | "pripravena_na_odoslanie"
  | "predana_dopravcovi"
  | "dorucena"
  | "stornovana";

export type OrderCustomer = {
  name: string;
  email: string;
  phone: string;
  company?: string;
  ico?: string;
  dic?: string;
  street: string;
  city: string;
  zip: string;
  country: string;
};

export type OrderItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: string;
  colorId?: string;
};

export type Order = {
  id: string;
  dbId?: string;
  status: OrderStatus;
  createdAt: string;
  createdAtLabel: string;
  customer: OrderCustomer;
  items: OrderItem[];
  shippingCost: string;
  paymentMethod: string;
  shippingMethod: string;
  paymentMethodId?: PaymentMethodId;
  shippingMethodId?: ShippingMethodId;
  note?: string;
  packetaPointId?: string;
  packetaPointName?: string;
  packetaPacketId?: string;
  promoCode?: string;
  subtotalEur?: number;
  discountEur?: number;
  totalEur?: number;
};

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; tag: string; className: string }
> = {
  nova: {
    label: "Nová",
    tag: "#nová",
    className: "bg-[#dbeafe] text-[#1d4ed8]",
  },
  nezaplatena: {
    label: "Nezaplatená",
    tag: "#nezaplatená",
    className: "bg-[#fce7f3] text-[#9d174d]",
  },
  zaplatena: {
    label: "Zaplatená",
    tag: "#zaplatená",
    className: "bg-[#d1fae5] text-[#047857]",
  },
  pripravuje_sa: {
    label: "Pripravuje sa",
    tag: "#pripravuje-sa",
    className: "bg-[#ffedd5] text-[#c2410c]",
  },
  pripravena_na_odoslanie: {
    label: "Na odoslanie",
    tag: "#pripravená",
    className: "bg-[#fef3c7] text-[#b45309]",
  },
  predana_dopravcovi: {
    label: "Predaná dopravcovi",
    tag: "#dopravca",
    className: "bg-[#e0e7ff] text-[#3730a3]",
  },
  dorucena: {
    label: "Doručená",
    tag: "#doručená",
    className: "bg-[#dcfce7] text-[#15803d]",
  },
  stornovana: {
    label: "Stornovaná",
    tag: "#storno",
    className: "bg-[#fee2e2] text-[#b91c1c]",
  },
};

export const LABEL_PRINTABLE_STATUSES: OrderStatus[] = [
  "nova",
  "zaplatena",
  "pripravuje_sa",
  "pripravena_na_odoslanie",
];

export const PENDING_ORDER_STATUSES: OrderStatus[] = [
  "nova",
  "nezaplatena",
  "zaplatena",
  "pripravuje_sa",
  "pripravena_na_odoslanie",
];

export type OrderStatusFilterId = "all" | "cakajuce" | OrderStatus;

export const ORDER_STATUS_FILTERS: {
  id: OrderStatusFilterId;
  label: string;
}[] = [
  { id: "all", label: "Všetky" },
  { id: "cakajuce", label: "Čakajúce" },
  { id: "nova", label: "Nové" },
  { id: "nezaplatena", label: "Nezaplatené" },
  { id: "zaplatena", label: "Zaplatené" },
  { id: "pripravuje_sa", label: "Pripravuje sa" },
  { id: "pripravena_na_odoslanie", label: "Na odoslanie" },
  { id: "predana_dopravcovi", label: "U dopravcu" },
  { id: "dorucena", label: "Doručené" },
  { id: "stornovana", label: "Stornované" },
];

export const CANCELLABLE_ORDER_STATUSES: OrderStatus[] = [
  "nova",
  "nezaplatena",
  "zaplatena",
  "pripravuje_sa",
  "pripravena_na_odoslanie",
];

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "nova",
  "nezaplatena",
  "zaplatena",
  "pripravuje_sa",
  "pripravena_na_odoslanie",
  "predana_dopravcovi",
];

export const ORDERS_EVENT = "paci-orders-changed";

export function isValidOrderStatusFilter(
  value: string | undefined,
): value is OrderStatusFilterId {
  return ORDER_STATUS_FILTERS.some((filter) => filter.id === value);
}

export function canCancelOrder(order: Order) {
  return CANCELLABLE_ORDER_STATUSES.includes(order.status);
}

export function formatOrderCreatedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("sk-SK", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function orderCustomerLabel(order: Order) {
  return order.customer.company || order.customer.name;
}

export function orderItemsSubtotal(order: Order) {
  return order.items.reduce(
    (sum, line) => sum + parsePrice(line.unitPrice) * line.quantity,
    0,
  );
}

export function orderTotal(order: Order) {
  if (typeof order.totalEur === "number") return order.totalEur;
  return orderItemsSubtotal(order) + parsePrice(order.shippingCost);
}

export function formatOrderTotal(order: Order) {
  return formatPrice(orderTotal(order));
}

export function canPrintShippingLabel(order: Order) {
  return (
    LABEL_PRINTABLE_STATUSES.includes(order.status) &&
    order.shippingMethodId === "packeta_point"
  );
}

/** Faktúra po online platbe alebo pri dobierke (nie nezaplatená / stornovaná). */
export function orderEligibleForInvoice(order: Order) {
  if (order.status === "stornovana" || order.status === "nezaplatena") {
    return false;
  }
  if (order.paymentMethodId === "cod") return true;
  return (
    order.status === "zaplatena" ||
    order.status === "pripravuje_sa" ||
    order.status === "pripravena_na_odoslanie" ||
    order.status === "predana_dopravcovi" ||
    order.status === "dorucena"
  );
}

export function orderStatusClass(status: OrderStatus | string) {
  if (status in ORDER_STATUS_META) {
    return ORDER_STATUS_META[status as OrderStatus].className;
  }

  switch (status) {
    case "Nová":
      return ORDER_STATUS_META.nova.className;
    case "Pripravuje sa":
      return ORDER_STATUS_META.pripravuje_sa.className;
    case "Odoslaná":
      return ORDER_STATUS_META.predana_dopravcovi.className;
    case "Zaplatená":
      return ORDER_STATUS_META.zaplatena.className;
    case "Stornovaná":
      return ORDER_STATUS_META.stornovana.className;
    default:
      return "bg-[#f0eee9] text-[#2f2924]/70";
  }
}

export function pendingOrdersForDashboard(orders: Order[]) {
  return orders
    .filter((order) => PENDING_ORDER_STATUSES.includes(order.status))
    .slice(0, 5)
    .map((order) => ({
      number: order.id,
      customer: orderCustomerLabel(order),
      price: formatOrderTotal(order),
      status: ORDER_STATUS_META[order.status].label,
      createdAt: order.createdAtLabel,
    }));
}

export function recentOrdersForDashboard(orders: Order[], limit = 3) {
  return orders.slice(0, limit).map((order) => ({
    number: order.id,
    customer: orderCustomerLabel(order),
    price: formatOrderTotal(order),
    status: ORDER_STATUS_META[order.status].label,
    createdAt: order.createdAtLabel,
  }));
}

export function getActiveOrdersForCustomerEmail(
  orders: Order[],
  email: string,
) {
  const normalized = email.trim().toLowerCase();
  return orders
    .filter(
      (order) =>
        order.customer.email.toLowerCase() === normalized &&
        ACTIVE_ORDER_STATUSES.includes(order.status),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getOrderHistoryForCustomerEmail(
  orders: Order[],
  email: string,
) {
  const normalized = email.trim().toLowerCase();
  return orders
    .filter(
      (order) =>
        order.customer.email.toLowerCase() === normalized &&
        !ACTIVE_ORDER_STATUSES.includes(order.status),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function formatOrderShippingLine(
  order: Pick<Order, "shippingMethod" | "packetaPointName">,
) {
  if (order.packetaPointName?.trim()) {
    return `${order.shippingMethod} · ${order.packetaPointName.trim()}`;
  }

  return order.shippingMethod;
}

export function getOrderById(orders: Order[], id: string) {
  return orders.find((order) => order.id === id);
}

/** Normalize customer-entered order numbers (PD-YYYY-#####). */
export function normalizeOrderNumberInput(value: string) {
  let next = value.trim().replace(/^#/, "").toUpperCase();
  if (!next) return "";
  if (/^\d{4}-\d+$/.test(next)) {
    next = `PD-${next}`;
  }
  return next;
}
