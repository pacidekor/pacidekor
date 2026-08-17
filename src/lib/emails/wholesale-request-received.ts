import { EMAIL_BRAND } from "@/lib/emails/brand";
import { emailDocumentHead, EMAIL_FONT_HEADING, EMAIL_FONT_SANS } from "@/lib/emails/document";
import type {
  EmailTemplate,
  WholesaleRequestReceivedEmailVars,
} from "@/lib/emails/types";
import { escapeHtml, firstNameFrom } from "@/lib/emails/utils";

/**
 * Informačný e-mail po odoslaní žiadosti o veľkoobchodnú registráciu.
 * Schválenie a prístup prídu samostatným e-mailom neskôr.
 */
export function buildWholesaleRequestReceivedEmail(
  vars: WholesaleRequestReceivedEmailVars,
): EmailTemplate {
  const siteUrl = (vars.siteUrl ?? EMAIL_BRAND.defaultSiteUrl).replace(
    /\/$/,
    "",
  );

  const rawName = vars.customerName.trim();
  const firstName = firstNameFrom(rawName);
  const company = vars.companyName?.trim() ?? "";

  const greeting = firstName
    ? `Dobrý deň, ${firstName},`
    : "Dobrý deň,";
  const safeGreeting = escapeHtml(greeting);
  const safeSite = escapeHtml(siteUrl);
  const safeCompany = company ? escapeHtml(company) : "";

  const subject = "Žiadosť o veľkoobchodnú registráciu sme prijali";
  const preheader =
    "Vašu žiadosť kontrolujeme. Po schválení vám pošleme potvrdzujúci e-mail.";

  const companyLine = company
    ? `Žiadosť pre firmu ${company} sme úspešne prijali.`
    : "Vašu žiadosť o veľkoobchodný účet sme úspešne prijali.";

  const text = [
    greeting,
    "",
    "ďakujeme za záujem o veľkoobchodnú spoluprácu s PACIDEKOR.",
    "",
    companyLine,
    "",
    "Žiadosť teraz skontrolujeme. Akonáhle ju schválime, pošleme vám e-mail s potvrdením a ďalšími informáciami.",
    "",
    "Dovtedy sa do veľkoobchodného účtu ešte nie je možné prihlásiť.",
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
                ďakujeme za záujem o veľkoobchodnú spoluprácu s PACIDEKOR.
              </p>
              <p style="margin:0 0 16px 0; color:${EMAIL_BRAND.muted};">
                ${
                  safeCompany
                    ? `Žiadosť pre firmu <strong style="color:${EMAIL_BRAND.ink};">${safeCompany}</strong> sme úspešne prijali.`
                    : "Vašu žiadosť o veľkoobchodný účet sme úspešne prijali."
                }
              </p>
              <p style="margin:0 0 16px 0; color:${EMAIL_BRAND.muted};">
                Žiadosť teraz skontrolujeme. Akonáhle ju schválime, pošleme vám e-mail s potvrdením a ďalšími informáciami.
              </p>
              <p style="margin:0 0 8px 0; color:${EMAIL_BRAND.muted};">
                Dovtedy sa do veľkoobchodného účtu ešte nie je možné prihlásiť.
              </p>
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
    id: "wholesale-request-received",
    subject,
    preheader,
    html,
    text,
  };
}
