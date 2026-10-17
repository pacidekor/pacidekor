/**
 * Pure validation of cart/checkout color selection against the product's
 * current `color_ids` and optional `unavailable_color_ids`.
 * Used by createOrderAction (authoritative) and cart UI.
 *
 * Rules:
 * - Product with colors → colorId required and must be one of color_ids.
 * - Product without colors → colorId must be absent/empty.
 * - Color in unavailable_color_ids → rejected (sold out), no silent remap.
 * - Never silently remaps an invalid id (e.g. removed Mix) to another color.
 */

export type OrderLineColorCheck =
  | { ok: true }
  | {
      ok: false;
      code:
        | "color_required"
        | "color_invalid"
        | "color_not_allowed"
        | "color_unavailable";
      message: string;
    };

export function normalizeOrderLineColorId(colorId?: string | null): string {
  return (colorId ?? "").trim();
}

export function normalizeUnavailableColorIds(
  unavailableColorIds?: string[] | null,
): string[] {
  if (!Array.isArray(unavailableColorIds)) return [];
  return unavailableColorIds.filter(
    (id): id is string => typeof id === "string" && id.trim().length > 0,
  );
}

/** True when this colorId is blocked for purchase (still visible in UI). */
export function isColorUnavailable(
  colorId: string | null | undefined,
  unavailableColorIds?: string[] | null,
): boolean {
  const selected = normalizeOrderLineColorId(colorId);
  if (!selected) return false;
  return normalizeUnavailableColorIds(unavailableColorIds).includes(selected);
}

/** Color can be ordered: member of color_ids and not in unavailable. */
export function isColorOrderable(
  colorId: string | null | undefined,
  colorIds: string[] | null | undefined,
  unavailableColorIds?: string[] | null,
): boolean {
  const selected = normalizeOrderLineColorId(colorId);
  const allowed = Array.isArray(colorIds) ? colorIds : [];
  if (!selected || allowed.length === 0) return false;
  if (!allowed.includes(selected)) return false;
  return !isColorUnavailable(selected, unavailableColorIds);
}

/**
 * Product-level orderability from colors + product stock flag.
 * - No color variants → follow productInStock only.
 * - With colors → productInStock AND at least one color not unavailable.
 * stock_quantity is checked separately at order time / inventory hooks.
 */
export function isProductOrderableByColors(input: {
  productInStock: boolean;
  colorIds?: string[] | null;
  unavailableColorIds?: string[] | null;
}): boolean {
  if (!input.productInStock) return false;
  const colorIds = Array.isArray(input.colorIds) ? input.colorIds : [];
  if (colorIds.length === 0) return true;
  const unavailable = new Set(
    normalizeUnavailableColorIds(input.unavailableColorIds),
  );
  return colorIds.some((id) => !unavailable.has(id));
}

/** First color id that is still orderable; empty string if none. */
export function firstOrderableColorId(
  colorIds: string[] | null | undefined,
  unavailableColorIds?: string[] | null,
): string {
  const allowed = Array.isArray(colorIds) ? colorIds : [];
  const unavailable = new Set(
    normalizeUnavailableColorIds(unavailableColorIds),
  );
  return allowed.find((id) => !unavailable.has(id)) ?? "";
}

/**
 * Keep unavailable flags only for colors that still exist; remap IDs on rename.
 */
export function migrateUnavailableColorIds(input: {
  unavailableColorIds: string[];
  colorIds: string[];
  migration?: Map<string, string>;
}): string[] {
  const migration = input.migration ?? new Map<string, string>();
  const next: string[] = [];
  for (const id of input.unavailableColorIds) {
    const mapped = migration.get(id) ?? id;
    if (input.colorIds.includes(mapped) && !next.includes(mapped)) {
      next.push(mapped);
    }
  }
  return next;
}

export function validateOrderLineColor(
  productName: string,
  colorIds: string[] | null | undefined,
  colorId?: string | null,
  unavailableColorIds?: string[] | null,
): OrderLineColorCheck {
  const allowed = Array.isArray(colorIds) ? colorIds : [];
  const selected = normalizeOrderLineColorId(colorId);

  if (allowed.length === 0) {
    if (selected) {
      return {
        ok: false,
        code: "color_not_allowed",
        message: `${productName} už nemá farebné varianty. Odstráňte výber farby v košíku a pokračujte bez farby.`,
      };
    }
    return { ok: true };
  }

  if (!selected) {
    return {
      ok: false,
      code: "color_required",
      message: `Vyberte platnú farbu pre ${productName}.`,
    };
  }

  if (!allowed.includes(selected)) {
    return {
      ok: false,
      code: "color_invalid",
      message: `Vybraná farba pre ${productName} už nie je v ponuke. Zvoľte inú farbu v košíku.`,
    };
  }

  if (isColorUnavailable(selected, unavailableColorIds)) {
    return {
      ok: false,
      code: "color_unavailable",
      message: `Vybraná farba pre ${productName} je vypredaná. Zvoľte inú dostupnú farbu v košíku alebo položku odstráňte.`,
    };
  }

  return { ok: true };
}

/** Client helper: true when a cart line's colorId is still valid & orderable. */
export function isCartLineColorValid(
  colorOptions: Array<{ id: string }> | null | undefined,
  colorId?: string | null,
  unavailableColorIds?: string[] | null,
): boolean {
  const ids = (colorOptions ?? []).map((c) => c.id);
  return validateOrderLineColor("x", ids, colorId, unavailableColorIds).ok;
}
