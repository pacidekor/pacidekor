import { EMAIL_BRAND } from "@/lib/emails/brand";
import {
  emailDocumentHead,
  EMAIL_FONT_HEADING,
  EMAIL_FONT_SANS,
} from "@/lib/emails/document";
import type {
  EmailTemplate,
  OrderPaidEmailItem,
  OrderPaidEmailVars,
} from "@/lib/emails/types";
import {
  absolutize,
  escapeHtml,
  firstNameFrom,
} from "@/lib/emails/utils";

function itemRowHtml(item: OrderPaidEmailItem) {
  const name = escapeHtml(item.name.trim() || "Produkt");
  const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
  const unitPrice = escapeHtml(item.unitPrice.trim() || "-");
  const lineTotal = escapeHtml(item.lineTotal.trim() || unitPrice);
  const variant = item.variant?.trim()
    ? escapeHtml(item.variant.trim())
    : "";

  return `
              <tr>
                <td style="padding:12px 0; border-bottom:1px solid ${EMAIL_BRAND.border}; vertical-align:top;">
                  <p style="margin:0; font-family:${EMAIL_FONT_HEADING}; font-size:14px; line-height:1.4; font-weight:600; color:${EMAIL_BRAND.ink};">
                    ${name}
                  </p>
                  ${
                    variant
                      ? `<p style="margin:4px 0 0 0; font-family:${EMAIL_FONT_SANS}; font-size:12px; line-height:1.4; color:${EMAIL_BRAND.muted};">${variant}</p>`
                      : ""
                  }
                  <p style="margin:6px 0 0 0; font-family:${EMAIL_FONT_SANS}; font-size:12px; line-height:1.4; color:${EMAIL_BRAND.muted};">
                    ${qty}&nbsp;×&nbsp;${unitPrice}
                  </p>
                </td>
                <td align="right" style="padding:12px 0 12px 12px; border-bottom:1px solid ${EMAIL_BRAND.border}; vertical-align:top; white-space:nowrap;">
                  <p style="margin:0; font-family:${EMAIL_FONT_SANS}; font-size:14px; font-weight:600; color:${EMAIL_BRAND.ink};">
                    ${lineTotal}
                  </p>
                </td>
              </tr>`;
}

function summaryRowHtml(label: string, value: string, emphasize = false) {
  const safeLabel = escapeHtml(label);
  const safeValue = escapeHtml(value);
  const valueStyle = emphasize
    ? `font-family:${EMAIL_FONT_HEADING}; font-size:16px; font-weight:700; color:${EMAIL_BRAND.ink};`
    : `font-family:${EMAIL_FONT_SANS}; font-size:14px; font-weight:600; color:${EMAIL_BRAND.ink};`;
  const labelStyle = emphasize
    ? `font-family:${EMAIL_FONT_SANS}; font-size:14px; font-weight:600; color:${EMAIL_BRAND.ink};`
    : `font-family:${EMAIL_FONT_SANS}; font-size:14px; color:${EMAIL_BRAND.muted};`;
  const pad = emphasize ? "14px 0 0 0" : "6px 0";

  return `
                <tr>
                  <td style="padding:${pad}; ${labelStyle}">${safeLabel}</td>
                  <td align="right" style="padding:${pad}; white-space:nowrap; ${valueStyle}">${safeValue}</td>
                </tr>`;
}

/**
 * E-mail po zaplatení / prijatí objednávky so súhrnom nákupu.
 * Zatiaľ template; napojenie na checkout / platobný webhook neskôr.
 */
