/**
 * Warehouse / per-option stock helpers.
 * Qty: null = unlimited, 0 = sold out, N > 0 = pieces.
 */

import type { TextVariant, VariantMode } from "@/lib/product-variants";
import { normalizeUnavailableColorIds } from "@/lib/order-line-color";

export const WAREHOUSE_LOW_STOCK_THRESHOLD = 5;

export type StockQty = number | null;

export type WarehouseLine = {
  key: string;
  label: string;
  /** color id or text variant id, empty for none-mode product line */
  optionId: string;
  qty: StockQty;
  kind: "product" | "color" | "custom";
};

export function normalizeStockQty(raw: unknown): StockQty {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return null;
  const qty = Math.floor(n);
  if (qty < 0) return 0;
  return qty;
}

export function isStockQtyAvailable(qty: StockQty): boolean {
  if (qty === null) return true;
  return qty > 0;
}

export function isStockQtyLow(qty: StockQty): boolean {
  return qty != null && qty > 0 && qty <= WAREHOUSE_LOW_STOCK_THRESHOLD;
}

/** Parse products.color_stock jsonb → map */
export function parseColorStock(raw: unknown): Record<string, StockQty> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, StockQty> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    const key = id.trim();
    if (!key) continue;
    out[key] = normalizeStockQty(value);
  }
  return out;
}

export function colorStockQty(
  colorStock: Record<string, StockQty> | undefined,
  colorId: string,
): StockQty {
  if (!colorStock || !(colorId in colorStock)) return null;
  return colorStock[colorId] ?? null;
}

/** Derive unavailable_color_ids from color_stock (qty === 0). */
export function unavailableColorIdsFromStock(
  colorIds: string[],
  colorStock: Record<string, StockQty>,
): string[] {
  const out: string[] = [];
  for (const id of colorIds) {
    const qty = colorStockQty(colorStock, id);
    if (qty === 0) out.push(id);
  }
  return out;
}

/**
 * Merge legacy unavailable_color_ids into color_stock (0 for each),
 * without overwriting existing numeric stock.
 */
export function mergeColorStockWithUnavailable(input: {
  colorIds: string[];
  colorStock?: Record<string, StockQty>;
  unavailableColorIds?: string[] | null;
}): Record<string, StockQty> {
  const stock = { ...(input.colorStock ?? {}) };
  for (const id of normalizeUnavailableColorIds(input.unavailableColorIds)) {
    if (!(id in stock)) stock[id] = 0;
  }
  // Drop keys for colors that no longer exist
  for (const key of Object.keys(stock)) {
    if (!input.colorIds.includes(key)) delete stock[key];
  }
  return stock;
}

export function textVariantStockQty(variant: TextVariant): StockQty {
  return normalizeStockQty(variant.stockQuantity);
}

export function textVariantWithStock(
  variant: TextVariant,
  qty: StockQty,
): TextVariant {
  const available = isStockQtyAvailable(qty);
  return {
    ...variant,
    stockQuantity: qty,
    available,
  };
}

export function applyStockToTextVariants(
  variants: TextVariant[],
  qtyById: Record<string, StockQty>,
): TextVariant[] {
  return variants.map((v) => {
    const qty =
      v.id in qtyById ? normalizeStockQty(qtyById[v.id]) : textVariantStockQty(v);
    return textVariantWithStock(v, qty);
  });
}

export type WarehouseSummary = {
  mode: VariantMode;
  /** Product-level / aggregate availability for list badges */
  inStock: boolean;
  /** Aggregate tracked qty when all lines are numeric; else null */
  totalQty: StockQty;
  lineCount: number;
  orderableCount: number;
  soldOutCount: number;
  lowStockCount: number;
  /** Short Slovak label for admin list */
  label: string;
};

/** Slovak plural: 1 / 2–4 / 0,5+ */
export function slovakCountWord(
  count: number,
  one: string,
  few: string,
  many: string,
): string {
  const n = Math.abs(Math.floor(count));
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}

