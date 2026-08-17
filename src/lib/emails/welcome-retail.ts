import { EMAIL_BRAND } from "@/lib/emails/brand";
import { emailDocumentHead, EMAIL_FONT_HEADING, EMAIL_FONT_SANS } from "@/lib/emails/document";
import type { EmailTemplate, WelcomeRetailEmailVars } from "@/lib/emails/types";
import {
  absolutize,
  escapeHtml,
  firstNameFrom,
} from "@/lib/emails/utils";

/**
 * Welcome e-mail po úspešnej registrácii maloobchodného účtu
 * (automaticky schválený). Zatiaľ len template, odosielanie napojíme neskôr.
 */
export function buildWelcomeRetailEmail(
  vars: WelcomeRetailEmailVars,
): EmailTemplate {
  const siteUrl = (vars.siteUrl ?? EMAIL_BRAND.defaultSiteUrl).replace(
    /\/$/,
    "",
  );
  const shopUrl = vars.shopUrl ?? siteUrl;
  const loginUrl = vars.loginUrl ?? absolutize(siteUrl, "/prihlasenie");
  const supportEmail = vars.supportEmail ?? EMAIL_BRAND.supportEmail;
  const phone = vars.phone ?? EMAIL_BRAND.phone;

  const rawName = vars.customerName.trim();
  const firstName = firstNameFrom(rawName);
  const greeting = firstName
    ? `Dobrý deň, ${firstName},`
    : "Dobrý deň,";
  const safeGreeting = escapeHtml(greeting);
  const safeShopUrl = escapeHtml(shopUrl);
  const safeLoginUrl = escapeHtml(loginUrl);
  const safeSite = escapeHtml(siteUrl);

  const subject = firstName
    ? `${firstName}, vitajte v PACIDEKOR`
    : "Vitajte v PACIDEKOR";

  const preheader =
    "Váš účet je aktívny. Môžete sa prihlásiť a začať nakupovať.";

  const text = [
    greeting,
    "",
    "ďakujeme za registráciu. Teší nás, že ste si vybrali práve PACIDEKOR.",
    "",
    "Váš účet je aktívny. Môžete si ukladať obľúbené produkty, sledovať objednávky a nakupovať pohodlnejšie.",
    "",
    `Prihlásiť sa: ${loginUrl}`,
    `Prejsť do obchodu: ${shopUrl}`,
    "",
    "Ak budete niečo potrebovať, napíšte nám alebo zavolajte:",
    supportEmail,
    phone,
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
              <h1 class="email-hero" style="margin:0; font-family:${EMAIL_FONT_HEADING}; font-size:28px; line-height:1.3; color:${EMAIL_BRAND.ink}; font-weight:700;">
                ${safeGreeting}
              </h1>
            </td>
          </tr>

          <tr>
            <td class="email-pad" style="padding: 16px 36px 8px 36px; font-family:${EMAIL_FONT_SANS}; font-size:16px; line-height:1.65; color:${EMAIL_BRAND.ink};">
              <p style="margin:0 0 16px 0;">
                ďakujeme za registráciu. Teší nás, že ste si vybrali práve PACIDEKOR.
              </p>
              <p style="margin:0 0 8px 0; color:${EMAIL_BRAND.muted};">
                Váš účet je aktívny. Môžete si ukladať obľúbené produkty, sledovať objednávky a nakupovať pohodlnejšie.
              </p>
            </td>
          </tr>

          <tr>
            <td class="email-pad" style="padding: 24px 36px 8px 36px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${safeLoginUrl}" style="height:46px;v-text-anchor:middle;width:200px;" arcsize="16%" stroke="f" fillcolor="${EMAIL_BRAND.primary}">
                <w:anchorlock/>
                <center style="color:${EMAIL_BRAND.white};font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;">
                  Prihlásiť sa
                </center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-- -->
              <a href="${safeLoginUrl}" style="display:inline-block; background-color:${EMAIL_BRAND.primary}; color:${EMAIL_BRAND.white}; font-family:${EMAIL_FONT_SANS}; font-size:15px; font-weight:600; line-height:46px; border-radius:12px; padding:0 24px; margin:0 10px 10px 0;">
                Prihlásiť sa
              </a>
              <!--<![endif]-->
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${safeShopUrl}" style="height:46px;v-text-anchor:middle;width:200px;" arcsize="16%" stroke="${EMAIL_BRAND.border}" fillcolor="${EMAIL_BRAND.white}">
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
    id: "welcome-retail",
    subject,
    preheader,
    html,
    text,
  };
}
