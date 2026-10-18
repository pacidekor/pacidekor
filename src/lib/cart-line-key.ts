/**
 * Unified cart line identity.
 * Namespaces: "" (none) | "c:{colorId}" | "v:{variantId}"
 */

export type CartLineSelection =
  | { kind: "none" }
  | { kind: "color"; colorId: string }
  | { kind: "variant"; variantId: string };

export function normalizeSelectionId(value: string | null | undefined): string {
  return (value ?? "").trim();
}

/** Canonical DB / guest storage key for the option axis (never invents ids). */
export function cartLineOptionKey(selection: CartLineSelection): string {
  if (selection.kind === "none") return "";
  if (selection.kind === "color") {
    const id = normalizeSelectionId(selection.colorId);
    if (!id) return "";
    return `c:${id}`;
  }
  const id = normalizeSelectionId(selection.variantId);
  if (!id) return "";
  return `v:${id}`;
}

export function parseCartLineOptionKey(
  key: string | null | undefined,
): CartLineSelection {
  const raw = (key ?? "").trim();
  if (!raw) return { kind: "none" };
  if (raw.startsWith("c:")) {
    const colorId = raw.slice(2).trim();
    return colorId ? { kind: "color", colorId } : { kind: "none" };
  }
  if (raw.startsWith("v:")) {
    const variantId = raw.slice(2).trim();
    return variantId ? { kind: "variant", variantId } : { kind: "none" };
  }
  // Legacy / unknown — treat as none (no silent remap to a color).
  return { kind: "none" };
}

/** Build option key from optional color / variant fields (exactly one axis). */
export function cartLineOptionKeyFromParts(input: {
  colorId?: string | null;
  variantId?: string | null;
}): string {
  const variantId = normalizeSelectionId(input.variantId);
  if (variantId) return cartLineOptionKey({ kind: "variant", variantId });
  const colorId = normalizeSelectionId(input.colorId);
  if (colorId) return cartLineOptionKey({ kind: "color", colorId });
  return "";
}

export function selectionFromParts(input: {
  colorId?: string | null;
  variantId?: string | null;
}): CartLineSelection {
  return parseCartLineOptionKey(cartLineOptionKeyFromParts(input));
}

/** Stable composite for Maps / React keys. */
export function cartLineCompositeKey(
  productId: string,
  lineOptionKey: string,
): string {
  return `${productId}\0${lineOptionKey}`;
}

/**
 * Migrate a legacy stored line that only had productId + optional colorId
 * (one row per product). Preserves the stored color when present.
 */
export function migrateLegacyCartOptionKey(
  colorId?: string | null,
): string {
  return cartLineOptionKeyFromParts({ colorId });
}
