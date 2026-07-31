import { formatPrice, parsePrice } from "@/lib/cart";
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

export const ORDER_STATUS_FILTERS: { id: "all" | OrderStatus; label: string }[] =
  [
    { id: "all", label: "Všetky" },
    { id: "nova", label: "Nové" },
    { id: "nezaplatena", label: "Nezaplatené" },
    { id: "zaplatena", label: "Zaplatené" },
    { id: "pripravuje_sa", label: "Pripravuje sa" },
    { id: "pripravena_na_odoslanie", label: "Na odoslanie" },
    { id: "predana_dopravcovi", label: "U dopravcu" },
    { id: "dorucena", label: "Doručené" },
    { id: "stornovana", label: "Stornované" },
  ];

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
    shippingMethod: "Kuriér – Packeta",
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
    shippingMethod: "Kuriér – SPS",
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
    shippingMethod: "Kuriér – Packeta",
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
    shippingMethod: "Kuriér – Packeta",
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
    shippingMethod: "Kuriér – SPS",
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
    shippingMethod: "Kuriér – Packeta",
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
    shippingMethod: "Kuriér – GLS",
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
    shippingMethod: "Kuriér – Packeta",
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
    shippingMethod: "Kuriér – SPS",
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
    shippingMethod: "Kuriér – Packeta",
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
    shippingMethod: "Kuriér – GLS",
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
    shippingMethod: "Kuriér – Packeta",
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
    shippingMethod: "Kuriér – SPS",
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
    shippingMethod: "Kuriér – Packeta",
    note: "Zákazník zrušil objednávku.",
  },
];

export function getOrderById(id: string) {
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

export function getOrdersForCustomerEmail(email: string): Order[] {
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
    .filter((order) =>
      ["nova", "pripravuje_sa", "zaplatena", "pripravena_na_odoslanie"].includes(
        order.status,
      ),
    )
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
