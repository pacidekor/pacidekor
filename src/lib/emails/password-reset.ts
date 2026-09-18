import { EMAIL_BRAND } from "@/lib/emails/brand";
import {
  emailDocumentHead,
  EMAIL_FONT_HEADING,
  EMAIL_FONT_SANS,
} from "@/lib/emails/document";
import type { EmailTemplate, PasswordResetEmailVars } from "@/lib/emails/types";
import {
  absolutize,
  escapeHtml,
  firstNameFrom,
} from "@/lib/emails/utils";

/**
 * E-mail po žiadosti o obnovenie hesla (zabudnuté heslo).
 * Odosiela sa cez Brevo s recovery linkom zo Supabase generateLink.
 */
export function buildPasswordResetEmail(
  vars: PasswordResetEmailVars,
): EmailTemplate {
  const siteUrl = (vars.siteUrl ?? EMAIL_BRAND.defaultSiteUrl).replace(
    /\/$/,
    "",
  );
  const resetUrl =
    vars.resetUrl ?? absolutize(siteUrl, "/obnova-hesla");

  const rawName = vars.customerName.trim();
  const firstName = firstNameFrom(rawName);

  const greeting = firstName
    ? `Dobrý deň, ${firstName},`
    : "Dobrý deň,";
  const safeGreeting = escapeHtml(greeting);
  const safeSite = escapeHtml(siteUrl);
  const safeResetUrl = escapeHtml(resetUrl);

  const subject = "Obnovenie hesla";
  const preheader =
    "Kliknite na odkaz a nastavte si nové heslo k účtu PACIDEKOR.";

  const text = [
    greeting,
    "",
    "dostali sme žiadosť o obnovenie hesla k vášmu účtu PACIDEKOR.",
    "",
    "Nové heslo nastavíte na tejto stránke:",
    resetUrl,
    "",
    "Ak ste o obnovenie hesla nežiadali, tento e-mail môžete ignorovať.",
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
                dostali sme žiadosť o obnovenie hesla k vášmu účtu PACIDEKOR.
              </p>
              <p style="margin:0 0 16px 0; color:${EMAIL_BRAND.muted};">
                Kliknite na tlačidlo nižšie a nastavte si nové heslo. Odkaz vás presmeruje na zabezpečenú stránku eshopu.
              </p>
            </td>
          </tr>

          <tr>
            <td class="email-pad" style="padding: 24px 36px 8px 36px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${safeResetUrl}" style="height:46px;v-text-anchor:middle;width:240px;" arcsize="16%" stroke="f" fillcolor="${EMAIL_BRAND.primary}">
                <w:anchorlock/>
                <center style="color:${EMAIL_BRAND.white};font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;">
                  Nastaviť nové heslo
                </center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-- -->
              <a href="${safeResetUrl}" style="display:inline-block; background-color:${EMAIL_BRAND.primary}; color:${EMAIL_BRAND.white}; font-family:${EMAIL_FONT_SANS}; font-size:15px; font-weight:600; line-height:46px; border-radius:12px; padding:0 24px;">
                Nastaviť nové heslo
              </a>
              <!--<![endif]-->
              <p style="margin:20px 0 0 0; font-family:${EMAIL_FONT_SANS}; font-size:13px; line-height:1.55; color:${EMAIL_BRAND.muted}; word-break:break-all;">
                Ak tlačidlo nefunguje, skopírujte tento odkaz do prehliadača:<br />
                <a href="${safeResetUrl}" style="color:${EMAIL_BRAND.primary}; text-decoration:underline;">${safeResetUrl}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td class="email-pad" style="padding: 24px 36px 8px 36px; font-family:${EMAIL_FONT_SANS}; font-size:14px; line-height:1.6; color:${EMAIL_BRAND.muted};">
              <p style="margin:0;">
                Ak ste o obnovenie hesla nežiadali, tento e-mail môžete ignorovať. Vaše heslo zostane nezmenené.
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
    id: "password-reset",
    subject,
    preheader,
    html,
    text,
  };
}
