export type EmailTemplate = {
  id: string;
  subject: string;
  preheader: string;
  html: string;
  text: string;
};

export type WelcomeRetailEmailVars = {
  customerName: string;
  /** Absolute site origin, e.g. https://pacidekor.sk */
  siteUrl?: string;
  shopUrl?: string;
  loginUrl?: string;
  supportEmail?: string;
  phone?: string;
};

export type WholesaleRequestReceivedEmailVars = {
  customerName: string;
  companyName?: string;
  siteUrl?: string;
};

export type WholesaleApprovedEmailVars = {
  customerName: string;
  companyName?: string;
  siteUrl?: string;
  loginUrl?: string;
  shopUrl?: string;
};

export type VerifyEmailCodeEmailVars = {
  customerName: string;
  code: string;
  siteUrl?: string;
};

export type PasswordResetEmailVars = {
  customerName: string;
  /** Absolute URL na stránku obnovy hesla (napr. /obnova-hesla + token). */
  resetUrl?: string;
  siteUrl?: string;
};

export type PasswordChangedEmailVars = {
  customerName: string;
  siteUrl?: string;
  loginUrl?: string;
  shopUrl?: string;
};

/** E-mail na pôvodnú adresu po zmene e-mailu v účte. */
export type EmailChangedOldEmailVars = {
  customerName: string;
  newEmail: string;
  siteUrl?: string;
};

/** E-mail na novú adresu po zmene e-mailu v účte. */
export type EmailChangedNewEmailVars = {
  customerName: string;
  newEmail: string;
  oldEmail?: string;
  siteUrl?: string;
  loginUrl?: string;
  shopUrl?: string;
};

export type NewsletterProductCard = {
  name: string;
  price: string;
  url: string;
  imageUrl?: string;
  originalPrice?: string;
  discountPercent?: number;
};

export type NewsletterEmailVars = {
  headline?: string;
  intro?: string;
  subject?: string;
  preheader?: string;
  customerName?: string;
  newProducts?: NewsletterProductCard[];
  saleProducts?: NewsletterProductCard[];
  siteUrl?: string;
  shopUrl?: string;
  novinkyUrl?: string;
  akciaUrl?: string;
  /** Placeholder, kým nebude tokenové odhlásenie. Default: /odhlasenie-newsletter */
  unsubscribeUrl?: string;
};

/** Narodeninový e-mail so zľavovým kódom (podľa dátumu narodenia v účte). */
export type BirthdayEmailVars = {
  customerName?: string;
  promoCode: string;
  discountPercent?: number;
  /** Platnosť kódu v dňoch (text v e-maile). Default 14. */
  validDays?: number;
  siteUrl?: string;
  shopUrl?: string;
  cartUrl?: string;
};

/** Objednávka odovzdaná dopravcovi (Packeta / Zásielkovňa). */
export type OrderHandedToCarrierEmailVars = {
  customerName?: string;
  orderNumber: string;
  /** Napr. „Packeta / Zásielkovňa - výdajné miesto“. */
  shippingMethod?: string;
  /** Signed link na detail objednávky. */
  orderUrl?: string;
  siteUrl?: string;
  shopUrl?: string;
  accountUrl?: string;
};

/** Objednávka doručená / pripravená na vyzdvihnutie. */
export type OrderDeliveredEmailVars = {
  customerName?: string;
  orderNumber: string;
  shippingMethod?: string;
  orderUrl?: string;
  /** Google Reviews / hodnotenie — ak chýba, CTA sa v e-maile nevykreslí. */
  reviewsUrl?: string;
  siteUrl?: string;
  shopUrl?: string;
};

/** Jedna položka v potvrdení zaplatenej objednávky. */
export type OrderPaidEmailItem = {
  name: string;
  quantity: number;
  /** Formátovaná jednotková cena, napr. „12,90 €“. */
  unitPrice: string;
  /** Formátovaná cena riadku (ks × cena), napr. „25,80 €“. */
  lineTotal: string;
  /** Voliteľný popis farby / variantu. */
  variant?: string;
};

/**
 * Potvrdenie po zaplatení / prijatí objednávky + súhrn nákupu.
 * Zatiaľ template; napojenie na platobný webhook / checkout neskôr.
 */
export type OrderPaidEmailVars = {
  customerName?: string;
  orderNumber: string;
  items: OrderPaidEmailItem[];
  /** Celkový počet položiek (ak je väčší ako items.length, e-mail ukáže „+ N ďalších“). */
  itemsTotalCount?: number;
  /** Formátovaný súčet položiek, napr. „89,70 €“. */
  subtotal: string;
  /** Formátovaná doprava, napr. „3,99 €“ alebo „Zadarmo“. */
  shippingCost: string;
  /** Celkom k úhrade / zaplatené. */
  total: string;
  paymentMethod?: string;
  shippingMethod?: string;
  /** Napr. „Packeta · OC Aupark Bratislava“. */
  deliveryLabel?: string;
  /** Formátovaná zľava (kladná suma), napr. „5,00 €“. */
  discount?: string;
  promoCode?: string;
  /** Signed link na detail objednávky. */
  orderUrl?: string;
  siteUrl?: string;
  shopUrl?: string;
  accountUrl?: string;
};
