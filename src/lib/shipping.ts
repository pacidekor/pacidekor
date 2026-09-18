export const FREE_SHIPPING_THRESHOLD = 100;

export const SHIPPING_OPTIONS = [
  {
    id: "packeta_point",
    label: "Packeta / Zásielkovňa - výdajné miesto",
    description: "Z-BOX alebo výdajné miesto podľa vášho výberu.",
    cost: 2.3,
    costFrom: true,
  },
  {
    id: "pickup",
    label: "Osobný odber",
    description: "Vyzdvihnutie u nás po dohode.",
    cost: 0,
    costFrom: false,
  },
] as const;

export const PAYMENT_OPTIONS = [
  {
    id: "card",
    label: "Online platba (GoPay)",
    description: "Karta alebo bankový prevod cez platobnú bránu GoPay.",
  },
  {
    id: "cod",
    label: "Dobierka",
    description: "Platba pri prevzatí zásielky (Packeta / Zásielkovňa).",
  },
] as const;

export type ShippingMethodId = (typeof SHIPPING_OPTIONS)[number]["id"];
export type PaymentMethodId = (typeof PAYMENT_OPTIONS)[number]["id"];

export function formatShippingCostLabel(
  option: (typeof SHIPPING_OPTIONS)[number],
) {
  if (option.cost === 0) return "Zadarmo";
  const formatted = option.cost.toFixed(2).replace(".", ",");
  return option.costFrom ? `od ${formatted} €` : `${formatted} €`;
}

/** Snapshot for chat / FAQ — always mirrors checkout options. */
export function getShippingInfoForChat() {
  return {
    freeShippingFromEur: FREE_SHIPPING_THRESHOLD,
    shipping: SHIPPING_OPTIONS.map((option) => ({
      id: option.id,
      label: option.label,
      description: option.description,
      costLabel: formatShippingCostLabel(option),
      costEur: option.cost,
    })),
    payment: PAYMENT_OPTIONS.map((option) => ({
      id: option.id,
      label: option.label,
      description: option.description,
    })),
    notes: [
      `Pri objednávke nad ${FREE_SHIPPING_THRESHOLD} € môže byť doprava zadarmo.`,
      "Kurier: Packeta / Zásielkovňa na výdajné miesto alebo Z-BOX.",
      "Osobný odber je po dohode na našej adrese.",
    ],
    reply_hint:
      "Odpovedzte BEZ markdownu a BEZ odrážok. Max 3–4 krátke súvislé vety. Vzor: „Doprava je cez Packetu / Zásielkovňu na výdajné miesto alebo Z-BOX od 2,30 €. Osobný odber po dohode je zadarmo. Nad 100 € môže byť doprava zadarmo. Platíte online cez GoPay (karta alebo banka) alebo na dobierku.“",
  };
}
