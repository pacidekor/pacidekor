import { formatPrice, parsePrice } from "@/lib/price";
import { findCatalogProductById } from "@/lib/product-catalog";

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
};

export type Order = {
  id: string;
  status: OrderStatus;
  createdAt: string;
  createdAtLabel: string;
  customer: OrderCustomer;
  items: OrderItem[];
  shippingCost: string;
  paymentMethod: string;
  shippingMethod: string;
  note?: string;
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

/** Statusy, pri ktorých dáva zmysel tlač dopravného štítku. */
export const LABEL_PRINTABLE_STATUSES: OrderStatus[] = [
  "zaplatena",
  "pripravuje_sa",
  "pripravena_na_odoslanie",
];

/** Statusy objednávok čakajúcich na vybavenie (dashboard + filter). */
export const PENDING_ORDER_STATUSES: OrderStatus[] = [
  "nova",
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

export function isValidOrderStatusFilter(
  value: string | undefined,
): value is OrderStatusFilterId {
  return ORDER_STATUS_FILTERS.some((filter) => filter.id === value);
}

function item(
  productId: string,
  quantity: number,
  unitPrice?: string,
): OrderItem {
  const product = findCatalogProductById(productId);
  return {
    productId,
    name: product?.name ?? `Produkt ${productId}`,
    quantity,
    unitPrice: unitPrice ?? product?.price ?? "0,00 €",
  };
}

export const orders: Order[] = [
  {
    id: "2026-00126",
    status: "pripravuje_sa",
    createdAt: "2026-08-14T11:20:00",
    createdAtLabel: "včera",
    customer: {
      name: "Tomáš Dočekal",
      company: "Rezit",
      email: "tomasdocekal15@gmail.com",
      phone: "+420 773 902 633",
      ico: "24908134",
      street: "Čáslavská 164",
      city: "Seč",
      zip: "538 07",
      country: "Česká Republika",
    },
    items: [
      {
        productId: "09fade02-8f2c-40f2-8474-320abed80a84",
        name: "Ruža - vetva s púčikmi",
        quantity: 24,
        unitPrice: "1,00 €",
      },
      {
        productId: "ecb209fa-4b66-415d-947c-7d26fd18dbb4",
        name: "Bahniatka - farebné varianty",
        quantity: 12,
        unitPrice: "1,00 €",
      },
      {
        productId: "38a84572-b740-4624-8d8c-ceba69218e6f",
        name: "Hortenzia - stonok 61 cm",
        quantity: 8,
        unitPrice: "1,00 €",
      },
    ],
    shippingCost: "0,00 €",
    paymentMethod: "Prevodom",
    shippingMethod: "Kuriér - Packeta",
    note: "Prosím dodať v priebehu tohto týždňa.",
  },
  {
    id: "2026-00118",
    status: "dorucena",
    createdAt: "2026-07-28T14:05:00",
    createdAtLabel: "pred 2 týždňami",
    customer: {
      name: "Tomáš Dočekal",
      company: "Rezit",
      email: "tomasdocekal15@gmail.com",
      phone: "+420 773 902 633",
      ico: "24908134",
      street: "Čáslavská 164",
      city: "Seč",
      zip: "538 07",
      country: "Česká Republika",
    },
    items: [
      {
        productId: "b0eb0ba6-b1b6-4d86-82f9-282125e5afef",
        name: "Narcis žltý viackvetý",
        quantity: 36,
        unitPrice: "1,00 €",
      },
      {
        productId: "b7b52f33-e660-416e-b4c3-3dd39e149861",
        name: "Zeleň - dlhé pruhované listy",
        quantity: 20,
        unitPrice: "1,00 €",
      },
    ],
    shippingCost: "0,00 €",
    paymentMethod: "Prevodom",
    shippingMethod: "Kuriér - Packeta",
  },
  {
    id: "2026-00105",
    status: "stornovana",
    createdAt: "2026-06-15T09:30:00",
    createdAtLabel: "pred 2 mesiacmi",
    customer: {
      name: "Tomáš Dočekal",
      company: "Rezit",
      email: "tomasdocekal15@gmail.com",
      phone: "+420 773 902 633",
      ico: "24908134",
      street: "Čáslavská 164",
      city: "Seč",
      zip: "538 07",
      country: "Česká Republika",
    },
    items: [
      {
        productId: "f0862f0d-90ae-44a3-b5d4-638693e0352b",
        name: "Ružičky - mix krémovo-petrolejová",
        quantity: 15,
        unitPrice: "1,00 €",
      },
      {
        productId: "a6c6db4d-d6d4-4c11-9ae5-8677ead05e04",
        name: "Narcis žltý s trúbkou",
        quantity: 10,
        unitPrice: "1,00 €",
      },
    ],
    shippingCost: "0,00 €",
    paymentMethod: "Prevodom",
    shippingMethod: "Kuriér - Packeta",
    note: "Zrušené na žiadosť zákazníka.",
  },
  {
    id: "2026-00125",
    status: "pripravuje_sa",
    createdAt: "2026-07-24T10:33:00",
    createdAtLabel: "pred 12 min",
    customer: {
      name: "Mária Kováčová",
      company: "Kvetinárstvo Ruža",
      email: "objednavky@kvetinarstvo-ruza.sk",
      phone: "+421 903 112 334",
      ico: "46882115",
      street: "Hlavná 18",
      city: "Trnava",
      zip: "917 01",
      country: "Slovensko",
    },
    items: [
      item("1", 12),
      item("2", 8),
      item("6", 4),
    ],
    shippingCost: "0,00 €",
    paymentMethod: "Prevodom",
    shippingMethod: "Kuriér - Packeta",
    note: "Prosím doručiť pred 14:00.",
  },
  {
    id: "2026-00124",
    status: "nova",
    createdAt: "2026-07-24T10:17:00",
    createdAtLabel: "pred 28 min",
    customer: {
      name: "Jana Nováková",
      email: "jana.novakova@email.sk",
      phone: "+421 905 778 221",
      street: "Štúrova 42",
      city: "Bratislava",
      zip: "811 02",
      country: "Slovensko",
    },
    items: [item("3", 2), item("4", 1)],
    shippingCost: "3,90 €",
    paymentMethod: "Kartou online",
    shippingMethod: "Kuriér - SPS",
  },
  {
    id: "2026-00123",
    status: "pripravuje_sa",
    createdAt: "2026-07-24T09:45:00",
    createdAtLabel: "pred 1 hod.",
    customer: {
      name: "Mária Horváthová",
      company: "Floristika Mária",
      email: "maria@floristika.sk",
      phone: "+421 918 445 090",
      ico: "51220987",
      street: "Námestie SNP 5",
      city: "Banská Bystrica",
      zip: "974 01",
      country: "Slovensko",
    },
    items: [item("9", 6), item("5", 4), item("7", 10)],
    shippingCost: "0,00 €",
    paymentMethod: "Prevodom",
    shippingMethod: "Kuriér - Packeta",
  },
  {
    id: "2026-00114",
    status: "predana_dopravcovi",
    createdAt: "2026-07-22T08:20:00",
    createdAtLabel: "pred 2 dňami",
    customer: {
      name: "Mária Horváthová",
      company: "Floristika Mária",
      email: "maria@floristika.sk",
      phone: "+421 918 445 090",
      ico: "51220987",
      street: "Námestie SNP 5",
      city: "Banská Bystrica",
      zip: "974 01",
      country: "Slovensko",
    },
    items: [item("1", 15), item("2", 10)],
    shippingCost: "0,00 €",
    paymentMethod: "Prevodom",
    shippingMethod: "Kuriér - Packeta",
  },
  {
    id: "2026-00108",
    status: "dorucena",
    createdAt: "2026-07-10T11:00:00",
    createdAtLabel: "pred 16 dňami",
    customer: {
      name: "Mária Horváthová",
      company: "Floristika Mária",
      email: "maria@floristika.sk",
      phone: "+421 918 445 090",
      ico: "51220987",
      street: "Námestie SNP 5",
      city: "Banská Bystrica",
      zip: "974 01",
      country: "Slovensko",
    },
    items: [item("6", 8), item("9", 12), item("4", 6)],
    shippingCost: "0,00 €",
    paymentMethod: "Prevodom",
    shippingMethod: "Kuriér - SPS",
  },
  {
    id: "2026-00091",
    status: "dorucena",
    createdAt: "2026-06-18T14:30:00",
    createdAtLabel: "pred 1 mes.",
    customer: {
      name: "Mária Horváthová",
      company: "Floristika Mária",
      email: "maria@floristika.sk",
      phone: "+421 918 445 090",
      ico: "51220987",
      street: "Námestie SNP 5",
      city: "Banská Bystrica",
      zip: "974 01",
      country: "Slovensko",
    },
    items: [item("5", 20), item("7", 15)],
    shippingCost: "0,00 €",
    paymentMethod: "Prevodom",
    shippingMethod: "Kuriér - Packeta",
  },
  {
    id: "2026-00122",
    status: "nova",
    createdAt: "2026-07-24T08:40:00",
    createdAtLabel: "pred 2 hod.",
    customer: {
      name: "Peter Horváth",
      email: "peter.horvath@gmail.com",
      phone: "+421 911 220 118",
      street: "Legionárska 9",
      city: "Nitra",
      zip: "949 01",
      country: "Slovensko",
    },
    items: [item("8", 2), item("4", 2)],
    shippingCost: "3,90 €",
    paymentMethod: "Dobierka",
    shippingMethod: "Kuriér - GLS",
  },
  {
    id: "2026-00121",
    status: "nezaplatena",
    createdAt: "2026-07-24T07:15:00",
    createdAtLabel: "pred 3 hod.",
    customer: {
      name: "Tomáš Belko",
      email: "tomas.belko@outlook.com",
      phone: "+421 902 661 440",
      street: "Jesenského 3",
      city: "Žilina",
      zip: "010 01",
      country: "Slovensko",
    },
    items: [item("1", 1), item("10", 1)],
    shippingCost: "3,90 €",
    paymentMethod: "Prevodom",
    shippingMethod: "Kuriér - Packeta",
    note: "Čaká sa na platbu.",
  },
  {
    id: "2026-00120",
    status: "pripravuje_sa",
    createdAt: "2026-07-24T06:30:00",
    createdAtLabel: "pred 4 hod.",
    customer: {
      name: "Eva Šimková",
      company: "Dekor Ateliér",
      email: "info@dekoratelier.sk",
      phone: "+421 917 333 210",
      ico: "44551209",
      street: "Mlynská 14",
      city: "Košice",
      zip: "040 01",
      country: "Slovensko",
    },
    items: [item("2", 5), item("6", 5), item("9", 5)],
    shippingCost: "0,00 €",
    paymentMethod: "Prevodom",
    shippingMethod: "Kuriér - SPS",
  },
  {
    id: "2026-00119",
    status: "pripravena_na_odoslanie",
    createdAt: "2026-07-23T16:20:00",
    createdAtLabel: "včera",
    customer: {
      name: "Lucia Farkašová",
      email: "lucia.f@email.sk",
      phone: "+421 904 889 012",
      street: "Poľná 27",
      city: "Prešov",
      zip: "080 01",
      country: "Slovensko",
    },
    items: [item("3", 3), item("7", 2)],
    shippingCost: "3,90 €",
    paymentMethod: "Kartou online",
    shippingMethod: "Kuriér - Packeta",
  },
  {
    id: "2026-00118",
    status: "zaplatena",
    createdAt: "2026-07-23T14:05:00",
    createdAtLabel: "včera",
    customer: {
      name: "Martin Čech",
      company: "Event Decor s.r.o.",
      email: "martin@eventdecor.sk",
      phone: "+421 948 120 555",
      ico: "50112233",
      street: "Priemyselná 8",
      city: "Trenčín",
      zip: "911 01",
      country: "Slovensko",
    },
    items: [item("1", 20), item("5", 10)],
    shippingCost: "0,00 €",
    paymentMethod: "Prevodom",
    shippingMethod: "Kuriér - GLS",
  },
  {
    id: "2026-00117",
    status: "predana_dopravcovi",
    createdAt: "2026-07-22T11:40:00",
    createdAtLabel: "pred 2 dňami",
    customer: {
      name: "Zuzana Králová",
      email: "zuzana.kralova@gmail.com",
      phone: "+421 915 441 778",
      street: "Dunajská 11",
      city: "Bratislava",
      zip: "811 08",
      country: "Slovensko",
    },
    items: [item("10", 2), item("8", 1)],
    shippingCost: "3,90 €",
    paymentMethod: "Kartou online",
    shippingMethod: "Kuriér - Packeta",
  },
  {
    id: "2026-00116",
    status: "dorucena",
    createdAt: "2026-07-21T09:10:00",
    createdAtLabel: "pred 3 dňami",
    customer: {
      name: "Andrea Molnárová",
      company: "Kvety & Viac",
      email: "andrea@kvetyaviac.sk",
      phone: "+421 908 212 990",
      street: "Hviezdoslavova 2",
      city: "Martin",
      zip: "036 01",
      country: "Slovensko",
    },
    items: [item("2", 4), item("4", 6)],
    shippingCost: "0,00 €",
    paymentMethod: "Prevodom",
    shippingMethod: "Kuriér - SPS",
  },
  {
    id: "2026-00115",
    status: "stornovana",
    createdAt: "2026-07-20T15:55:00",
    createdAtLabel: "pred 4 dňami",
    customer: {
      name: "Igor Novotný",
      email: "igor.novotny@email.sk",
      phone: "+421 903 555 101",
      street: "Kollárova 6",
      city: "Poprad",
      zip: "058 01",
      country: "Slovensko",
    },
    items: [item("9", 1)],
    shippingCost: "3,90 €",
    paymentMethod: "Dobierka",
    shippingMethod: "Kuriér - Packeta",
    note: "Zákazník zrušil objednávku.",
  },
];

const CANCELLED_ORDERS_KEY = "pacidekor-cancelled-orders";
export const ORDERS_EVENT = "paci-orders-changed";

/** Stavy, v ktorých môže zákazník ešte zrušiť objednávku. */
export const CANCELLABLE_ORDER_STATUSES: OrderStatus[] = [
  "nova",
  "nezaplatena",
  "zaplatena",
  "pripravuje_sa",
  "pripravena_na_odoslanie",
];

function readCancelledOrderIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CANCELLED_ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

function persistCancelledOrderId(orderId: string) {
  if (typeof window === "undefined") return;
  const next = Array.from(new Set([...readCancelledOrderIds(), orderId]));
  window.localStorage.setItem(CANCELLED_ORDERS_KEY, JSON.stringify(next));
}

function hydrateCancelledOrders() {
  for (const id of readCancelledOrderIds()) {
    const order = orders.find((item) => item.id === id);
    if (order && order.status !== "stornovana") {
      order.status = "stornovana";
      if (!order.note?.trim()) {
        order.note = "Zákazník zrušil objednávku.";
      }
    }
  }
}

export function getOrderById(id: string) {
  hydrateCancelledOrders();
  return orders.find((order) => order.id === id);
}

/** Objednávky, ktoré ešte nie sú uzavreté (doručené / stornované). */
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "nova",
  "nezaplatena",
  "zaplatena",
  "pripravuje_sa",
  "pripravena_na_odoslanie",
  "predana_dopravcovi",
];

export function canCancelOrder(order: Order) {
  return CANCELLABLE_ORDER_STATUSES.includes(order.status);
}

/** Formát dátumu objednávky pre zákaznícky detail (sk). */
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

export function cancelOrder(orderId: string, customerEmail: string): boolean {
  hydrateCancelledOrders();
  const order = orders.find((item) => item.id === orderId);
  if (!order) return false;
  if (order.customer.email.toLowerCase() !== customerEmail.trim().toLowerCase()) {
    return false;
  }
  if (!canCancelOrder(order)) return false;

  order.status = "stornovana";
  order.note = "Zákazník zrušil objednávku.";
  persistCancelledOrderId(order.id);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ORDERS_EVENT));
  }
  return true;
}

