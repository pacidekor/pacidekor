"use client";

import {
  clearCartAction,
  listCartAction,
  mergeGuestCartAction,
  setCartItemQuantityAction,
  upsertCartItemAction,
  type CartLineDto,
} from "@/lib/actions/cart";
import {
  cartLineCompositeKey,
  cartLineOptionKeyFromParts,
  migrateLegacyCartOptionKey,
  parseCartLineOptionKey,
} from "@/lib/cart-line-key";
import {
  subtractMergeLines,
  unionMergeLines,
} from "@/lib/cart-merge-safety";
import { getCachedClientAuthenticated } from "@/lib/client-auth";
import { adjustStockAction } from "@/lib/actions/inventory";
import {
  ensureCatalogProducts,
  reconcileCatalogProducts,
  isCatalogProductKnownUnavailable,
  type EnsureCatalogResult,
} from "@/lib/ensure-catalog-products";
import {
  findCatalogProductById,
  mergeProductsIntoCatalog,
} from "@/lib/product-catalog";
import {
  applyInventoryLocally,
  getInventoryForProduct,
  previewInventoryDelta,
  setInventory,
} from "@/lib/inventory";
import {
  amountToMinOrder,
  audienceNetFromCatalogPrice,
  formatPrice,
  meetsMinOrder,
  MIN_ORDER_TOTAL,
  parsePrice,
} from "@/lib/price";
import type { Product } from "@/lib/products";
import {
  catalogNetForTextVariant,
  findTextVariant,
} from "@/lib/product-variants";
import {
  getProductOrderMultiple,
  snapQuantityToMultiple,
} from "@/lib/taxonomy";

export {
  amountToMinOrder,
  formatPrice,
  meetsMinOrder,
  MIN_ORDER_TOTAL,
  parsePrice,
};

export const CART_KEY = "pacidekor-cart";
/**
 * Pending guest snapshot + stable mergeId (localStorage — survives reload
 * and closed tabs) until the server confirms the operation.
 */
export const CART_MERGE_PENDING_KEY = "pacidekor-cart-merge-pending";
export const CART_EVENT = "pacidekor:cart-changed";
/** Bump when stored shape changes (line_option_key). */
export const CART_STORAGE_VERSION = 2;

type PendingGuestMerge = {
  mergeId: string;
  lines: StoredCartLine[];
};

export type CartItem = {
  product: Product;
  quantity: number;
  colorId?: string;
  variantId?: string;
  lineOptionKey: string;
  /** Product missing from catalog after resolve (removed / inactive). */
  unavailable?: boolean;
};

type StoredCartLine = {
  v?: number;
  productId: string;
  quantity: number;
  slug: string;
  name: string;
  price: string;
  image: string;
  category: string;
  colorId?: string;
  variantId?: string;
  lineOptionKey: string;
};

let accountCartCache: CartLineDto[] | null = null;
type AccountCartHydration = "idle" | "pending" | "ready" | "error";
let accountCartHydration: AccountCartHydration = "idle";
/** Bumps on every account-cart write so in-flight hydrate cannot clobber optimistic adds. */
let accountCartEpoch = 0;

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CART_EVENT));
}

function useAccountCart() {
  return getCachedClientAuthenticated() === true && accountCartCache !== null;
}

export function getAccountCartHydrationState(): AccountCartHydration {
  if (getCachedClientAuthenticated() !== true) return "idle";
  if (accountCartCache !== null) return "ready";
  return accountCartHydration;
}