export function buildOrderPaidEmail(
  vars: OrderPaidEmailVars,
): EmailTemplate {
  const siteUrl = (vars.siteUrl ?? EMAIL_BRAND.defaultSiteUrl).replace(
    /\/$/,
    "",
  );
  const shopUrl = vars.shopUrl ?? siteUrl;
  const orderUrl =
    vars.orderUrl?.trim() || absolutize(siteUrl, `/objednavka/${encodeURIComponent(vars.orderNumber.trim() || "PD")}`);
  const orderNumber = vars.orderNumber.trim();
  const allItems = Array.isArray(vars.items) ? vars.items : [];
  const itemsTotalCount = Math.max(
    vars.itemsTotalCount ?? allItems.length,
    allItems.length,
  );
  const previewItems = allItems.slice(0, 3);
  const hiddenCount = Math.max(0, itemsTotalCount - previewItems.length);
  const paymentMethod = vars.paymentMethod?.trim() || "Online platba";
  const shippingMethod = vars.shippingMethod?.trim() || "Packeta / Zásielkovňa";
  const deliveryLabel = vars.deliveryLabel?.trim() || "";
  const discount = vars.discount?.trim() || "";
  const promoCode = vars.promoCode?.trim() || "";

  const firstName = firstNameFrom((vars.customerName ?? "").trim());
  const greeting = firstName ? `Dobrý deň, ${firstName},` : "Dobrý deň,";

  const safeGreeting = escapeHtml(greeting);
  const safeSite = escapeHtml(siteUrl);
  const safeShopUrl = escapeHtml(shopUrl);
  const safeOrderUrl = escapeHtml(orderUrl);
  const safeOrder = escapeHtml(orderNumber);
  const safePayment = escapeHtml(paymentMethod);
  const safeShipping = escapeHtml(shippingMethod);
  const safeDelivery = escapeHtml(deliveryLabel);
  const safeSubtotal = escapeHtml(vars.subtotal.trim() || "-");
  const safeShippingCost = escapeHtml(vars.shippingCost.trim() || "-");
  const safeTotal = escapeHtml(vars.total.trim() || "-");

  const subject = orderNumber
    ? `Objednávka ${orderNumber} je zaplatená`
    : "Objednávka je zaplatená";
  const preheader = orderNumber
    ? `Ďakujeme. Objednávku ${orderNumber} sme prijali a platba prebehla úspešne.`
    : "Ďakujeme. Objednávku sme prijali a platba prebehla úspešne.";

  const moreRowHtml =
    hiddenCount > 0
      ? `
              <tr>
                <td colspan="2" style="padding:14px 0 4px 0; font-family:${EMAIL_FONT_SANS}; font-size:13px; color:${EMAIL_BRAND.muted};">
                  + ${hiddenCount} ďalších produktov ·
                  <a href="${safeOrderUrl}" style="color:${EMAIL_BRAND.primary}; text-decoration:underline;">
                    zobraziť celú objednávku
                  </a>
                </td>
              </tr>`
      : "";

  const itemsHtml =
    previewItems.length > 0
      ? previewItems.map((item) => itemRowHtml(item)).join("") + moreRowHtml
      : `
              <tr>
                <td colspan="2" style="padding:12px 0; font-family:${EMAIL_FONT_SANS}; font-size:14px; color:${EMAIL_BRAND.muted};">
                  Žiadne položky
                </td>
              </tr>`;

  const textItems = previewItems
    .map((item) => {
      const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
      const variant = item.variant?.trim() ? ` (${item.variant.trim()})` : "";
      return `- ${item.name}${variant}: ${qty} × ${item.unitPrice} = ${item.lineTotal}`;
    })
    .join("\n");

  const text = [
    greeting,
    "",
    orderNumber
      ? `ďakujeme za nákup. Objednávku ${orderNumber} sme prijali a platba prebehla úspešne.`
      : "ďakujeme za nákup. Objednávku sme prijali a platba prebehla úspešne.",
    "",
    "Súhrn objednávky:",
    textItems || "- (bez položiek)",
    hiddenCount > 0 ? `+ ${hiddenCount} ďalších produktov` : null,
    "",
    `Medzisúčet: ${vars.subtotal}`,
    discount
      ? `Zľava${promoCode ? ` (${promoCode})` : ""}: -${discount}`
      : null,
    `Doprava (${shippingMethod}): ${vars.shippingCost}`,
    `Celkom: ${vars.total}`,
    "",
    `Platba: ${paymentMethod}`,
    deliveryLabel ? `Doručenie: ${deliveryLabel}` : null,
    "",
    "Objednávku teraz pripravíme na odoslanie. O odovzdaní dopravcovi vás budeme informovať samostatným e-mailom.",
    "",
    `Detail objednávky: ${orderUrl}`,
    `Prejsť do obchodu: ${shopUrl}`,
    "",
    "S pozdravom",
    "PACIDEKOR",
    siteUrl,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="sk" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  ${emailDocumentHead(escapeHtml(subject))}
</head>
<body style="margin:0; padding:0; width:100%; background-color:${EMAIL_BRAND.soft};">
  <div style="display:none; font-size:1px; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden; mso-hide:all;">
    ${escapeHtml(preheader)}
    &#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${EMAIL_BRAND.soft};">
    <tr>
      <td align="center" style="padding: 32px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" class="email-shell" style="width:560px; max-width:560px; background-color:${EMAIL_BRAND.white}; border-radius:16px; overflow:hidden; border:1px solid ${EMAIL_BRAND.border};">

          <tr>
            <td class="email-pad" style="padding: 28px 36px 20px 36px; background-color:${EMAIL_BRAND.white}; border-bottom:1px solid ${EMAIL_BRAND.border};">
              <p style="margin:0; font-family:${EMAIL_FONT_HEADING}; font-size:18px; font-weight:700; letter-spacing:0.04em; color:${EMAIL_BRAND.ink};">
                ${EMAIL_BRAND.name}
              </p>
            </td>
          </tr>

          <tr>
            <td class="email-pad" style="padding: 36px 36px 8px 36px; background-color:${EMAIL_BRAND.white};">
              <p style="margin:0 0 12px 0; font-family:${EMAIL_FONT_SANS}; font-size:16px; line-height:1.55; color:${EMAIL_BRAND.ink};">
                ${safeGreeting}
              </p>
              <h1 class="email-hero" style="margin:0; font-family:${EMAIL_FONT_HEADING}; font-size:26px; line-height:1.3; color:${EMAIL_BRAND.ink}; font-weight:700;">
                Objednávka je zaplatená
              </h1>
            </td>
          </tr>

          <tr>
            <td class="email-pad" style="padding: 16px 36px 8px 36px; font-family:${EMAIL_FONT_SANS}; font-size:16px; line-height:1.65; color:${EMAIL_BRAND.ink};">
              <p style="margin:0 0 16px 0; color:${EMAIL_BRAND.muted};">
                ${
                  safeOrder
                    ? `ďakujeme za nákup. Objednávku <strong style="color:${EMAIL_BRAND.ink};">${safeOrder}</strong> sme prijali a platba prebehla úspešne.`
                    : "ďakujeme za nákup. Objednávku sme prijali a platba prebehla úspešne."
                }
              </p>
              <p style="margin:0 0 8px 0; color:${EMAIL_BRAND.muted};">
                Objednávku teraz pripravíme na odoslanie. O odovzdaní dopravcovi
                vás budeme informovať samostatným e-mailom.
              </p>
            </td>
          </tr>

          <tr>
            <td class="email-pad" style="padding: 20px 36px 8px 36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%; background-color:${EMAIL_BRAND.soft}; border-radius:14px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 8px 0; font-family:${EMAIL_FONT_SANS}; font-size:12px; letter-spacing:0.04em; text-transform:uppercase; color:${EMAIL_BRAND.muted};">
                      Detaily
                    </p>
                    ${
                      safeOrder
                        ? `<p style="margin:0 0 6px 0; font-family:${EMAIL_FONT_SANS}; font-size:14px; color:${EMAIL_BRAND.muted};">Číslo objednávky: <strong style="color:${EMAIL_BRAND.ink};">${safeOrder}</strong></p>`
                        : ""
                    }
                    <p style="margin:0 0 6px 0; font-family:${EMAIL_FONT_SANS}; font-size:14px; color:${EMAIL_BRAND.muted};">
                      Platba: <strong style="color:${EMAIL_BRAND.ink};">${safePayment}</strong>
                    </p>
                    <p style="margin:0 0 ${safeDelivery ? "6px" : "0"} 0; font-family:${EMAIL_FONT_SANS}; font-size:14px; color:${EMAIL_BRAND.muted};">
                      Doprava: <strong style="color:${EMAIL_BRAND.ink};">${safeShipping}</strong>
                    </p>
                    ${
                      safeDelivery
                        ? `<p style="margin:0; font-family:${EMAIL_FONT_SANS}; font-size:14px; color:${EMAIL_BRAND.muted};">Doručenie: <strong style="color:${EMAIL_BRAND.ink};">${safeDelivery}</strong></p>`
                        : ""
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="email-pad" style="padding: 28px 36px 8px 36px;">
              <p style="margin:0 0 12px 0; font-family:${EMAIL_FONT_HEADING}; font-size:18px; font-weight:700; color:${EMAIL_BRAND.ink};">
                Súhrn nákupu
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
                ${itemsHtml}
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%; margin-top:8px;">
                ${summaryRowHtml("Medzisúčet", safeSubtotal)}
                ${
                  discount
                    ? summaryRowHtml(
                        promoCode ? `Zľava (${promoCode})` : "Zľava",
                        `-${escapeHtml(discount)}`,
                      )
                    : ""
                }
                ${summaryRowHtml("Doprava", safeShippingCost)}
                ${summaryRowHtml("Celkom", safeTotal, true)}
              </table>
            </td>
          </tr>

          <tr>
            <td class="email-pad" style="padding: 24px 36px 8px 36px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${safeOrderUrl}" style="height:46px;v-text-anchor:middle;width:240px;" arcsize="16%" stroke="f" fillcolor="${EMAIL_BRAND.primary}">
                <w:anchorlock/>
                <center style="color:${EMAIL_BRAND.white};font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;">
                  Zobraziť detail objednávky
                </center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-- -->
              <a href="${safeOrderUrl}" style="display:inline-block; background-color:${EMAIL_BRAND.primary}; color:${EMAIL_BRAND.white}; font-family:${EMAIL_FONT_SANS}; font-size:15px; font-weight:600; line-height:46px; border-radius:12px; padding:0 24px; margin:0 10px 10px 0;">
                Zobraziť detail objednávky
              </a>
              <!--<![endif]-->
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${safeShopUrl}" style="height:46px;v-text-anchor:middle;width:180px;" arcsize="16%" stroke="${EMAIL_BRAND.border}" fillcolor="${EMAIL_BRAND.white}">
                <w:anchorlock/>
                <center style="color:${EMAIL_BRAND.ink};font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;">
                  Prejsť do obchodu
                </center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-- -->
              <a href="${safeShopUrl}" style="display:inline-block; background-color:${EMAIL_BRAND.white}; color:${EMAIL_BRAND.ink}; font-family:${EMAIL_FONT_SANS}; font-size:15px; font-weight:600; line-height:44px; border-radius:12px; padding:0 24px; border:1px solid ${EMAIL_BRAND.border}; margin:0 0 10px 0;">
                Prejsť do obchodu
              </a>
              <!--<![endif]-->
            </td>
          </tr>

          <tr>
            <td class="email-pad" style="padding: 28px 36px 36px 36px; font-family:${EMAIL_FONT_SANS}; font-size:15px; line-height:1.6; color:${EMAIL_BRAND.muted};">
              <p style="margin:0 0 4px 0;">S pozdravom</p>
              <p style="margin:0; color:${EMAIL_BRAND.ink}; font-weight:600;">PACIDEKOR</p>
            </td>
          </tr>

          <tr>
            <td class="email-pad" style="background-color:${EMAIL_BRAND.white}; padding: 20px 36px 28px 36px; border-top:1px solid ${EMAIL_BRAND.border};">
              <p style="margin:0; font-family:${EMAIL_FONT_SANS}; font-size:12px; line-height:1.5; color:rgba(47,41,36,0.45);">
                © ${new Date().getFullYear()}
                <a href="${safeSite}" style="color:rgba(47,41,36,0.55); text-decoration:underline;">PACIDEKOR</a>
              </p>
            </td>
          </tr>

        </table>

        <p style="margin:16px 0 0 0; font-family:${EMAIL_FONT_SANS}; font-size:11px; color:rgba(47,41,36,0.4); text-align:center;">
          Tento e-mail bol odoslaný automaticky. Prosím, neodpovedajte naň.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    id: "order-paid",
    subject,
    preheader,
    html,
    text,
  };
}
