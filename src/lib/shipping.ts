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
    id: "packeta_address",
    label: "Packeta / Zásielkovňa - na adresu",
    description: "Doručenie na adresu z fakturačných údajov.",
    cost: 3.6,
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
  { id: "transfer", label: "Bankový prevod" },
  { id: "cod", label: "Dobierka" },
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
    })),
    notes: [
      `Pri objednávke nad ${FREE_SHIPPING_THRESHOLD} € môže byť doprava zadarmo.`,
      "Kurier: Packeta / Zásielkovňa (výdajné miesto, Z-BOX alebo doručenie na adresu).",
      "Osobný odber je po dohode na našej adrese.",
    ],
    reply_hint:
      "Odpovedzte BEZ markdownu a BEZ odrážok. Max 3–4 krátke súvislé vety. Vzor: „Doprava je cez Packetu / Zásielkovňu na výdajné miesto alebo Z-BOX od 2,30 €, prípadne na adresu od 3,60 €. Osobný odber po dohode je zadarmo. Nad 100 € môže byť doprava zadarmo. Platíte bankovým prevodom alebo na dobierku.“",
  };
}