function normalizeStoredLine(row: Partial<StoredCartLine>): StoredCartLine | null {
  if (
    typeof row.productId !== "string" ||
    typeof row.quantity !== "number" ||
    !Number.isFinite(row.quantity) ||
    row.quantity < 1 ||
    typeof row.slug !== "string" ||
    typeof row.name !== "string" ||
    typeof row.price !== "string" ||
    typeof row.image !== "string" ||
    typeof row.category !== "string"
  ) {
    return null;
  }

  const colorId =
    typeof row.colorId === "string" && row.colorId ? row.colorId : undefined;
  const variantId =
    typeof row.variantId === "string" && row.variantId
      ? row.variantId
      : undefined;
  const lineOptionKey =
    typeof row.lineOptionKey === "string"
      ? row.lineOptionKey
      : migrateLegacyCartOptionKey(colorId);

  return {
    v: CART_STORAGE_VERSION,
    productId: row.productId,
    quantity: Math.floor(row.quantity),
    slug: row.slug,
    name: row.name,
    price: row.price,
    image: row.image,
    category: row.category,
    colorId,
    variantId,
    lineOptionKey,
  };
}

function readStored(): StoredCartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const line = normalizeStoredLine(item as Partial<StoredCartLine>);
      return line ? [line] : [];
    });
  } catch {
    return [];
  }
}

function writeStored(lines: StoredCartLine[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_KEY, JSON.stringify(lines));
  notify();
}

function clearStoredGuestCart() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CART_KEY);
}

function readPendingMerge(): PendingGuestMerge | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CART_MERGE_PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingGuestMerge;
    if (
      !parsed ||
      typeof parsed.mergeId !== "string" ||
      !parsed.mergeId.trim() ||
      !Array.isArray(parsed.lines)
    ) {
      return null;
    }
    const lines = parsed.lines.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const line = normalizeStoredLine(item as Partial<StoredCartLine>);
      return line ? [line] : [];
    });
    if (lines.length === 0) return null;
    return { mergeId: parsed.mergeId.trim(), lines };
  } catch {
    return null;
  }
}

function writePendingMerge(pending: PendingGuestMerge) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_MERGE_PENDING_KEY, JSON.stringify(pending));
}

function clearPendingMerge() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CART_MERGE_PENDING_KEY);
}

