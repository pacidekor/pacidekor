/**
 * Helpers for admin product delete: discover image URLs still referenced
 * by other products (active or archived) before Storage removal.
 * Pure / injectable — no Storage side effects.
 */

export const PRODUCT_IMAGE_REF_PAGE_SIZE = 1000;

export type ProductImageRefRow = {
  id?: string;
  images?: unknown;
  shared_image_urls?: unknown;
};

export type FetchImageRefPageResult = {
  data: ProductImageRefRow[] | null;
  error: { message: string } | null;
  /**
   * Exact total of matching rows (Prefer: count=exact / Content-Range).
   * Required to prove completeness — a short page alone is not enough
   * (server max-rows may truncate below the requested page size).
   */
  total: number | null;
};

export type CollectRefsResult =
  | { ok: true; urls: Set<string> }
  | { ok: false; error: string };

/** Collect image + shared URLs from already-fetched rows. */
export function collectUrlsFromProductRows(
  rows: ProductImageRefRow[],
): Set<string> {
  const urls = new Set<string>();
  for (const row of rows) {
    const rowImages = Array.isArray(row.images) ? row.images : [];
    const shared = Array.isArray(row.shared_image_urls)
      ? row.shared_image_urls
      : [];
    for (const url of [...rowImages, ...shared]) {
      if (typeof url === "string" && url) urls.add(url);
    }
  }
  return urls;
}

/**
 * Page through every other product (no archived filter — includes archived).
 * Caller must request pages ordered by `id` ascending and return exact `total`.
 * On any error, missing total, or unproven completeness → fail closed.
 */
export async function collectReferencedImageUrls(
  fetchPage: (
    from: number,
    to: number,
  ) => Promise<FetchImageRefPageResult>,
  options?: { pageSize?: number },
): Promise<CollectRefsResult> {
  const pageSize = options?.pageSize ?? PRODUCT_IMAGE_REF_PAGE_SIZE;
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    return {
      ok: false,
      error: "Neplatná velikost stránky při ověření odkazů. Mazanie zrušené.",
    };
  }

  const urls = new Set<string>();
  let from = 0;
  let collectedRows = 0;
  let lastId: string | null = null;

  for (;;) {
    const to = from + pageSize - 1;
    const { data, error, total } = await fetchPage(from, to);
    if (error) {
      return {
        ok: false,
        error: `Nepodarilo sa overiť, či fotografie ešte používa iný produkt (${error.message}). Mazanie zrušené.`,
      };
    }
    if (!Array.isArray(data)) {
      return {
        ok: false,
        error:
          "Nepodarilo sa overiť odkazy na fotografie (neúplná odpoveď). Mazanie zrušené.",
      };
    }

    // Stable order check: ids must be strictly increasing when present.
    for (const row of data) {
      if (typeof row.id === "string" && row.id) {
        if (lastId !== null && row.id <= lastId) {
          return {
            ok: false,
            error:
              "Nepodarilo sa overiť odkazy na fotografie (nestabilní řazení výsledků). Mazanie zrušené.",
          };
        }
        lastId = row.id;
      }
    }

    for (const url of collectUrlsFromProductRows(data)) {
      urls.add(url);
    }
    collectedRows += data.length;

    // Empty first page with proven total 0 (or unknown total only if zero rows overall).
    if (from === 0 && data.length === 0) {
      if (total === 0) return { ok: true, urls };
      if (total === null) {
        return {
          ok: false,
          error:
            "Nepodarilo sa overiť úplnost odkazů na fotografie (chybí celkový počet). Mazanie zrušené.",
        };
      }
      return {
        ok: false,
        error:
          "Nepodarilo sa overiť odkazy na fotografie (prázdná stránka při nenulovém počtu). Mazanie zrušené.",
      };
    }

    if (total === null) {
      // A short page alone must NOT prove the end — server max-rows may have truncated.
      return {
        ok: false,
        error:
          "Nepodarilo sa overiť úplnost odkazů na fotografie (chybí celkový počet / Content-Range). Mazanie zrušené.",
      };
    }

    if (!Number.isFinite(total) || total < 0) {
      return {
        ok: false,
        error:
          "Nepodarilo sa overiť úplnost odkazů na fotografie (neplatný celkový počet). Mazanie zrušené.",
      };
    }

    if (collectedRows > total) {
      return {
        ok: false,
        error:
          "Nepodarilo sa overiť odkazy na fotografie (nesoulad počtu řádků). Mazanie zrušené.",
      };
    }

    if (collectedRows === total) {
      return { ok: true, urls };
    }

    // More rows remain according to total — a short page means truncation, not end.
    if (data.length < pageSize) {
      return {
        ok: false,
        error:
          "Nepodarilo sa overiť úplnost odkazů na fotografie (stránka zkrácena před dosažením celkového počtu — možný serverový limit). Mazanie zrušené.",
      };
    }

    from += pageSize;
  }
}

export function storagePathFromPublicUrl(url: string) {
  const marker = "/storage/v1/object/public/product-images/";
  const index = url.indexOf(marker);
  if (index !== -1) {
    return decodeURIComponent(url.slice(index + marker.length));
  }

  // R2 / media CDN: https://media.pacidekor.sk/{userId}/{uuid}.webp
  const mediaBase = (
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_MEDIA_BASE_URL
      : undefined
  )
    ?.trim()
    .replace(/\/$/, "");
  if (mediaBase && url.startsWith(`${mediaBase}/`)) {
    return decodeURIComponent(url.slice(mediaBase.length + 1).split("?")[0] ?? "");
  }

  try {
    const parsed = new URL(url);
    if (
      parsed.hostname === "media.pacidekor.sk" ||
      parsed.hostname.endsWith(".r2.dev")
    ) {
      return decodeURIComponent(parsed.pathname.replace(/^\//, ""));
    }
  } catch {
    /* not a URL */
  }

  return null;
}

/** Paths that are safe to remove from Storage (not referenced elsewhere). */
export function storagePathsNotReferenced(
  productImages: string[],
  urlsStillUsed: Set<string>,
): string[] {
  return productImages
    .filter((url) => typeof url === "string" && url && !urlsStillUsed.has(url))
    .map((url) => storagePathFromPublicUrl(url))
    .filter((path): path is string => Boolean(path));
}
