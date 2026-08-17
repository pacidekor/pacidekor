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
  siteUrl?: string;
  shopUrl?: string;
  accountUrl?: string;
};