function newMergeId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `merge_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function toStoredLine(
  product: Product,
  quantity: number,
  opts: { colorId?: string; variantId?: string; lineOptionKey?: string },
): StoredCartLine {
  const lineOptionKey =
    opts.lineOptionKey ??
    cartLineOptionKeyFromParts({
      colorId: opts.colorId,
      variantId: opts.variantId,
    });
  const selection = parseCartLineOptionKey(lineOptionKey);
  return {
    v: CART_STORAGE_VERSION,
    productId: product.id,
    quantity,
    slug: product.slug,
    name: product.name,
    price: catalogPriceForSelection(product, selection),
    image: product.image,
    category: product.category,
    colorId: selection.kind === "color" ? selection.colorId : undefined,
    variantId: selection.kind === "variant" ? selection.variantId : undefined,
    lineOptionKey,
  };
}

export function catalogPriceForSelection(
  product: Product,
  selection: ReturnType<typeof parseCartLineOptionKey>,
): string {
  if (selection.kind === "variant") {
    const v = findTextVariant(product.textVariants, selection.variantId);
    if (v) {
      return catalogNetForTextVariant(v.priceCents, product.discount);
    }
  }
  return product.price;
}

function lineToCartItemFromStored(line: StoredCartLine): CartItem {
  const live = findCatalogProductById(line.productId);
  const base = {
    quantity: line.quantity,
    colorId: line.colorId,
    variantId: line.variantId,
    lineOptionKey: line.lineOptionKey,
  };
  if (live) {
    return { product: live, ...base };
  }
  if (isCatalogProductKnownUnavailable(line.productId)) {
    return {
      product: unavailableStub(line.productId),
      ...base,
      unavailable: true,
    };
  }
  return {
    product: {
      id: line.productId,
      slug: line.slug,
      name: line.name,
      description: "",
      price: line.price,
      image: line.image,
      category: line.category,
      details: [],
    } satisfies Product,
    ...base,
  };
}

function unavailableStub(productId: string): Product {
  return {
    id: productId,
    slug: "",
    name: "Produkt už nie je v ponuke",
    description: "",
    price: "0",
    image: "/banner1.webp",
    category: "",
    details: [],
    inStock: false,
  };
}

function dtoToCartItem(line: CartLineDto): CartItem | null {
  const product = findCatalogProductById(line.productId);
  const base = {
    quantity: line.quantity,
    colorId: line.colorId,
    variantId: line.variantId,
    lineOptionKey: line.lineOptionKey,
  };
  if (product) return { product, ...base };
  if (!isCatalogProductKnownUnavailable(line.productId)) return null;
  return {
    product: unavailableStub(line.productId),
    ...base,
    unavailable: true,
  };
}

function setAccountCart(lines: CartLineDto[]) {
  accountCartEpoch += 1;
  accountCartCache = lines;
  notify();
}

let accountCartWriteChain: Promise<void> = Promise.resolve();

function enqueueAccountCartWrite(task: () => Promise<void>) {
  accountCartWriteChain = accountCartWriteChain.then(task).catch(() => {});
}

const QUANTITY_SYNC_MS = 280;
const pendingQuantitySync = new Map<
  string,
  { qty: number; timer: ReturnType<typeof setTimeout> }
>();

function scheduleAccountQuantitySync(
  productId: string,
  lineOptionKey: string,
  qty: number,
) {
  const syncKey = cartLineCompositeKey(productId, lineOptionKey);
  const existing = pendingQuantitySync.get(syncKey);
  if (existing) clearTimeout(existing.timer);

  const timer = setTimeout(() => {
    const pending = pendingQuantitySync.get(syncKey);
    pendingQuantitySync.delete(syncKey);
    const targetQty = pending?.qty ?? qty;

    enqueueAccountCartWrite(async () => {
      if (pendingQuantitySync.has(syncKey)) return;
      const result = await setCartItemQuantityAction(
        productId,
        targetQty,
        lineOptionKey,
      );
      if (!result.ok) {
        if (lineQty(accountCartCache ?? [], productId, lineOptionKey) === targetQty) {
          const listed = await listCartAction();
          if (listed.ok) setAccountCart(listed.data);
        }
        window.alert(result.error);
      }
    });
  }, QUANTITY_SYNC_MS);

  pendingQuantitySync.set(syncKey, { qty, timer });
}

function patchAccountCartLine(
  lines: CartLineDto[],
  productId: string,
  lineOptionKey: string,
  quantity: number,
): CartLineDto[] {
  const selection = parseCartLineOptionKey(lineOptionKey);
  if (quantity < 1) {
    return lines.filter(
      (line) =>
        !(line.productId === productId && line.lineOptionKey === lineOptionKey),
    );
  }

  const index = lines.findIndex(
    (line) =>
      line.productId === productId && line.lineOptionKey === lineOptionKey,
  );
  const nextLine: CartLineDto = {
    productId,
    quantity,
    lineOptionKey,
    colorId: selection.kind === "color" ? selection.colorId : undefined,
    variantId: selection.kind === "variant" ? selection.variantId : undefined,
  };
  if (index >= 0) {
    const next = lines.slice();
    next[index] = nextLine;
    return next;
  }
  return [nextLine, ...lines];
}

function lineQty(
  lines: CartLineDto[],
  productId: string,
  lineOptionKey: string,
) {
  return (
    lines.find(
      (line) =>
        line.productId === productId && line.lineOptionKey === lineOptionKey,
    )?.quantity ?? 0
  );
}

export function readGuestCartLines(): CartLineDto[] {
  return readStored().map((line) => ({
    productId: line.productId,
    quantity: line.quantity,
    colorId: line.colorId,
    variantId: line.variantId,
    lineOptionKey: line.lineOptionKey,
  }));
}

export function readCartItems(): CartItem[] {
  if (useAccountCart()) {
    return (accountCartCache ?? [])
      .map(dtoToCartItem)
      .filter((item): item is CartItem => item !== null);
  }
  return readStored().map(lineToCartItemFromStored);
}

export async function hydrateGuestCartCatalog(): Promise<EnsureCatalogResult> {
  const ids = readStored().map((line) => line.productId);
  if (ids.length === 0) {
    return { ok: true, unavailableIds: [] };
  }
  const result = await reconcileCatalogProducts(ids);
  notify();
  return result;
}

export async function hydrateAccountCart(): Promise<CartItem[]> {
  const epochAtStart = accountCartEpoch;
  accountCartHydration = "pending";
  notify();
  const result = await listCartAction();
  if (!result.ok) {
    if (accountCartEpoch === epochAtStart) {
      accountCartCache = null;
    }
    accountCartHydration = "error";
    notify();
    return readCartItems();
  }
  const ensure = await reconcileCatalogProducts(
    result.data.map((line) => line.productId),
  );
  accountCartHydration = ensure.ok ? "ready" : "error";
  // Optimistic addToCart may have run while we awaited the server list —
  // keep the newer local cache; background upsert will reconcile.
  if (accountCartEpoch === epochAtStart) {
    setAccountCart(result.data);
  } else {
    notify();
  }
  return readCartItems();
}

let mergeGuestInFlight: Promise<CartItem[]> | null = null;

function storedToMergeInput(lines: StoredCartLine[]) {
  return lines.map((line) => ({
    productId: line.productId,
    quantity: line.quantity,
    colorId: line.colorId,
    variantId: line.variantId,
    lineOptionKey: line.lineOptionKey,
  }));
}

async function finishPendingGuestMerge(
  pending: PendingGuestMerge,
): Promise<CartItem[]> {
  const guest = storedToMergeInput(pending.lines);

  try {
    const result = await mergeGuestCartAction(guest, pending.mergeId);
    if (!result.ok) {
      throw new Error(result.error);
    }
    // Confirmed: drop pending and strip restored snapshot qty from live guest
    // so a later merge does not re-send them under a new mergeId. Mid-flight
    // extras beyond the snapshot remain for a subsequent merge.
    clearPendingMerge();
    writeStored(subtractMergeLines(readStored(), pending.lines));
    accountCartHydration = "pending";
    notify();
    const ensure = await reconcileCatalogProducts(
      result.data.map((line) => line.productId),
    );
    accountCartHydration = ensure.ok ? "ready" : "error";
    setAccountCart(result.data);
    return readCartItems();
  } catch (error) {
    // Keep the same mergeId for retry. Restore snapshot ∪ mid-flight live
    // so guest content remains visible until a later successful confirm.
    const restored = unionMergeLines(pending.lines, readStored());
    writeStored(restored);
    writePendingMerge(pending);
    throw error;
  }
}

/**
 * Merge guest localStorage cart into the signed-in account cart.
 * - Aborts without touching guest if the account cart cannot be listed.
 * - Stable mergeId + DB transaction: retries never double-add.
 * - Pending snapshot in localStorage survives reload / closed tabs.
 * - Mid-flight guest adds stay in the live cart key after success.
 */
export async function mergeGuestCartIntoAccount(): Promise<CartItem[]> {
  if (mergeGuestInFlight) return mergeGuestInFlight;

  mergeGuestInFlight = (async () => {
    const existingPending = readPendingMerge();
    const guestStored = readStored();

    if (guestStored.length === 0 && !existingPending) {
      return hydrateAccountCart();
    }

    // Resume interrupted merge with the same mergeId (lost response / reload).
    if (existingPending) {
      // Live guest may contain mid-flight adds and/or a restored snapshot.
      // Only the pending.lines payload is sent; live extras stay local until
      // a subsequent merge after this one confirms.
      return finishPendingGuestMerge(existingPending);
    }

    // Gate: never start a new merge if account cart cannot be loaded.
    const listed = await listCartAction();
    if (!listed.ok) {
      throw new Error(listed.error);
    }

    const pending: PendingGuestMerge = {
      mergeId: newMergeId(),
      lines: guestStored,
    };
    writePendingMerge(pending);
    // Clear live key so concurrent sync cannot re-submit; new guest adds
    // during flight land in an empty live cart and survive after confirm.
    clearStoredGuestCart();
    return finishPendingGuestMerge(pending);
  })().finally(() => {
    mergeGuestInFlight = null;
  });

  return mergeGuestInFlight;
}

export function clearAccountCartCache() {
  accountCartCache = null;
  accountCartHydration = "idle";
  notify();
}

export type AddToCartOptions = {
  colorId?: string;
  variantId?: string;
  lineOptionKey?: string;
};

export async function addToCart(
  product: Product,
  quantity = 1,
  colorIdOrOpts?: string | AddToCartOptions,
): Promise<CartItem[]> {
  const opts: AddToCartOptions =
    typeof colorIdOrOpts === "string"
      ? { colorId: colorIdOrOpts }
      : colorIdOrOpts ?? {};
  const lineOptionKey =
    opts.lineOptionKey ??
    cartLineOptionKeyFromParts({
      colorId: opts.colorId,
      variantId: opts.variantId,
    });

  const multiple = getProductOrderMultiple(product.attributes?.packaging);
  const qty = snapQuantityToMultiple(
    Math.max(1, Math.floor(quantity)),
    multiple,
  );
  if (qty <= 0) return readCartItems();

  if (getCachedClientAuthenticated() === true) {
    // Badge/count resolve via catalog — register product before optimistic patch
    // so readCartItems() includes the new line instantly (like favorites).
    mergeProductsIntoCatalog([product]);

    if (accountCartCache === null) {
      // Hydration still running — seed optimistic line so UI updates now.
      const optimisticQty = qty;
      setAccountCart(
        patchAccountCartLine([], product.id, lineOptionKey, optimisticQty),
      );

      enqueueAccountCartWrite(async () => {
        const result = await upsertCartItemAction({
          productId: product.id,
          quantity: optimisticQty,
          lineOptionKey,
          colorId: opts.colorId,
          variantId: opts.variantId,
        });
        if (!result.ok) {
          window.alert(result.error);
          const listed = await listCartAction();
          if (listed.ok) {
            await reconcileCatalogProducts(
              listed.data.map((line) => line.productId),
            );
            setAccountCart(listed.data);
          }
          return;
        }
        const listed = await listCartAction();
        if (listed.ok) {
          await reconcileCatalogProducts(
            listed.data.map((line) => line.productId),
          );
          setAccountCart(listed.data);
        } else {
          setAccountCart(result.data);
        }
      });

      return readCartItems();
    }

    const snapshot = accountCartCache;
    const nextQty = lineQty(snapshot, product.id, lineOptionKey) + qty;
    setAccountCart(
      patchAccountCartLine(snapshot, product.id, lineOptionKey, nextQty),
    );

    enqueueAccountCartWrite(async () => {
      const result = await upsertCartItemAction({
        productId: product.id,
        quantity: nextQty,
        lineOptionKey,
        colorId: opts.colorId,
        variantId: opts.variantId,
      });
      if (!result.ok) {
        if (lineQty(accountCartCache ?? [], product.id, lineOptionKey) === nextQty) {
          setAccountCart(
            patchAccountCartLine(
              accountCartCache ?? snapshot,
              product.id,
              lineOptionKey,
              lineQty(snapshot, product.id, lineOptionKey),
            ),
          );
        }
        window.alert(result.error);
      }
    });

    return readCartItems();
  }

  const lines = readStored();
  const index = lines.findIndex(
    (line) =>
      line.productId === product.id && line.lineOptionKey === lineOptionKey,
  );

  if (index >= 0) {
    const current = lines[index]!;
    lines[index] = toStoredLine(product, current.quantity + qty, {
      lineOptionKey,
    });
  } else {
    lines.push(toStoredLine(product, qty, { lineOptionKey }));
  }

  writeStored(lines);
  return lines.map(lineToCartItemFromStored);
}

export async function setCartQuantity(
  productId: string,
  quantity: number,
  lineOptionKey = "",
): Promise<CartItem[]> {
  let qty = Math.floor(quantity);
  if (qty > 0) {
    const product = findCatalogProductById(productId);
    const multiple = getProductOrderMultiple(product?.attributes?.packaging);
    qty = snapQuantityToMultiple(qty, multiple);
  }

  if (getCachedClientAuthenticated() === true) {
    if (accountCartCache === null) {
      const result = await setCartItemQuantityAction(
        productId,
        qty,
        lineOptionKey,
      );
      if (!result.ok) throw new Error(result.error);
      const listed = await listCartAction();
      if (listed.ok) setAccountCart(listed.data);
      return readCartItems();
    }

    setAccountCart(
      patchAccountCartLine(accountCartCache, productId, lineOptionKey, qty),
    );
    scheduleAccountQuantitySync(productId, lineOptionKey, qty);
    return readCartItems();
  }

  const lines = readStored();

  if (qty < 1) {
    const next = lines.filter(
      (line) =>
        !(line.productId === productId && line.lineOptionKey === lineOptionKey),
    );
    writeStored(next);
    return next.map(lineToCartItemFromStored);
  }

  const next = lines.map((line) =>
    line.productId === productId && line.lineOptionKey === lineOptionKey
      ? { ...line, quantity: qty }
      : line,
  );
  writeStored(next);
  return next.map(lineToCartItemFromStored);
}

export async function removeFromCart(
  productId: string,
  lineOptionKey = "",
): Promise<CartItem[]> {
  return setCartQuantity(productId, 0, lineOptionKey);
}

/**
 * Change color on a line: identity moves to c:{newColor}.
 * Merges quantity into an existing line with that color when present.
 */
export async function setCartLineColor(
  productId: string,
  colorId: string,
  fromLineOptionKey = "",
): Promise<CartItem[]> {
  const nextColor = colorId.trim();
  const toKey = cartLineOptionKeyFromParts({ colorId: nextColor || undefined });
  if (toKey === fromLineOptionKey) return readCartItems();

  const items = readCartItems();
  const current = items.find(
    (item) =>
      item.product.id === productId &&
      item.lineOptionKey === fromLineOptionKey,
  );
  if (!current || current.unavailable) return items;

  const qty = current.quantity;
  await removeFromCart(productId, fromLineOptionKey);
  return addToCart(current.product, qty, {
    colorId: nextColor || undefined,
    lineOptionKey: toKey,
  });
}

export async function clearCart() {
  if (getCachedClientAuthenticated() === true) {
    const snapshot = accountCartCache;
    setAccountCart([]);
    enqueueAccountCartWrite(async () => {
      const result = await clearCartAction();
      if (!result.ok) {
        if (snapshot) setAccountCart(snapshot);
        window.alert(result.error);
      }
    });
    return;
  }
  writeStored([]);
}

export type CartFillLine = {
  product: Product;
  quantity: number;
  colorId?: string;
  variantId?: string;
  lineOptionKey?: string;
};

export function replaceCartContents(lines: CartFillLine[]): number {
  const current = readCartItems();

  for (const item of current) {
    const restore = previewInventoryDelta(item.product, item.quantity);
    if (restore.ok) {
      applyInventoryLocally(item.product.id, restore.entry);
      if (restore.needsServerSync) {
        void adjustStockAction(item.product.id, item.quantity).then((result) => {
          if (!result.ok) return;
          setInventory(item.product.id, {
            inStock: result.data.inStock,
            quantity: result.data.stockQuantity,
          });
        });
      }
    }
  }

  const accepted: CartFillLine[] = [];
  for (const line of lines) {
    const qty = Math.max(1, Math.floor(line.quantity));
    const previous = getInventoryForProduct(line.product);
    const preview = previewInventoryDelta(line.product, -qty);
    if (!preview.ok) continue;
    applyInventoryLocally(line.product.id, preview.entry);
    if (preview.needsServerSync) {
      void adjustStockAction(line.product.id, -qty).then((result) => {
        if (!result.ok) {
          applyInventoryLocally(line.product.id, previous);
          return;
        }
        setInventory(line.product.id, {
          inStock: result.data.inStock,
          quantity: result.data.stockQuantity,
        });
      });
    }
    accepted.push({ ...line, quantity: qty });
  }

  if (getCachedClientAuthenticated() === true) {
    const nextDto: CartLineDto[] = accepted.map((line) => {
      const lineOptionKey =
        line.lineOptionKey ??
        cartLineOptionKeyFromParts({
          colorId: line.colorId,
          variantId: line.variantId,
        });
      const selection = parseCartLineOptionKey(lineOptionKey);
      return {
        productId: line.product.id,
        quantity: line.quantity,
        lineOptionKey,
        colorId: selection.kind === "color" ? selection.colorId : undefined,
        variantId:
          selection.kind === "variant" ? selection.variantId : undefined,
      };
    });
    setAccountCart(nextDto);

    const snapshot = nextDto;
    enqueueAccountCartWrite(async () => {
      const cleared = await clearCartAction();
      if (!cleared.ok) {
        window.alert(cleared.error);
        return;
      }
      for (const line of snapshot) {
        const result = await upsertCartItemAction({
          productId: line.productId,
          quantity: line.quantity,
          lineOptionKey: line.lineOptionKey,
          colorId: line.colorId,
          variantId: line.variantId,
        });
        if (!result.ok) {
          window.alert(result.error);
          return;
        }
      }
    });

    return accepted.length;
  }

  writeStored(
    accepted.map((line) =>
      toStoredLine(line.product, line.quantity, {
        colorId: line.colorId,
        variantId: line.variantId,
        lineOptionKey: line.lineOptionKey,
      }),
    ),
  );
  return accepted.length;
}

export type AddLinesToCartResult = {
  added: number;
  skipped: number;
};

export function addLinesToCart(lines: CartFillLine[]): AddLinesToCartResult {
  let added = 0;
  let skipped = 0;

  for (const line of lines) {
    const multiple = getProductOrderMultiple(line.product.attributes?.packaging);
    const qty = snapQuantityToMultiple(
      Math.max(1, Math.floor(line.quantity)),
      multiple,
    );
    if (qty <= 0) {
      skipped += 1;
      continue;
    }
    const previous = getInventoryForProduct(line.product);
    const preview = previewInventoryDelta(line.product, -qty);
    if (!preview.ok) {
      skipped += 1;
      continue;
    }

    applyInventoryLocally(line.product.id, preview.entry);
    if (preview.needsServerSync) {
      void adjustStockAction(line.product.id, -qty).then((result) => {
        if (!result.ok) {
          applyInventoryLocally(line.product.id, previous);
          return;
        }
        setInventory(line.product.id, {
          inStock: result.data.inStock,
          quantity: result.data.stockQuantity,
        });
      });
    }

    void addToCart(line.product, qty, {
      colorId: line.colorId,
      variantId: line.variantId,
      lineOptionKey: line.lineOptionKey,
    }).catch(() => {
      applyInventoryLocally(line.product.id, previous);
    });
    added += 1;
  }

  return { added, skipped };
}

export function cartItemCount(items: CartItem[]) {
  return items.length;
}

export function cartPieceCount(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function cartLineUnitCatalogPrice(item: CartItem): string {
  return catalogPriceForSelection(
    item.product,
    parseCartLineOptionKey(item.lineOptionKey),
  );
}

export function cartSubtotal(items: CartItem[]) {
  return items.reduce(
    (sum, item) =>
      sum + parsePrice(cartLineUnitCatalogPrice(item)) * item.quantity,
    0,
  );
}

export function cartSubtotalForAudience(
  items: CartItem[],
  isWholesale: boolean,
) {
  return items.reduce(
    (sum, item) =>
      sum +
      audienceNetFromCatalogPrice(cartLineUnitCatalogPrice(item), isWholesale) *
        item.quantity,
    0,
  );
}

/** Sum quantities of all lines for one product (stock ceiling). */
export function cartProductPieceTotal(
  items: CartItem[],
  productId: string,
): number {
  return items
    .filter((item) => item.product.id === productId)
    .reduce((sum, item) => sum + item.quantity, 0);
}