function colorsWord(count: number) {
  return slovakCountWord(count, "farba", "farby", "farieb");
}

function variantsWord(count: number) {
  return slovakCountWord(count, "varianta", "varianty", "variant");
}

function formatVariantStockLabel(input: {
  inStock: boolean;
  orderable: number;
  soldOut: number;
  total: number;
  allNumeric: boolean;
  sum: number;
  unitWord: (n: number) => string;
}): string {
  const { inStock, orderable, soldOut, total, allNumeric, sum, unitWord } =
    input;
  if (!inStock) {
    return `Vypredané · 0 zo ${total} ${unitWord(total)}`;
  }
  if (soldOut > 0) {
    const base = `Skladom · ${orderable} zo ${total} ${unitWord(total)}`;
    return allNumeric ? `${base} · ${sum} ks` : base;
  }
  if (allNumeric) {
    return `Skladom · ${total} ${unitWord(total)} · ${sum} ks`;
  }
  return `Skladom · ${total} ${unitWord(total)}`;
}

export function summarizeWarehouse(input: {
  mode: VariantMode;
  inStock: boolean;
  stockQuantity: StockQty | undefined;
  colorIds: string[];
  colorStock: Record<string, StockQty>;
  textVariants: TextVariant[];
}): WarehouseSummary {
  const mode = input.mode;

  if (mode === "none") {
    const qty =
      input.inStock === false
        ? 0
        : input.stockQuantity === undefined
          ? null
          : normalizeStockQty(input.stockQuantity);
    const inStock = input.inStock !== false && isStockQtyAvailable(qty);
    const effectiveQty = inStock ? qty : 0;
    return {
      mode,
      inStock,
      totalQty: inStock ? effectiveQty : 0,
      lineCount: 1,
      orderableCount: inStock ? 1 : 0,
      soldOutCount: inStock ? 0 : 1,
      lowStockCount: inStock && isStockQtyLow(effectiveQty) ? 1 : 0,
      label: !inStock
        ? "Vypredané"
        : effectiveQty == null
          ? "Skladom bez počtu"
          : `Skladom · ${effectiveQty} ks`,
    };
  }

  if (mode === "colors") {
    const ids = input.colorIds;
    if (ids.length === 0) {
      return summarizeWarehouse({ ...input, mode: "none" });
    }
    // Product-level in_stock=false with no positive per-color qty → fully sold out
    // (e.g. admin toggled "nie je na sklade" without writing color_stock).
    const anyPositiveTracked = ids.some((id) => {
      const q = colorStockQty(input.colorStock, id);
      return q != null && q > 0;
    });
    const forceSoldOut = input.inStock === false && !anyPositiveTracked;

    let orderable = 0;
    let soldOut = 0;
    let low = 0;
    let sum = 0;
    let allNumeric = true;
    for (const id of ids) {
      let qty = colorStockQty(input.colorStock, id);
      if (forceSoldOut && (qty === null || !(id in input.colorStock))) {
        qty = 0;
      }
      if (isStockQtyAvailable(qty)) {
        orderable += 1;
        if (qty == null) allNumeric = false;
        else {
          sum += qty;
          if (isStockQtyLow(qty)) low += 1;
        }
      } else {
        soldOut += 1;
      }
    }
    const inStock = orderable > 0;
    return {
      mode,
      inStock,
      totalQty: inStock && allNumeric ? sum : inStock ? null : 0,
      lineCount: ids.length,
      orderableCount: orderable,
      soldOutCount: soldOut,
      lowStockCount: low,
      label: formatVariantStockLabel({
        inStock,
        orderable,
        soldOut,
        total: ids.length,
        allNumeric,
        sum,
        unitWord: colorsWord,
      }),
    };
  }

  // custom
  const variants = input.textVariants;
  if (variants.length === 0) {
    return {
      mode,
      inStock: false,
      totalQty: 0,
      lineCount: 0,
      orderableCount: 0,
      soldOutCount: 0,
      lowStockCount: 0,
      label: "Bez variant",
    };
  }
  const anyPositiveTracked = variants.some((v) => {
    const q =
      v.stockQuantity !== undefined
        ? textVariantStockQty(v)
        : v.available === false
          ? 0
          : null;
    return q != null && q > 0;
  });
  const forceSoldOut = input.inStock === false && !anyPositiveTracked;

  let orderable = 0;
  let soldOut = 0;
  let low = 0;
  let sum = 0;
  let allNumeric = true;
  for (const v of variants) {
    // Legacy: no stockQuantity → fall back to available boolean
    let qty =
      v.stockQuantity !== undefined
        ? textVariantStockQty(v)
        : v.available === false
          ? 0
          : null;
    if (forceSoldOut && qty === null) qty = 0;
    if (isStockQtyAvailable(qty)) {
      orderable += 1;
      if (qty == null) allNumeric = false;
      else {
        sum += qty;
        if (isStockQtyLow(qty)) low += 1;
      }
    } else {
      soldOut += 1;
    }
  }
  const inStock = orderable > 0;
  return {
    mode,
    inStock,
    totalQty: inStock && allNumeric ? sum : inStock ? null : 0,
    lineCount: variants.length,
    orderableCount: orderable,
    soldOutCount: soldOut,
    lowStockCount: low,
    label: formatVariantStockLabel({
      inStock,
      orderable,
      soldOut,
      total: variants.length,
      allNumeric,
      sum,
      unitWord: variantsWord,
    }),
  };
}

