import { buildWelcomeRetailEmail } from "@/lib/emails/welcome-retail";
import { buildWholesaleApprovedEmail } from "@/lib/emails/wholesale-approved";
import { buildWholesaleRequestReceivedEmail } from "@/lib/emails/wholesale-request-received";
import { buildVerifyEmailCodeEmail } from "@/lib/emails/verify-email-code";
import { buildPasswordResetEmail } from "@/lib/emails/password-reset";
import { buildPasswordChangedEmail } from "@/lib/emails/password-changed";
import {
  buildEmailChangedNewEmail,
  buildEmailChangedOldEmail,
} from "@/lib/emails/email-changed";
import { buildNewsletterEmail } from "@/lib/emails/newsletter";
import { buildBirthdayEmail } from "@/lib/emails/birthday";
import { buildOrderDeliveredEmail } from "@/lib/emails/order-delivered";
import { buildOrderHandedToCarrierEmail } from "@/lib/emails/order-handed-to-carrier";
import { buildOrderPaidEmail } from "@/lib/emails/order-paid";
import type {
  EmailTemplate,
  NewsletterProductCard,
} from "@/lib/emails/types";
import { EMAIL_BRAND } from "@/lib/emails/brand";
import { DEV_EMAIL_VERIFY_CODE } from "@/lib/email-verification";

export type EmailPreviewContext = {
  newsletter?: {
    newProducts: NewsletterProductCard[];
    saleProducts: NewsletterProductCard[];
  };
};

export type EmailPreviewDefinition = {
  id: string;
  label: string;
  description: string;
  trigger: string;
  build: (siteUrl: string, ctx?: EmailPreviewContext) => EmailTemplate;
};

