import type { Order } from "@/lib/orders";
import { formatPrice, parsePrice } from "@/lib/price";
import type { Product } from "@/lib/products";

const FALLBACK_LINES = [
  { name: "Hortenzia krémová", quantity: 2, unitPrice: "12,90 €", category: "Kvety" },
  { name: "Mini ruže ružové", quantity: 1, unitPrice: "8,50 €", category: "Kvety" },
  { name: "Gypsofilka biela", quantity: 3, unitPrice: "4,90 €", category: "Kvety" },
  { name: "Levanduľa krémová", quantity: 2, unitPrice: "6,90 €", category: "Kvety" },
  { name: "Mak bordový", quantity: 1, unitPrice: "7,50 €", category: "Kvety" },
] as const;

/** Mock objednávka pre náhľad UI (e-mail CTA /dev). */
export function buildMockPublicOrder(products: Product[] = []): Order {
  const picks = products.filter((p) => p.image).slice(0, 5);
  const items =
    picks.length > 0
      ? picks.map((product, index) => ({
          productId: product.id,
          name: product.name,
          quantity: index === 0 ? 2 : index === 2 ? 3 : 1,
          unitPrice: product.price,
        }))
      : FALLBACK_LINES.map((line, index) => ({
          productId: `mock-${index + 1}`,
          name: line.name,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        }));

  const subtotalEur = items.reduce(
    (sum, line) => sum + parsePrice(line.unitPrice) * line.quantity,
    0,
  );
  const discountEur = 5;
  const shippingEur = 3.99;
  const totalEur = Math.max(0, subtotalEur - discountEur) + shippingEur;

  return {
    id: "PD-2026-0042",
    status: "zaplatena",
    createdAt: "2026-08-27T14:32:00.000Z",
    createdAtLabel: "pred chvíľou",
    customer: {
      name: "Mária Nováková",
      email: "maria.novakova@email.sk",
      phone: "+421 905 123 456",
      street: "Hlavná 12",
      city: "Bratislava",
      zip: "811 01",
      country: "Slovensko",
    },
    items,
    shippingCost: formatPrice(shippingEur),
    paymentMethod: "Online platba kartou",
    shippingMethod: "Packeta / Zásielkovňa",
    shippingMethodId: "packeta_point",
    packetaPointName: "OC Aupark, Bratislava",
    promoCode: "KVETY5",
    subtotalEur,
    discountEur,
    totalEur,
    note: "Prosím, balenie ako darček.",
  };
}

export function isPublicOrderPreviewToken(token: string | undefined) {
  return token?.trim().toLowerCase() === "preview";
}

export function isPublicOrderPreviewNumber(orderNumber: string) {
  const n = orderNumber.trim().toUpperCase();
  return n === "NAHLED" || n === "PREVIEW" || n === "PD-PREVIEW";
}