export function buildWarehouseLines(input: {
  mode: VariantMode;
  productName: string;
  inStock: boolean;
  stockQuantity: StockQty | undefined;
  colorIds: string[];
  colorLabels: Record<string, string>;
  colorStock: Record<string, StockQty>;
  textVariants: TextVariant[];
}): WarehouseLine[] {
  if (input.mode === "colors" && input.colorIds.length > 0) {
    const anyPositiveTracked = input.colorIds.some((id) => {
      const q = colorStockQty(input.colorStock, id);
      return q != null && q > 0;
    });
    const forceSoldOut = input.inStock === false && !anyPositiveTracked;
    return input.colorIds.map((id) => {
      let qty = colorStockQty(input.colorStock, id);
      if (forceSoldOut && (qty === null || !(id in input.colorStock))) {
        qty = 0;
      }
      return {
        key: `c:${id}`,
        optionId: id,
        label: input.colorLabels[id] || id,
        qty,
        kind: "color" as const,
      };
    });
  }
  if (input.mode === "custom" && input.textVariants.length > 0) {
    const anyPositiveTracked = input.textVariants.some((v) => {
      const q =
        v.stockQuantity !== undefined
          ? textVariantStockQty(v)
          : v.available === false
            ? 0
            : null;
      return q != null && q > 0;
    });
    const forceSoldOut = input.inStock === false && !anyPositiveTracked;
    return input.textVariants.map((v) => {
      let qty =
        v.stockQuantity !== undefined
          ? textVariantStockQty(v)
          : v.available === false
            ? 0
            : null;
      if (forceSoldOut && qty === null) qty = 0;
      return {
        key: `v:${v.id}`,
        optionId: v.id,
        label: v.label,
        qty,
        kind: "custom" as const,
      };
    });
  }
  return [
    {
      key: "",
      optionId: "",
      label: input.productName,
      qty:
        input.inStock === false
          ? 0
          : input.stockQuantity === undefined
            ? null
            : normalizeStockQty(input.stockQuantity),
      kind: "product",
    },
  ];
}

/** Serialize color_stock for DB (omit unlimited keys to keep JSON small). */
export function serializeColorStock(
  colorIds: string[],
  stock: Record<string, StockQty>,
): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const id of colorIds) {
    if (!(id in stock)) continue;
    const qty = normalizeStockQty(stock[id]);
    if (qty === null) continue; // unlimited = omit
    out[id] = qty;
  }
  return out;
}
