import { EMAIL_BRAND } from "@/lib/emails/brand";
import {
  emailDocumentHead,
  EMAIL_FONT_HEADING,
  EMAIL_FONT_SANS,
} from "@/lib/emails/document";
import type {
  EmailTemplate,
  NewsletterEmailVars,
  NewsletterProductCard,
} from "@/lib/emails/types";
import { absolutize, escapeHtml, firstNameFrom } from "@/lib/emails/utils";

const MAX_NEW = 3;
const MAX_SALE = 3;

function limitProducts(
  newProducts: NewsletterProductCard[],
  saleProducts: NewsletterProductCard[],
) {
  return {
    news: newProducts.slice(0, MAX_NEW),
    sales: saleProducts.slice(0, MAX_SALE),
  };
}

function priceBlock(product: NewsletterProductCard) {
  const price = escapeHtml(product.price);
  if (product.originalPrice && product.discountPercent) {
    return `<p style="margin:4px 0 0 0; font-family:${EMAIL_FONT_SANS}; font-size:13px; line-height:1.4;">
      <span style="color:${EMAIL_BRAND.ink}; font-weight:700;">${price}</span>
      <span style="margin-left:6px; color:rgba(47,41,36,0.4); text-decoration:line-through; font-size:12px;">${escapeHtml(product.originalPrice)}</span>
      <span style="margin-left:4px; color:${EMAIL_BRAND.primary}; font-weight:600; font-size:12px;">-${escapeHtml(String(product.discountPercent))}%</span>
    </p>`;
  }
  return `<p style="margin:4px 0 0 0; font-family:${EMAIL_FONT_SANS}; font-size:13px; line-height:1.4; color:${EMAIL_BRAND.ink}; font-weight:700;">
    ${price}
  </p>`;
}

/** Kompaktná horizontálna karta: náhľad vľavo, text vpravo. */
function productCardHtml(product: NewsletterProductCard, siteUrl: string) {
  const href = escapeHtml(absolutize(siteUrl, product.url));
  const name = escapeHtml(product.name);
  const imageUrl = product.imageUrl
    ? escapeHtml(
        product.imageUrl.startsWith("http")
          ? product.imageUrl
          : absolutize(siteUrl, product.imageUrl),
      )
    : "";

  const thumb = imageUrl
    ? `<a href="${href}" style="display:block; line-height:0;">
        <img src="${imageUrl}" alt="${name}" width="72" height="72" style="display:block; width:72px; height:72px; object-fit:cover; border:0; border-radius:10px; background-color:${EMAIL_BRAND.softAlt};" />
      </a>`
    : `<a href="${href}" style="display:block; width:72px; height:72px; border-radius:10px; background-color:${EMAIL_BRAND.softAlt};"></a>`;

  return `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%; margin:0 0 10px 0; background-color:${EMAIL_BRAND.soft}; border-radius:14px;">
                <tr>
                  <td width="72" valign="middle" style="width:72px; padding:10px 0 10px 10px; vertical-align:middle;">
                    ${thumb}
                  </td>
                  <td valign="middle" style="padding:10px 14px 10px 12px; vertical-align:middle;">
                    <p style="margin:0; font-family:${EMAIL_FONT_HEADING}; font-size:14px; line-height:1.35; font-weight:600; color:${EMAIL_BRAND.ink};">
                      <a href="${href}" style="color:${EMAIL_BRAND.ink}; text-decoration:none;">${name}</a>
                    </p>
                    ${priceBlock(product)}
                  </td>
                </tr>
              </table>`;
}

function productListHtml(
  products: NewsletterProductCard[],
  siteUrl: string,
) {
  if (products.length === 0) return "";
  return products.map((p) => productCardHtml(p, siteUrl)).join("");
}

function sectionHtml(input: {
  title: string;
  products: NewsletterProductCard[];
  siteUrl: string;
  moreUrl: string;
  moreLabel: string;
}) {
  if (input.products.length === 0) return "";

  return `
          <tr>
            <td class="email-pad" style="padding: 28px 36px 4px 36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
                <tr>
                  <td align="left" valign="bottom" style="vertical-align:bottom;">
                    <p style="margin:0; font-family:${EMAIL_FONT_HEADING}; font-size:18px; font-weight:700; color:${EMAIL_BRAND.ink};">
                      ${escapeHtml(input.title)}
                    </p>
                  </td>
                  <td align="right" valign="bottom" style="vertical-align:bottom; white-space:nowrap; padding-left:12px;">
                    <a href="${escapeHtml(input.moreUrl)}" style="font-family:${EMAIL_FONT_SANS}; font-size:13px; color:${EMAIL_BRAND.primary}; text-decoration:underline;">
                      ${escapeHtml(input.moreLabel)}
                    </a>
                  </td>
                </tr>
              </table>
              <div style="height:12px; line-height:12px; font-size:12px;">&nbsp;</div>
              ${productListHtml(input.products, input.siteUrl)}
            </td>
          </tr>`;
}

/**
 * Pravidelný B2C newsletter (novinky + akcie).
 * Odosiela sa cronom / admin akciou aktívnym odberateľom.
 */
