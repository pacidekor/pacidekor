/**
 * Display order of a product's detail gallery (main gallery, thumbnails and zoom share it).
 *
 * Pure & dependency-free so it can be unit-tested with `node --test`.
 * Never reorders DB `images`: `color_image_map` indexes keep pointing at the original array.
 *
 * Photo types (only explicit data is trusted – nothing is guessed from file names or from
 * "unmapped" / "mapped to several colors", which prove nothing about a photo's content):
 *  - individual: listed in `colorImageMap[color]` and NOT marked shared
 *  - shared:     explicitly listed in `sharedImageUrls` (`products.shared_image_urls`)
 *  - general:    everything else (not mapped, not marked shared)
 *
 * Order: selected color individual -> other colors individual -> general -> shared (always last).
 *
 * The variant-first order applies only when the product is "reviewed"
 * (`sharedImageUrls` is an array, possibly empty) and EVERY color has an explicit map entry.
 * Otherwise the caller keeps the legacy behaviour (see `reason`).
 */
export type GalleryOrderInput = {
  /** Gallery URLs in DB order (index = position used by colorImageMap). */
  images: string[];
  /** Product colors in product order (only colors shown in the storefront). */
  colorIds: string[];
  /** Raw explicit colorId → image indexes. */
  colorImageMap?: Record<string, number[]> | null;
  /** undefined/null = not reviewed (legacy behaviour). [] = reviewed, no shared photo. */
  sharedImageUrls?: string[] | null;
};

export type GalleryOrderResult =
  | {
      mode: "variant-first";
      /** Indexes into `images`, each real photo exactly once (URL duplicates removed). */
      indexes: number[];
      /** Not-marked-shared photos mapped to several colors (placed with the first color claiming them). */
      ambiguousIndexes: number[];
    }
  | {
      mode: "legacy";
      reason:
        | "no-colors"
        | "no-color-selected"
        | "unknown-color"
        | "not-reviewed"
        | "incomplete-map"
        | "no-images";
    };

function validIndexes(value: unknown, count: number): number[] {
  if (!Array.isArray(value)) return [];
  const out: number[] = [];
  for (const raw of value) {
    const n = Number(raw);
    if (Number.isInteger(n) && n >= 0 && n < count && !out.includes(n)) out.push(n);
  }
  return out;
}

export function orderProductGallery(
  input: GalleryOrderInput,
  selectedColorId?: string,
): GalleryOrderResult {
  const { images, colorIds } = input;
  const count = images.length;
  if (count === 0) return { mode: "legacy", reason: "no-images" };
  if (colorIds.length === 0) return { mode: "legacy", reason: "no-colors" };
  if (!selectedColorId) return { mode: "legacy", reason: "no-color-selected" };
  if (!colorIds.includes(selectedColorId)) {
    return { mode: "legacy", reason: "unknown-color" };
  }
  if (!Array.isArray(input.sharedImageUrls)) {
    return { mode: "legacy", reason: "not-reviewed" };
  }

  const map = input.colorImageMap ?? {};
  const perColor = new Map<string, number[]>();
  for (const id of colorIds) {
    const idx = validIndexes(map[id], count);
    if (idx.length === 0) return { mode: "legacy", reason: "incomplete-map" };
    perColor.set(id, idx);
  }

  const sharedUrlSet = new Set(input.sharedImageUrls);
  const shared: number[] = [];
  images.forEach((url, i) => {
    if (sharedUrlSet.has(url)) shared.push(i);
  });
  const sharedSet = new Set(shared);

  const claims = new Map<number, number>();
  for (const idx of perColor.values()) {
    for (const i of idx) claims.set(i, (claims.get(i) ?? 0) + 1);
  }
  const ambiguousIndexes = [...claims.entries()]
    .filter(([i, n]) => n > 1 && !sharedSet.has(i))
    .map(([i]) => i)
    .sort((a, b) => a - b);

  const order = [selectedColorId, ...colorIds.filter((id) => id !== selectedColorId)];
  const used = new Set<number>();
  const result: number[] = [];
  const push = (i: number) => {
    if (used.has(i)) return;
    used.add(i);
    result.push(i);
  };

  for (const id of order) {
    for (const i of perColor.get(id)!) if (!sharedSet.has(i)) push(i);
  }
  // General (unmapped, unmarked) photos first, shared photos strictly last.
  for (let i = 0; i < count; i += 1) if (!sharedSet.has(i)) push(i);
  for (const i of shared) push(i);

  // The same real photo (same URL) must appear only once.
  const seenUrls = new Set<string>();
  const indexes = result.filter((i) => {
    const url = images[i]!;
    if (seenUrls.has(url)) return false;
    seenUrls.add(url);
    return true;
  });

  return { mode: "variant-first", indexes, ambiguousIndexes };
}
