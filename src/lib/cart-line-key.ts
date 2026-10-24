/**
 * Unified cart line identity.
 * Namespaces:
 *   "" (none)
 *   "c:{colorId}"
 *   "v:{variantId}"
 *   "vc:{variantId}|{colorId}" — custom text variant + color
 */

export type CartLineSelection =
  | { kind: "none" }
  | { kind: "color"; colorId: string }
  | { kind: "variant"; variantId: string }
  | { kind: "variantColor"; variantId: string; colorId: string };

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
  if (selection.kind === "variantColor") {
    const variantId = normalizeSelectionId(selection.variantId);
    const colorId = normalizeSelectionId(selection.colorId);
    if (!variantId || !colorId) return "";
    return `vc:${variantId}|${colorId}`;
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
  if (raw.startsWith("vc:")) {
    const body = raw.slice(3);
    const pipe = body.indexOf("|");
    if (pipe <= 0) return { kind: "none" };
    const variantId = body.slice(0, pipe).trim();
    const colorId = body.slice(pipe + 1).trim();
    return variantId && colorId
      ? { kind: "variantColor", variantId, colorId }
      : { kind: "none" };
  }
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

/** Build option key from optional color / variant fields. */
export function cartLineOptionKeyFromParts(input: {
  colorId?: string | null;
  variantId?: string | null;
}): string {
  const variantId = normalizeSelectionId(input.variantId);
  const colorId = normalizeSelectionId(input.colorId);
  if (variantId && colorId) {
    return cartLineOptionKey({ kind: "variantColor", variantId, colorId });
  }
  if (variantId) return cartLineOptionKey({ kind: "variant", variantId });
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
