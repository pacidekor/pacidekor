import type { Metadata } from "next";
import { COMPANY } from "@/lib/company";

export const SITE_NAME = "PACIDEKOR";

export const DEFAULT_TITLE =
  "PACIDEKOR | Veľkoobchod a dodávateľ umelých kvetov";

export const DEFAULT_DESCRIPTION =
  "Veľkoobchod a maloobchod s umelými kvetmi, dekoráciami a aranžérskym materiálom. Sortiment pre floristov, kvetinárstva aj firmy.";

export const NO_INDEX_ROBOTS = {
  index: false,
  follow: false,
} as const;

/** Production site origin from env (no trailing slash). */
export function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) return raw.replace(/\/+$/, "");
  return "http://localhost:3000";
}

export function absoluteUrl(path = "/") {
  const base = getSiteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Make relative asset paths absolute for OG / JSON-LD. */
export function absoluteAssetUrl(src: string | undefined | null) {
  if (!src) return undefined;
  if (/^https?:\/\//i.test(src)) return src;
  return absoluteUrl(src.startsWith("/") ? src : `/${src}`);
}

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  /** Absolute title (skip "%s | PACIDEKOR" template). */
  absoluteTitle?: boolean;
  noIndex?: boolean;
  type?: "website" | "article";
};

export function pageMetadata({
  title,
  description,
  path,
  image,
  absoluteTitle = false,
  noIndex = false,
  type = "website",
}: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const ogImage = absoluteAssetUrl(image);
  const fullTitle = absoluteTitle ? title : title;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: noIndex ? undefined : { canonical: url },
    robots: noIndex ? NO_INDEX_ROBOTS : undefined,
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      locale: "sk_SK",
      type,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: fullTitle,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: COMPANY.name,
    url: getSiteUrl(),
    email: COMPANY.email,
    telephone: COMPANY.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Kráľová nad Váhom 283",
      postalCode: "925 91",
      addressCountry: "SK",
    },
    vatID: COMPANY.icDph,
    taxID: COMPANY.ico,
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: getSiteUrl(),
    inLanguage: "sk-SK",
    publisher: {
      "@type": "Organization",
      name: COMPANY.name,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${getSiteUrl()}/vyhladavanie?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

type BreadcrumbItem = { name: string; path: string };

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

type ProductJsonLdInput = {
  name: string;
  description: string;
  slug: string;
  image: string;
  sku?: string;
  price: number;
  inStock?: boolean;
  category?: string;
};

export function productJsonLd(input: ProductJsonLdInput) {
  const url = absoluteUrl(`/produkt/${input.slug}`);
  const image = absoluteAssetUrl(input.image);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    sku: input.sku || undefined,
    image: image ? [image] : undefined,
    url,
    category: input.category,
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "EUR",
      price: input.price.toFixed(2),
      availability:
        input.inStock === false
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: COMPANY.name,
      },
    },
  };
}

type BlogPostingJsonLdInput = {
  title: string;
  excerpt: string;
  slug: string;
  coverImage?: string;
  publishedAt: string;
  author: string;
};

export function blogPostingJsonLd(input: BlogPostingJsonLdInput) {
  const url = absoluteUrl(`/blog/${input.slug}`);
  const image = absoluteAssetUrl(input.coverImage);

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.title,
    description: input.excerpt,
    url,
    mainEntityOfPage: url,
    datePublished: input.publishedAt,
    dateModified: input.publishedAt,
    author: {
      "@type": "Person",
      name: input.author || SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: COMPANY.name,
      url: getSiteUrl(),
    },
    ...(image ? { image: [image] } : {}),
    inLanguage: "sk-SK",
  };
}