export function buildNewsletterEmail(
  vars: NewsletterEmailVars,
): EmailTemplate {
  const siteUrl = (vars.siteUrl ?? EMAIL_BRAND.defaultSiteUrl).replace(
    /\/$/,
    "",
  );
  const shopUrl = vars.shopUrl ?? siteUrl;
  const novinkyUrl = vars.novinkyUrl ?? absolutize(siteUrl, "/novinky");
  const akciaUrl = vars.akciaUrl ?? absolutize(siteUrl, "/akcia");
  const unsubscribeUrl =
    vars.unsubscribeUrl ?? absolutize(siteUrl, "/odhlasenie-newsletter");

  const { news, sales } = limitProducts(
    vars.newProducts ?? [],
    vars.saleProducts ?? [],
  );

  const firstName = firstNameFrom((vars.customerName ?? "").trim());
  const greeting = firstName ? `Dobrý deň, ${firstName},` : "Dobrý deň,";
  const headline = (vars.headline ?? "Novinky a akcie z PACIDEKOR").trim();
  const intro = (
    vars.intro ??
    "pripravili sme pre vás výber nových produktov a aktuálnych akcií."
  ).trim();

  const subject = vars.subject?.trim() || headline;
  const preheader =
    vars.preheader?.trim() ||
    "Pozrite si novinky a produkty v akcii v eshope PACIDEKOR.";

  const safeGreeting = escapeHtml(greeting);
  const safeHeadline = escapeHtml(headline);
  const safeIntro = escapeHtml(intro);
  const safeSite = escapeHtml(siteUrl);
  const safeShopUrl = escapeHtml(shopUrl);
  const safeUnsub = escapeHtml(unsubscribeUrl);

  const textParts = [
    greeting,
    "",
    intro,
    "",
  ];
  if (news.length) {
    textParts.push("Novinky:");
    for (const p of news) {
      textParts.push(`- ${p.name} (${p.price}): ${absolutize(siteUrl, p.url)}`);
    }
    textParts.push("");
  }
  if (sales.length) {
    textParts.push("V akcii:");
    for (const p of sales) {
      const disc = p.discountPercent ? ` (-${p.discountPercent}%)` : "";
      textParts.push(
        `- ${p.name} (${p.price}${disc}): ${absolutize(siteUrl, p.url)}`,
      );
    }
    textParts.push("");
  }
  textParts.push(
    `Prejsť do obchodu: ${shopUrl}`,
    "",
    `Odhlásiť sa z newslettera: ${unsubscribeUrl}`,
    "",
    "S pozdravom",
    "PACIDEKOR",
    siteUrl,
  );

  const html = `<!DOCTYPE html>
<html lang="sk" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  ${emailDocumentHead(escapeHtml(subject))}
  <style type="text/css">
    @media only screen and (max-width: 620px) {
      .email-shell { width: 100% !important; }
    }
  </style>
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
            <td class="email-pad" style="padding: 32px 36px 8px 36px; background-color:${EMAIL_BRAND.white};">
              <p style="margin:0 0 12px 0; font-family:${EMAIL_FONT_SANS}; font-size:16px; line-height:1.55; color:${EMAIL_BRAND.ink};">
                ${safeGreeting}
              </p>
              <h1 class="email-hero" style="margin:0; font-family:${EMAIL_FONT_HEADING}; font-size:26px; line-height:1.3; color:${EMAIL_BRAND.ink}; font-weight:700;">
                ${safeHeadline}
              </h1>
              <p style="margin:14px 0 0 0; font-family:${EMAIL_FONT_SANS}; font-size:16px; line-height:1.65; color:${EMAIL_BRAND.muted};">
                ${safeIntro}
              </p>
            </td>
          </tr>

          ${sectionHtml({
            title: "Novinky",
            products: news,
            siteUrl,
            moreUrl: novinkyUrl,
            moreLabel: "Prehliadať všetky novinky",
          })}

          ${sectionHtml({
            title: "V akcii",
            products: sales,
            siteUrl,
            moreUrl: akciaUrl,
            moreLabel: "Prehliadať všetky akcie",
          })}

          <tr>
            <td class="email-pad" style="padding: 28px 36px 8px 36px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${safeShopUrl}" style="height:46px;v-text-anchor:middle;width:220px;" arcsize="16%" stroke="f" fillcolor="${EMAIL_BRAND.primary}">
                <w:anchorlock/>
                <center style="color:${EMAIL_BRAND.white};font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;">
                  Prejsť do obchodu
                </center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-- -->
              <a href="${safeShopUrl}" style="display:inline-block; background-color:${EMAIL_BRAND.primary}; color:${EMAIL_BRAND.white}; font-family:${EMAIL_FONT_SANS}; font-size:15px; font-weight:600; line-height:46px; border-radius:12px; padding:0 24px;">
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
              <p style="margin:0 0 8px 0; font-family:${EMAIL_FONT_SANS}; font-size:12px; line-height:1.5; color:rgba(47,41,36,0.45);">
                © ${new Date().getFullYear()}
                <a href="${safeSite}" style="color:rgba(47,41,36,0.55); text-decoration:underline;">PACIDEKOR</a>
              </p>
              <p style="margin:0; font-family:${EMAIL_FONT_SANS}; font-size:12px; line-height:1.5; color:rgba(47,41,36,0.45);">
                Tento e-mail ste dostali, pretože ste prihlásení na odber noviniek.
                <a href="${safeUnsub}" style="color:rgba(47,41,36,0.55); text-decoration:underline;">Odhlásiť sa</a>
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
    id: "newsletter",
    subject,
    preheader,
    html,
    text: textParts.join("\n"),
  };
}
