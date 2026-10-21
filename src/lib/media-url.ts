/**
 * Public product-image delivery: prefer R2 (`NEXT_PUBLIC_MEDIA_BASE_URL`)
 * while DB may still store absolute Supabase Storage URLs.
 *
 * Set NEXT_PUBLIC_MEDIA_BASE_URL=https://media.pacidekor.sk after R2 sync.
 * Until then, URLs stay on Supabase (no-op).
 */

import { storagePathFromPublicUrl } from "@/lib/product-image-refs";

const MEDIA_BASE = () =>
  (typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_MEDIA_BASE_URL
    : undefined
  )
    ?.trim()
    .replace(/\/$/, "") || "";

/** True when storefront should serve product images from R2/media host. */
export function isMediaCdnEnabled(): boolean {
  return Boolean(MEDIA_BASE());
}

export function getMediaBaseUrl(): string {
  return MEDIA_BASE();
}

/**
 * Map a stored image URL (Supabase public, media CDN, or relative) to the
 * preferred public URL. Unknown hosts are left unchanged.
 */
export function toPublicMediaUrl(src: string | null | undefined): string {
  if (!src) return "";
  if (src.startsWith("data:") || src.startsWith("blob:") || src.startsWith("/")) {
    return src;
  }

  const base = MEDIA_BASE();
  if (!base) return src;

  // Already on media CDN
  if (src.startsWith(`${base}/`) || src === base) return src;

  const path = storagePathFromPublicUrl(src);
  if (path) return `${base}/${path}`;

  // Already a media-relative path stored after cutover (no host)
  if (!/^https?:\/\//i.test(src) && !src.includes("://")) {
    return `${base}/${src.replace(/^\//, "")}`;
  }

  try {
    const url = new URL(src);
    if (url.hostname === new URL(base).hostname) return src;
  } catch {
    /* keep */
  }

  return src;
}

/** Prefer media CDN; if missing/disabled, keep original (Supabase fallback). */
export function toPublicMediaUrlWithFallback(
  src: string | null | undefined,
): { primary: string; fallback: string | null } {
  const original = src ?? "";
  if (!original) return { primary: "", fallback: null };
  const primary = toPublicMediaUrl(original);
  if (!primary || primary === original) {
    return { primary: original, fallback: null };
  }
  // Supabase (or other) original remains a client onError fallback
  return { primary, fallback: original };
}

export function mapMediaUrls(urls: string[] | null | undefined): string[] {
  if (!urls?.length) return [];
  return urls.map((u) => toPublicMediaUrl(u)).filter(Boolean);
}