export function getOrdersForCustomerEmail(email: string): Order[] {
  hydrateCancelledOrders();
  const normalized = email.trim().toLowerCase();
  return orders
    .filter((order) => order.customer.email.toLowerCase() === normalized)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getActiveOrdersForCustomerEmail(email: string): Order[] {
  return getOrdersForCustomerEmail(email).filter((order) =>
    ACTIVE_ORDER_STATUSES.includes(order.status),
  );
}

export function getOrderHistoryForCustomerEmail(email: string): Order[] {
  return getOrdersForCustomerEmail(email).filter(
    (order) => !ACTIVE_ORDER_STATUSES.includes(order.status),
  );
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
  return orderItemsSubtotal(order) + parsePrice(order.shippingCost);
}

export function formatOrderTotal(order: Order) {
  return formatPrice(orderTotal(order));
}

export function canPrintShippingLabel(order: Order) {
  return LABEL_PRINTABLE_STATUSES.includes(order.status);
}

export function orderStatusClass(status: OrderStatus | string) {
  if (status in ORDER_STATUS_META) {
    return ORDER_STATUS_META[status as OrderStatus].className;
  }

  // Legacy dashboard labels
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

export function pendingOrdersForDashboard() {
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

export function recentOrdersForDashboard(limit = 3) {
  return orders.slice(0, limit).map((order) => ({
    number: order.id,
    customer: orderCustomerLabel(order),
    price: formatOrderTotal(order),
    status: ORDER_STATUS_META[order.status].label,
    createdAt: order.createdAtLabel,
  }));
}