export const emailPreviewCatalog: EmailPreviewDefinition[] = [
  {
    id: "welcome-retail",
    label: "Vitajte (maloobchod)",
    description: "Uvítací e-mail po úspešnej registrácii maloobchodného účtu.",
    trigger: "Po vytvorení maloobchodného účtu (automaticky schválený)",
    build: (siteUrl) =>
      buildWelcomeRetailEmail({
        customerName: "Mária Nováková",
        siteUrl,
        supportEmail: EMAIL_BRAND.supportEmail,
        phone: EMAIL_BRAND.phone,
      }),
  },
  {
    id: "wholesale-request-received",
    label: "Žiadosť odoslaná (veľkoobchod)",
    description:
      "Potvrdenie, že žiadosť o veľkoobchodnú registráciu bola prijatá.",
    trigger: "Po odoslaní žiadosti o veľkoobchodný účet",
    build: (siteUrl) =>
      buildWholesaleRequestReceivedEmail({
        customerName: "Peter Kováč",
        companyName: "Kvetinový ateliér s.r.o.",
        siteUrl,
      }),
  },
  {
    id: "wholesale-approved",
    label: "Účet schválený (veľkoobchod)",
    description: "Potvrdenie schválenia veľkoobchodného účtu.",
    trigger: "Po schválení veľkoobchodnej registrácie administrátorom",
    build: (siteUrl) =>
      buildWholesaleApprovedEmail({
        customerName: "Peter Kováč",
        companyName: "Kvetinový ateliér s.r.o.",
        siteUrl,
      }),
  },
  {
    id: "verify-email-code",
    label: "Overenie e-mailu",
    description: "E-mail s 5-miestnym overovacím kódom po registrácii.",
    trigger: "Po odoslaní registrácie (maloobchod aj veľkoobchod)",
    build: (siteUrl) =>
      buildVerifyEmailCodeEmail({
        customerName: "Mária Nováková",
        code: DEV_EMAIL_VERIFY_CODE,
        siteUrl,
      }),
  },
  {
    id: "password-reset",
    label: "Obnovenie hesla",
    description:
      "E-mail s odkazom na nastavenie nového hesla po žiadosti o obnovu.",
    trigger: "Po odoslaní formulára Zabudnuté heslo",
    build: (siteUrl) =>
      buildPasswordResetEmail({
        customerName: "Mária Nováková",
        siteUrl,
        resetUrl: `${siteUrl.replace(/\/$/, "")}/obnova-hesla`,
      }),
  },
  {
    id: "password-changed",
    label: "Heslo zmenené",
    description: "Potvrdenie, že heslo k účtu bolo úspešne zmenené.",
    trigger: "Po úspešnom uložení nového hesla (obnova alebo zmena v účte)",
    build: (siteUrl) =>
      buildPasswordChangedEmail({
        customerName: "Mária Nováková",
        siteUrl,
      }),
  },
  {
    id: "email-changed-old",
    label: "Zmena e-mailu (starý)",
    description:
      "Informácia na pôvodnú adresu, že účet bol presunutý na nový e-mail.",
    trigger: "Po zmene e-mailu v nastavení účtu (odoslané na starý e-mail)",
    build: (siteUrl) =>
      buildEmailChangedOldEmail({
        customerName: "Mária Nováková",
        newEmail: "maria.nova@email.sk",
        siteUrl,
      }),
  },
  {
    id: "email-changed-new",
    label: "Zmena e-mailu (nový)",
    description:
      "Potvrdenie na novú adresu, že e-mail k účtu bol úspešne zmenený.",
    trigger: "Po zmene e-mailu v nastavení účtu (odoslané na nový e-mail)",
    build: (siteUrl) =>
      buildEmailChangedNewEmail({
        customerName: "Mária Nováková",
        oldEmail: "maria@email.sk",
        newEmail: "maria.nova@email.sk",
        siteUrl,
      }),
  },
  {
    id: "newsletter",
    label: "Newsletter",
    description:
      "Pravidelný B2C newsletter: novinky a akcie ako kompaktné karty.",
    trigger: "Každých 14 dní, ak je obsah (novinky / akcie / sezónny text)",
    build: (siteUrl, ctx) =>
      buildNewsletterEmail({
        customerName: "Mária Nováková",
        headline: "Novinky a akcie z PACIDEKOR",
        intro:
          "pripravili sme pre vás výber nových produktov a aktuálnych akcií.",
        siteUrl,
        newProducts: ctx?.newsletter?.newProducts ?? [],
        saleProducts: ctx?.newsletter?.saleProducts ?? [],
      }),
  },
  {
    id: "birthday",
    label: "Narodeniny",
    description:
      "Narodeninový e-mail so zľavovým kódom pre zákazníkov s dátumom narodenia.",
    trigger: "V deň narodenín (ak je v účte vyplnený dátum narodenia)",
    build: (siteUrl) =>
      buildBirthdayEmail({
        customerName: "Mária Nováková",
        promoCode: "NARODENINY10",
        discountPercent: 10,
        validDays: 14,
        siteUrl,
      }),
  },
  {
    id: "order-paid",
    label: "Objednávka zaplatená",
    description:
      "Potvrdenie po úspešnej platbe so súhrnom položiek, dopravy a celkovej sumy.",
    trigger: "Po úspešnom zaplatení objednávky (checkout / platobný webhook)",
    build: (siteUrl) =>
      buildOrderPaidEmail({
        customerName: "Mária Nováková",
        orderNumber: "PD-2026-0042",
        items: [
          {
            name: "Hortenzia krémová",
            quantity: 2,
            unitPrice: "12,90 €",
            lineTotal: "25,80 €",
            variant: "Krémová",
          },
          {
            name: "Mini ruže ružové - zväzok",
            quantity: 1,
            unitPrice: "8,50 €",
            lineTotal: "8,50 €",
          },
          {
            name: "Gypsofilka biela",
            quantity: 3,
            unitPrice: "4,90 €",
            lineTotal: "14,70 €",
            variant: "Biela",
          },
          {
            name: "Levanduľa krémová",
            quantity: 2,
            unitPrice: "6,90 €",
            lineTotal: "13,80 €",
          },
          {
            name: "Mak bordový",
            quantity: 1,
            unitPrice: "7,50 €",
            lineTotal: "7,50 €",
          },
        ],
        itemsTotalCount: 8,
        subtotal: "49,00 €",
        discount: "5,00 €",
        promoCode: "KVETY5",
        shippingCost: "3,99 €",
        total: "47,99 €",
        paymentMethod: "Online platba kartou",
        shippingMethod: "Packeta / Zásielkovňa - výdajné miesto",
        deliveryLabel: "OC Aupark, Bratislava",
        orderUrl: `${siteUrl.replace(/\/$/, "")}/objednavka/nahled?t=preview`,
        siteUrl,
      }),
  },
  {
    id: "order-handed-to-carrier",
    label: "Objednávka u dopravcu",
    description:
      "Objednávka je pripravená a odovzdaná dopravcovi (Packeta / Zásielkovňa).",
    trigger:
      "Automaticky po Packeta webhooku (zásielka prijatá / na ceste) — stav „Predaná dopravcovi“",
    build: (siteUrl) =>
      buildOrderHandedToCarrierEmail({
        customerName: "Mária Nováková",
        orderNumber: "PD-2026-0042",
        shippingMethod: "Packeta / Zásielkovňa - výdajné miesto",
        orderUrl: `${siteUrl.replace(/\/$/, "")}/objednavka/nahled?t=preview`,
        siteUrl,
      }),
  },
  {
    id: "order-delivered",
    label: "Objednávka doručená",
    description:
      "Zásielka je doručená / pripravená na vyzdvihnutie + CTA na Google Reviews.",
    trigger:
      "Automaticky po Packeta webhooku (doručené / ready for pickup) — stav „Doručená“",
    build: (siteUrl) =>
      buildOrderDeliveredEmail({
        customerName: "Mária Nováková",
        orderNumber: "PD-2026-0042",
        shippingMethod: "Packeta / Zásielkovňa - výdajné miesto",
        orderUrl: `${siteUrl.replace(/\/$/, "")}/objednavka/nahled?t=preview`,
        reviewsUrl:
          process.env.NEXT_PUBLIC_GOOGLE_REVIEWS_URL?.trim() ||
          "https://g.page/r/preview",
        siteUrl,
      }),
  },
];

export function getEmailPreviewById(id: string) {
  return emailPreviewCatalog.find((item) => item.id === id) ?? null;
}
