import { formatPrice, parsePrice } from "@/lib/cart";
import { products } from "@/lib/products";

export type OrderTemplateItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: string;
};

export type OrderTemplate = {
  id: string;
  customerId: string;
  name: string;
  note?: string;
  items: OrderTemplateItem[];
  updatedAtLabel: string;
};

export const ORDER_TEMPLATES_KEY = "pacidekor.order-templates";
export const ORDER_TEMPLATES_EVENT = "pacidekor:order-templates-changed";

function templateItem(
  productId: string,
  quantity: number,
): OrderTemplateItem {
  const product = products.find((p) => p.id === productId);
  return {
    productId,
    name: product?.name ?? `Produkt ${productId}`,
    quantity,
    unitPrice: product?.price ?? "0,00 €",
  };
}

const seedTemplates: OrderTemplate[] = [
  {
    id: "tpl-001",
    customerId: "c-003",
    name: "Týždenný sortiment",
    note: "Základná dodávka pre prevádzku.",
    items: [templateItem("9", 12), templateItem("5", 8), templateItem("7", 10)],
    updatedAtLabel: "pred 5 dňami",
  },
  {
    id: "tpl-002",
    customerId: "c-003",
    name: "Svadobný balík",
    note: "Biele a krémové odtiene.",
    items: [templateItem("1", 20), templateItem("2", 15), templateItem("6", 8)],
    updatedAtLabel: "pred 2 tými.",
  },
];

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ORDER_TEMPLATES_EVENT));
}

export function readOrderTemplates(): OrderTemplate[] {
  if (typeof window === "undefined") return seedTemplates;
  try {
    const raw = window.localStorage.getItem(ORDER_TEMPLATES_KEY);
    if (!raw) {
      window.localStorage.setItem(
        ORDER_TEMPLATES_KEY,
        JSON.stringify(seedTemplates),
      );
      return seedTemplates;
    }
    const parsed = JSON.parse(raw) as OrderTemplate[];
    if (!Array.isArray(parsed)) return seedTemplates;
    return parsed;
  } catch {
    return seedTemplates;
  }
}

export function writeOrderTemplates(list: OrderTemplate[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ORDER_TEMPLATES_KEY, JSON.stringify(list));
  notify();
}

export function getTemplatesForCustomer(customerId: string): OrderTemplate[] {
  return readOrderTemplates().filter((tpl) => tpl.customerId === customerId);
}

export function templateItemsSubtotal(template: OrderTemplate) {
  return template.items.reduce(
    (sum, line) => sum + parsePrice(line.unitPrice) * line.quantity,
    0,
  );
}

export function formatTemplateTotal(template: OrderTemplate) {
  return formatPrice(templateItemsSubtotal(template));
}

export function renameOrderTemplate(id: string, name: string): OrderTemplate[] {
  return updateOrderTemplate(id, { name });
}

export function updateOrderTemplate(
  id: string,
  patch: {
    name?: string;
    note?: string;
    items?: OrderTemplateItem[];
  },
): OrderTemplate[] {
  const next = readOrderTemplates().map((tpl) => {
    if (tpl.id !== id) return tpl;
    return {
      ...tpl,
      name:
        patch.name !== undefined ? patch.name.trim() || tpl.name : tpl.name,
      note:
        patch.note !== undefined
          ? patch.note.trim() || undefined
          : tpl.note,
      items: patch.items ?? tpl.items,
      updatedAtLabel: "práve teraz",
    };
  });
  writeOrderTemplates(next);
  return next;
}

export function deleteOrderTemplate(id: string): OrderTemplate[] {
  const next = readOrderTemplates().filter((tpl) => tpl.id !== id);
  writeOrderTemplates(next);
  return next;
}
