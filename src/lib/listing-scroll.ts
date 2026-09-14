/** Persist listing scroll so back-from-PDP lands on the same place (incl. lazy batches). */

const PREFIX = "pacidekor.listing.scroll:";

export type ListingScrollSnapshot = {
  scrollY: number;
  visibleCount?: number;
  /** Product id clicked — preferred restore target after back. */
  productId?: string;
  productHref?: string;
};

export function listingScrollKey(pathname: string, filterKey = "") {
  return `${PREFIX}${pathname}${filterKey ? `?${filterKey}` : ""}`;
}

export function saveListingScroll(
  key: string,
  snapshot: ListingScrollSnapshot,
) {
  try {
    sessionStorage.setItem(key, JSON.stringify(snapshot));
  } catch {
    // private mode / quota — ignore
  }
}

export function peekListingScroll(key: string): ListingScrollSnapshot | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw) as ListingScrollSnapshot;
    if (typeof data?.scrollY !== "number") return null;
    return data;
  } catch {
    return null;
  }
}

export function takeListingScroll(key: string): ListingScrollSnapshot | null {
  const data = peekListingScroll(key);
  if (!data) return null;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
  return data;
}

/** True when current listing path has a pending restore snapshot. */
export function hasListingScrollForPath(pathname: string) {
  try {
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (!key || !key.startsWith(PREFIX)) continue;
      // key = PREFIX + pathname + optional ?filterKey
      const rest = key.slice(PREFIX.length);
      if (rest === pathname || rest.startsWith(`${pathname}?`)) {
        return peekListingScroll(key) != null;
      }
    }
  } catch {
    // ignore
  }
  return false;
}

export function clearListingScrollForPath(pathname: string) {
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (!key || !key.startsWith(PREFIX)) continue;
      const rest = key.slice(PREFIX.length);
      if (rest === pathname || rest.startsWith(`${pathname}?`)) {
        keys.push(key);
      }
    }
    for (const key of keys) sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}
