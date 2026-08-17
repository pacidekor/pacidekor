import { EMAIL_BRAND } from "@/lib/emails/brand";
import {
  emailDocumentHead,
  EMAIL_FONT_HEADING,
  EMAIL_FONT_SANS,
} from "@/lib/emails/document";
import type {
  BirthdayEmailVars,
  EmailTemplate,
} from "@/lib/emails/types";
import {
  absolutize,
  escapeHtml,
  firstNameFrom,
} from "@/lib/emails/utils";

/**
 * Narodeninový marketingový e-mail so zľavovým kódom.
 * Odosielanie na dátum narodenia napojíme neskôr.
 */
export function buildBirthdayEmail(vars: BirthdayEmailVars): EmailTemplate {
  const siteUrl = (vars.siteUrl ?? EMAIL_BRAND.defaultSiteUrl).replace(
    /\/$/,
    "",
  );
  const shopUrl = vars.shopUrl ?? siteUrl;
  const cartUrl = vars.cartUrl ?? absolutize(siteUrl, "/kosik");
  const code = vars.promoCode.trim().toUpperCase();
  const discountPercent = vars.discountPercent ?? 10;
  const validDays = vars.validDays ?? 14;

  const firstName = firstNameFrom((vars.customerName ?? "").trim());
  const greeting = firstName ? `Dobrý deň, ${firstName},` : "Dobrý deň,";

  const safeGreeting = escapeHtml(greeting);
  const safeSite = escapeHtml(siteUrl);
  const safeShopUrl = escapeHtml(shopUrl);
  const safeCartUrl = escapeHtml(cartUrl);
  const safeCode = escapeHtml(code);

  const subject = firstName
    ? `${firstName}, všetko najlepšie k narodeninám`
    : "Všetko najlepšie k narodeninám";
  const preheader = `K narodeninám máte zľavový kód ${code} na nákup v PACIDEKOR.`;

  const text = [
    greeting,
    "",
    "všetko najlepšie k narodeninám!",
    "",
    `Pripravili sme pre vás zľavu ${discountPercent} % na nákup v našom eshope.`,
    `Zľavový kód: ${code}`,
    "",
    `Kód zadáte v košíku. Platí ${validDays} dní od dnešného dňa.`,
    "",
    `Prejsť do obchodu: ${shopUrl}`,
    `Košík: ${cartUrl}`,
    "",
    "S pozdravom",
    "PACIDEKOR",
    siteUrl,
  ].join("\n");

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
              <h1 class="email-hero" style="margin:0; font-family:${EMAIL_FONT_HEADING}; font-size:28px; line-height:1.3; color:${EMAIL_BRAND.ink}; font-weight:700;">
                Všetko najlepšie k narodeninám
              </h1>
            </td>
          </tr>

          <tr>
            <td class="email-pad" style="padding: 16px 36px 8px 36px; font-family:${EMAIL_FONT_SANS}; font-size:16px; line-height:1.65; color:${EMAIL_BRAND.ink};">
              <p style="margin:0 0 16px 0; color:${EMAIL_BRAND.muted};">
                Prajeme vám krásny deň. Ako malý darček od PACIDEKOR máte zľavu
                <strong style="color:${EMAIL_BRAND.ink};">${discountPercent}&nbsp;%</strong>
                na nákup v eshope. Váš zľavový kód:
              </p>
            </td>
          </tr>

          <tr>
            <td class="email-pad" align="center" style="padding: 8px 36px 8px 36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background-color:${EMAIL_BRAND.soft}; border-radius:14px;">
                <tr>
                  <td style="padding: 22px 36px; font-family:${EMAIL_FONT_HEADING}; font-size:28px; line-height:1; letter-spacing:0.12em; font-weight:700; color:${EMAIL_BRAND.ink}; text-align:center;">
                    ${safeCode}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="email-pad" style="padding: 20px 36px 8px 36px; font-family:${EMAIL_FONT_SANS}; font-size:15px; line-height:1.6; color:${EMAIL_BRAND.muted};">
              <p style="margin:0;">
                Kód zadáte v košíku. Platí ${validDays} dní od dnešného dňa.
              </p>
            </td>
          </tr>

          <tr>
            <td class="email-pad" style="padding: 24px 36px 8px 36px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${safeShopUrl}" style="height:46px;v-text-anchor:middle;width:200px;" arcsize="16%" stroke="f" fillcolor="${EMAIL_BRAND.primary}">
                <w:anchorlock/>
                <center style="color:${EMAIL_BRAND.white};font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;">
                  Prejsť do obchodu
                </center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-- -->
              <a href="${safeShopUrl}" style="display:inline-block; background-color:${EMAIL_BRAND.primary}; color:${EMAIL_BRAND.white}; font-family:${EMAIL_FONT_SANS}; font-size:15px; font-weight:600; line-height:46px; border-radius:12px; padding:0 24px; margin:0 10px 10px 0;">
                Prejsť do obchodu
              </a>
              <!--<![endif]-->
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${safeCartUrl}" style="height:46px;v-text-anchor:middle;width:180px;" arcsize="16%" stroke="${EMAIL_BRAND.border}" fillcolor="${EMAIL_BRAND.white}">
                <w:anchorlock/>
                <center style="color:${EMAIL_BRAND.ink};font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;">
                  Prejsť do košíka
                </center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-- -->
              <a href="${safeCartUrl}" style="display:inline-block; background-color:${EMAIL_BRAND.white}; color:${EMAIL_BRAND.ink}; font-family:${EMAIL_FONT_SANS}; font-size:15px; font-weight:600; line-height:44px; border-radius:12px; padding:0 24px; border:1px solid ${EMAIL_BRAND.border}; margin:0 0 10px 0;">
                Prejsť do košíka
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
    id: "birthday",
    subject,
    preheader,
    html,
    text,
  };
}
