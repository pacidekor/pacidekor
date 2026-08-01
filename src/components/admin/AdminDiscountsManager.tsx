"use client";

import Image from "next/image";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type UIEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  BadgePercent,
  Check,
  ChevronRight,
  ListFilter,
  Plus,
  Search,
  X,
} from "lucide-react";
import { formatPrice, parsePrice } from "@/lib/cart";
import {
  deleteDiscountAction,
  setDiscountActiveAction,
  upsertDiscountAction,
} from "@/lib/actions/discounts";
import {
  DISCOUNT_STATUS_META,
  computePercent,
  computeSalePrice,
  formatDiscountValidity,
  getDiscountStatus,
  getProductBasePrice,
  getProductForDiscount,
  readDiscounts,
  seedDiscounts,
  writeDiscounts,
  type DiscountStatus,
  type ProductDiscount,
} from "@/lib/discounts";
import { lockPageScroll } from "@/lib/lock-page-scroll";
import type { Product } from "@/lib/products";
import { getProductCatalog } from "@/lib/product-catalog";

type StatusFilter = "all" | DiscountStatus;
type DiscountInputMode = "percent" | "price";

/** How many products to reveal per scroll batch in the discount product picker. */
const PRODUCT_PICKER_PAGE_SIZE = 24;

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Všetky stavy" },
  { id: "active", label: "Aktívne" },
  { id: "inactive", label: "Neaktívne" },
  { id: "scheduled", label: "Naplánované" },
  { id: "expired", label: "Vypršané" },
];

/** Lowercase + strip separators so `PD-J4`, `PD J4`, `pdj4` all match the same SKU. */
function normalizeCode(value: string) {
  return value.toLowerCase().replace(/[\s\-_./]/g, "");
}

function productMatchesSearch(product: Product, rawQuery: string) {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;

  const qCode = normalizeCode(q);
  const name = product.name.toLowerCase();
  const sku = (product.sku ?? "").toLowerCase();
  const skuCode = normalizeCode(product.sku ?? "");
  const category = product.category.toLowerCase();

  if (name.includes(q) || category.includes(q)) return true;
  if (sku.includes(q)) return true;
  // Match SKU without hyphens/spaces (e.g. query `PDJ4` vs sku `PD-J4L3…`)
  if (qCode.length >= 2 && skuCode.includes(qCode)) return true;
  return false;
}

/** Lower rank = better match. Prefer SKU hits so code search surfaces the right product. */
function productSearchRank(product: Product, rawQuery: string): number {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return 0;

  const qCode = normalizeCode(q);
  const name = product.name.toLowerCase();
  const sku = (product.sku ?? "").toLowerCase();
  const skuCode = normalizeCode(product.sku ?? "");

  if (sku === q || skuCode === qCode) return 0;
  if (sku.startsWith(q) || (qCode.length >= 2 && skuCode.startsWith(qCode))) {
    return 1;
  }
  if (sku.includes(q) || (qCode.length >= 2 && skuCode.includes(qCode))) {
    return 2;
  }
  if (name.startsWith(q)) return 3;
  if (name.includes(q)) return 4;
  return 5;
}

function filterProductsBySearch(products: Product[], rawQuery: string) {
  const q = rawQuery.trim();
  if (!q) return products;

  return products
    .filter((product) => productMatchesSearch(product, q))
    .sort((a, b) => {
      const rankDiff = productSearchRank(a, q) - productSearchRank(b, q);
      if (rankDiff !== 0) return rankDiff;
      return a.name.localeCompare(b.name, "sk");
    });
}

function priceInputValue(price: string) {
  return price.replace(/\s/g, "").replace("€", "").trim();
}

function normalizePriceInput(raw: string) {
  const parsed = parsePrice(raw.includes("€") ? raw : `${raw} €`);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return formatPrice(parsed);
}

function toDateInputValue(iso?: string) {
  return iso ?? "";
}

export function AdminDiscountsManager() {
  const [list, setList] = useState<ProductDiscount[]>(seedDiscounts);
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setList(readDiscounts());
    setHydrated(true);
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const selected = creating
    ? null
    : (list.find((item) => item.id === selectedId) ?? null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return list.filter((discount) => {
      const status = getDiscountStatus(discount);
      if (statusFilter !== "all" && status !== statusFilter) return false;

      const product = getProductForDiscount(discount.productId);
      if (!q) return true;

      if (product && productMatchesSearch(product, q)) return true;

      const haystack = [
        discount.originalPrice,
        discount.salePrice,
        DISCOUNT_STATUS_META[status].label,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [list, query, statusFilter]);

  const activeFilterCount = statusFilter !== "all" ? 1 : 0;

  const productsWithDiscount = useMemo(
    () => new Set(list.map((item) => item.productId)),
    [list],
  );

  function persist(next: ProductDiscount[]) {
    setList(next);
    writeDiscounts(next);
  }

  function flashSaved() {
    setSavedFlash(true);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setSavedFlash(false), 2200);
  }

  function openCreate() {
    setCreating(true);
    setSelectedId(null);
  }

  function openDiscount(id: string) {
    setCreating(false);
    setSelectedId(id);
  }

  function closeEditor() {
    setCreating(false);
    setSelectedId(null);
  }

  async function saveDiscount(next: Omit<ProductDiscount, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
  }) {
    const result = await upsertDiscountAction({
      id: creating || !next.id ? undefined : next.id,
      productId: next.productId,
      originalPrice: next.originalPrice,
      salePrice: next.salePrice,
      discountPercent: next.discountPercent,
      showOnAkciaPage: next.showOnAkciaPage,
      active: next.active,
      startsAt: next.startsAt,
      endsAt: next.endsAt,
    });

    if (!result.ok) {
      window.alert(result.error);
      return;
    }

    const saved = result.data;
    const withoutProduct = list.filter(
      (item) => item.productId !== saved.productId && item.id !== saved.id,
    );
    persist([saved, ...withoutProduct]);
    flashSaved();
    closeEditor();
  }

  async function endDiscount(id: string) {
    const result = await setDiscountActiveAction(id, false);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    persist(
      list.map((item) => (item.id === id ? result.data : item)),
    );
    flashSaved();
  }

  async function deleteDiscount(id: string) {
    const result = await deleteDiscountAction(id);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    persist(list.filter((item) => item.id !== id));
    flashSaved();
    closeEditor();
  }

  if (!hydrated) {
    return (
      <div>
        <div className="h-16 animate-pulse rounded-2xl bg-white/60" />
        <div className="mt-5 h-64 animate-pulse rounded-2xl bg-white/60" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-semibold text-[#2f2924] sm:text-3xl">
            Zľavy
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#2f2924]/65 sm:text-base">
            Správa akciových cien produktov.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-11 w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#75825B] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:w-auto sm:self-start"
        >
          <Plus className="size-4" strokeWidth={2} aria-hidden />
          Pridať zľavu
        </button>
      </div>

      <div className="mt-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full min-w-0 sm:max-w-md sm:flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#2f2924]/35"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Hľadať podľa produktu alebo SKU…"
              className="h-11 w-full rounded-xl border border-black/10 bg-white pr-4 pl-10 text-sm text-[#2f2924] outline-none placeholder:text-[#2f2924]/35 transition-colors focus:border-[#75825B] focus:ring-2 focus:ring-[#75825B]/20"
            />
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-sm font-medium text-[#2f2924] transition-colors hover:border-[#75825B]/40 sm:ml-auto sm:w-auto"
          >
            <ListFilter className="size-4" strokeWidth={1.75} aria-hidden />
            Filtrovať
            {activeFilterCount > 0 ? (
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#75825B] text-[11px] font-semibold text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>

        <section className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
          <div className="hidden items-center gap-4 border-b border-black/[0.05] px-5 py-3 text-xs font-medium tracking-wide text-[#2f2924]/45 uppercase lg:flex">
            <span className="min-w-0 flex-1">Produkt</span>
            <span className="w-[6.5rem] shrink-0 text-right">Pôvodná</span>
            <span className="w-[6.5rem] shrink-0 text-right">Akciová</span>
            <span className="w-14 shrink-0 text-right">Zľava</span>
            <span className="w-[9.5rem] shrink-0">Platnosť</span>
            <span className="w-16 shrink-0 text-center">Akcia</span>
            <span className="w-[7.5rem] shrink-0">Stav</span>
            <span className="w-20 shrink-0" aria-hidden />
          </div>

          {filtered.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#e8ebe2] text-[#75825B]">
                <BadgePercent className="size-5" aria-hidden />
              </span>
              <p className="mt-4 text-sm font-medium text-[#2f2924]">
                {list.length === 0
                  ? "Zatiaľ žiadne zľavy"
                  : "Žiadne zľavy podľa filtra"}
              </p>
              <p className="mt-1 text-sm text-[#2f2924]/50">
                {list.length === 0
                  ? "Pridajte prvú akciovú cenu produktu."
                  : "Skúste zmeniť filter alebo vyhľadávanie."}
              </p>
              {list.length === 0 ? (
                <button
                  type="button"
                  onClick={openCreate}
                  className="mt-5 inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-[#75825B] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  <Plus className="size-4" strokeWidth={2} aria-hidden />
                  Pridať zľavu
                </button>
              ) : null}
            </div>
          ) : (
            <ul className="divide-y divide-black/[0.05]">
              {filtered.map((discount) => {
                const product = getProductForDiscount(discount.productId);
                const status = getDiscountStatus(discount);
                const meta = DISCOUNT_STATUS_META[status];

                return (
                  <li key={discount.id}>
                    <div className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:gap-4">
                      <button
                        type="button"
                        onClick={() => openDiscount(discount.id)}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                      >
                        <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-[#e8ebe2]">
                          {product?.image ? (
                            <Image
                              src={product.image}
                              alt=""
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <span className="flex size-full items-center justify-center text-[#75825B]">
                              <BadgePercent className="size-5" aria-hidden />
                            </span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-medium text-[#2f2924]">
                            {product?.name ?? "Neznámy produkt"}
                          </span>
                          <span className="mt-0.5 block truncate text-sm text-[#2f2924]/45">
                            {product?.sku
                              ? `SKU ${product.sku}`
                              : (product?.category ?? "Produkt bol odstránený")}
                          </span>
                        </span>
                      </button>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-[3.75rem] text-sm lg:contents lg:pl-0">
                        <p className="tabular-nums text-[#2f2924]/55 lg:w-[6.5rem] lg:shrink-0 lg:text-right">
                          <span className="lg:hidden">Pôvodná: </span>
                          {discount.originalPrice}
                        </p>
                        <p className="font-medium tabular-nums text-[#2f2924] lg:w-[6.5rem] lg:shrink-0 lg:text-right">
                          <span className="lg:hidden">Akciová: </span>
                          {discount.salePrice}
                        </p>
                        <p className="font-semibold tabular-nums text-[#75825B] lg:w-14 lg:shrink-0 lg:text-right">
                          -{discount.discountPercent}%
                        </p>
                        <p className="text-[#2f2924]/55 lg:w-[9.5rem] lg:shrink-0">
                          {formatDiscountValidity(discount)}
                        </p>
                        <p className="text-center text-[#2f2924]/70 lg:w-16 lg:shrink-0">
                          {discount.showOnAkciaPage ? "Áno" : "Nie"}
                        </p>
                        <div className="lg:w-[7.5rem] lg:shrink-0">
                          <span
                            className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold ${meta.className}`}
                          >
                            {meta.label}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pl-[3.75rem] lg:w-20 lg:shrink-0 lg:justify-end lg:pl-0">
                        {status === "active" || status === "scheduled" ? (
                          <button
                            type="button"
                            onClick={() => endDiscount(discount.id)}
                            className="inline-flex h-8 cursor-pointer items-center rounded-lg px-2.5 text-xs font-medium text-[#c45c4a] transition-colors hover:bg-[#c45c4a]/8"
                          >
                            Ukončiť
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openDiscount(discount.id)}
                            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-[#2f2924]/35 transition-colors hover:bg-[#e8ebe2] hover:text-[#2f2924]"
                            aria-label="Upraviť zľavu"
                          >
                            <ChevronRight className="size-4" aria-hidden />
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {filtersOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <button
            type="button"
            className="absolute inset-0 cursor-pointer"
            aria-label="Zavrieť filtre"
            onClick={() => setFiltersOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-[0_16px_48px_rgba(47,41,36,0.16)]">
            <div className="flex items-center justify-between border-b border-black/6 px-5 py-4">
              <h2 className="font-heading text-lg text-[#2f2924]">Filtre</h2>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-[#2f2924]/55 transition-colors hover:bg-[#e8ebe2] hover:text-[#2f2924]"
                aria-label="Zavrieť"
              >
                <X className="size-4" strokeWidth={1.75} aria-hidden />
              </button>
            </div>
            <div className="space-y-4 px-5 py-5">
              <fieldset>
                <legend className="text-sm font-medium text-[#2f2924]">
                  Stav zľavy
                </legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {STATUS_FILTERS.map((filter) => {
                    const selectedFilter = statusFilter === filter.id;
                    return (
                      <button
                        key={filter.id}
                        type="button"
                        onClick={() => setStatusFilter(filter.id)}
                        className={`inline-flex h-9 cursor-pointer items-center rounded-xl border px-3 text-sm font-medium transition-colors ${
                          selectedFilter
                            ? "border-[#75825B] bg-[#e8ebe2] text-[#5a6648]"
                            : "border-black/10 bg-white text-[#2f2924]/70 hover:border-[#75825B]/35"
                        }`}
                      >
                        {filter.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-black/6 px-5 py-4">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className="cursor-pointer text-sm font-medium text-[#2f2924]/55 transition-colors hover:text-[#2f2924]"
              >
                Resetovať
              </button>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="inline-flex h-10 cursor-pointer items-center rounded-xl bg-[#75825B] px-5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Použiť
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {creating || selected ? (
        <DiscountEditor
          key={creating ? "__new__" : selected!.id}
          discount={selected}
          isNew={creating}
          productsWithDiscount={productsWithDiscount}
          onClose={closeEditor}
          onSave={saveDiscount}
          onDelete={selected ? () => deleteDiscount(selected.id) : undefined}
          onEnd={
            selected &&
            (getDiscountStatus(selected) === "active" ||
              getDiscountStatus(selected) === "scheduled")
              ? () => {
                  endDiscount(selected.id);
                  closeEditor();
                }
              : undefined
          }
        />
      ) : null}

      <div
        aria-live="polite"
        className={`fixed right-5 bottom-5 z-[60] transition-all duration-300 ${
          savedFlash
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        <div className="inline-flex items-center gap-2.5 rounded-xl bg-[#75825B] px-4 py-3 text-sm font-medium text-white shadow-[0_12px_32px_rgba(47,41,36,0.18)]">
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-white/15">
            <Check className="size-3.5" strokeWidth={2.25} aria-hidden />
          </span>
          Zmeny boli uložené
        </div>
      </div>
    </div>
  );
}

function DiscountEditor({
  discount,
  isNew,
  productsWithDiscount,
  onClose,
  onSave,
  onDelete,
  onEnd,
}: {
  discount: ProductDiscount | null;
  isNew: boolean;
  productsWithDiscount: Set<string>;
  onClose: () => void;
  onSave: (
    next: Omit<ProductDiscount, "id" | "createdAt" | "updatedAt"> & {
      id?: string;
    },
  ) => void | Promise<void>;
  onDelete?: () => void;
  onEnd?: () => void;
}) {
  const initialProduct = discount
    ? getProductForDiscount(discount.productId)
    : null;

  const [entered, setEntered] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [visibleProductCount, setVisibleProductCount] = useState(
    PRODUCT_PICKER_PAGE_SIZE,
  );
  const [productId, setProductId] = useState(discount?.productId ?? "");
  const [originalPriceRaw, setOriginalPriceRaw] = useState(
    discount ? priceInputValue(discount.originalPrice) : "",
  );
  const [salePriceRaw, setSalePriceRaw] = useState(
    discount ? priceInputValue(discount.salePrice) : "",
  );
  const [percentRaw, setPercentRaw] = useState(
    discount ? String(discount.discountPercent) : "20",
  );
  const [inputMode, setInputMode] = useState<DiscountInputMode>("percent");
  const [showOnAkciaPage, setShowOnAkciaPage] = useState(
    discount?.showOnAkciaPage ?? true,
  );
  const [active, setActive] = useState(discount?.active ?? true);
  const [startsAt, setStartsAt] = useState(toDateInputValue(discount?.startsAt));
  const [endsAt, setEndsAt] = useState(toDateInputValue(discount?.endsAt));
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedProduct =
    getProductCatalog().find((product) => product.id === productId) ??
    initialProduct;

  const availableProducts = useMemo(() => {
    return getProductCatalog().filter((product) => {
      if (product.id === discount?.productId) return true;
      return !productsWithDiscount.has(product.id);
    });
  }, [discount?.productId, productsWithDiscount]);

  const filteredProducts = useMemo(
    () => filterProductsBySearch(availableProducts, productQuery),
    [availableProducts, productQuery],
  );

  const visibleProducts = useMemo(
    () => filteredProducts.slice(0, visibleProductCount),
    [filteredProducts, visibleProductCount],
  );

  const hasMoreProducts = visibleProductCount < filteredProducts.length;

  useEffect(() => {
    setVisibleProductCount(PRODUCT_PICKER_PAGE_SIZE);
  }, [productQuery]);

  function onProductListScroll(event: UIEvent<HTMLUListElement>) {
    if (!hasMoreProducts) return;
    const list = event.currentTarget;
    const nearBottom =
      list.scrollTop + list.clientHeight >= list.scrollHeight - 48;
    if (!nearBottom) return;
    setVisibleProductCount((count) =>
      Math.min(count + PRODUCT_PICKER_PAGE_SIZE, filteredProducts.length),
    );
  }

  const panelOpen = entered && !exiting;

  function editorSnapshot(value: {
    productId: string;
    originalPriceRaw: string;
    salePriceRaw: string;
    percentRaw: string;
    inputMode: DiscountInputMode;
    showOnAkciaPage: boolean;
    active: boolean;
    startsAt: string;
    endsAt: string;
  }) {
    return JSON.stringify(value);
  }

  const initialSnapshotRef = useRef(
    editorSnapshot({
      productId: discount?.productId ?? "",
      originalPriceRaw: discount
        ? priceInputValue(discount.originalPrice)
        : "",
      salePriceRaw: discount ? priceInputValue(discount.salePrice) : "",
      percentRaw: discount ? String(discount.discountPercent) : "20",
      inputMode: "percent",
      showOnAkciaPage: discount?.showOnAkciaPage ?? true,
      active: discount?.active ?? true,
      startsAt: toDateInputValue(discount?.startsAt),
      endsAt: toDateInputValue(discount?.endsAt),
    }),
  );

  const isDirty =
    editorSnapshot({
      productId,
      originalPriceRaw,
      salePriceRaw,
      percentRaw,
      inputMode,
      showOnAkciaPage,
      active,
      startsAt,
      endsAt,
    }) !== initialSnapshotRef.current;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const unlock = lockPageScroll();
    const enterFrame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(enterFrame);
      unlock();
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  function selectProduct(product: Product) {
    if (!isNew) return;
    setProductId(product.id);
    const base = getProductBasePrice(product);
    setOriginalPriceRaw(priceInputValue(base));
    const percent = Number.parseInt(percentRaw, 10);
    const safePercent = Number.isFinite(percent) ? percent : 20;
    setPercentRaw(String(safePercent));
    setSalePriceRaw(priceInputValue(computeSalePrice(base, safePercent)));
    setProductQuery("");
  }

  function updatePercent(value: string) {
    setPercentRaw(value);
    setInputMode("percent");
    const percent = Number.parseInt(value, 10);
    if (!Number.isFinite(percent)) return;
    const original = normalizePriceInput(originalPriceRaw);
    if (!original) return;
    setSalePriceRaw(priceInputValue(computeSalePrice(original, percent)));
  }

  function updateOriginal(value: string) {
    setOriginalPriceRaw(value);
    const original = normalizePriceInput(value);
    if (!original) return;
    if (inputMode === "percent") {
      const percent = Number.parseInt(percentRaw, 10);
      if (!Number.isFinite(percent)) return;
      setSalePriceRaw(priceInputValue(computeSalePrice(original, percent)));
    } else {
      const sale = normalizePriceInput(salePriceRaw);
      if (!sale) return;
      setPercentRaw(String(computePercent(original, sale)));
    }
  }

  function updateSale(value: string) {
    setSalePriceRaw(value);
    setInputMode("price");
    const original = normalizePriceInput(originalPriceRaw);
    const sale = normalizePriceInput(value);
    if (!original || !sale) return;
    setPercentRaw(String(computePercent(original, sale)));
  }

  function closePanel() {
    if (exiting) return;
    setDiscardOpen(false);
    setDeleteOpen(false);
    setExiting(true);
    closeTimeoutRef.current = setTimeout(() => {
      onClose();
    }, 320);
  }

  function requestClose() {
    if (exiting) return;
    if (deleteOpen) {
      setDeleteOpen(false);
      return;
    }
    if (isDirty) {
      setDiscardOpen(true);
      return;
    }
    closePanel();
  }

  function buildPayload() {
    const originalPrice = normalizePriceInput(originalPriceRaw);
    const salePrice = normalizePriceInput(salePriceRaw);
    const percent = Number.parseInt(percentRaw, 10);

    if (!productId || !originalPrice || !salePrice || !Number.isFinite(percent)) {
      return null;
    }

    if (parsePrice(salePrice) >= parsePrice(originalPrice)) {
      return null;
    }

    return {
      id: discount?.id,
      productId,
      originalPrice,
      salePrice,
      discountPercent: Math.min(100, Math.max(1, percent)),
      showOnAkciaPage,
      active,
      startsAt: startsAt || undefined,
      endsAt: endsAt || undefined,
    };
  }

  async function saveAndClose() {
    if (exiting || saving) return;
    const payload = buildPayload();
    if (!payload) return;
    setSaving(true);
    try {
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!onDelete || exiting) return;
    setDeleteOpen(false);
    setDiscardOpen(false);
    setExiting(true);
    closeTimeoutRef.current = setTimeout(() => {
      onDelete();
    }, 320);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    saveAndClose();
  }

  const canSave = Boolean(buildPayload());

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex justify-end transition-colors duration-300 ${
        panelOpen ? "bg-black/30" : "bg-black/0"
      }`}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-pointer"
        aria-label="Zavrieť"
        onClick={requestClose}
      />
      <aside
        className={`relative z-10 flex h-full w-full max-w-xl flex-col bg-white shadow-[-12px_0_40px_rgba(47,41,36,0.14)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          panelOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="discount-editor-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-black/6 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-[0.12em] text-[#75825B] uppercase">
              {isNew ? "Nová zľava" : "Úprava zľavy"}
            </p>
            <h2
              id="discount-editor-title"
              className="mt-1 truncate font-heading text-lg text-[#2f2924]"
            >
              {selectedProduct?.name ?? "Vyberte produkt"}
            </h2>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg text-[#2f2924]/55 transition-colors hover:bg-[#e8ebe2] hover:text-[#2f2924]"
            aria-label="Zavrieť"
          >
            <X className="size-4" strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium text-[#2f2924]">Produkt</p>
                {isNew ? (
                  <div className="mt-2 space-y-2">
                    <div className="relative">
                      <Search
                        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#2f2924]/35"
                        aria-hidden
                      />
                      <input
                        type="search"
                        value={productQuery}
                        onChange={(event) => setProductQuery(event.target.value)}
                        placeholder="Hľadať podľa názvu alebo kódu (SKU)…"
                        className="h-11 w-full rounded-xl border border-black/10 bg-[#faf8f5] pr-4 pl-10 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:bg-white"
                      />
                    </div>
                    {selectedProduct ? (
                      <div className="flex items-center gap-3 rounded-xl border border-[#75825B]/25 bg-[#e8ebe2]/50 px-3 py-2.5">
                        <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-white">
                          <Image
                            src={selectedProduct.image}
                            alt=""
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[#2f2924]">
                            {selectedProduct.name}
                          </p>
                          <p className="truncate text-xs text-[#2f2924]/50">
                            {selectedProduct.sku
                              ? selectedProduct.sku
                              : selectedProduct.category}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setProductId("");
                            setOriginalPriceRaw("");
                            setSalePriceRaw("");
                          }}
                          className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-[#2f2924]/45 transition-colors hover:bg-white hover:text-[#2f2924]"
                          aria-label="Zrušiť výber produktu"
                        >
                          <X className="size-3.5" aria-hidden />
                        </button>
                      </div>
                    ) : (
                      <ul
                        className="max-h-72 overflow-y-auto rounded-xl border border-black/10 bg-[#faf8f5]"
                        onScroll={onProductListScroll}
                      >
                        {filteredProducts.length === 0 ? (
                          <li className="px-4 py-6 text-center text-sm text-[#2f2924]/50">
                            Žiadny dostupný produkt
                          </li>
                        ) : (
                          <>
                            {visibleProducts.map((product) => (
                              <li key={product.id}>
                                <button
                                  type="button"
                                  onClick={() => selectProduct(product)}
                                  className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white"
                                >
                                  <span className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-white">
                                    <Image
                                      src={product.image}
                                      alt=""
                                      fill
                                      sizes="36px"
                                      className="object-cover"
                                    />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium text-[#2f2924]">
                                      {product.name}
                                    </span>
                                    <span className="block truncate text-xs text-[#2f2924]/45">
                                      {product.sku
                                        ? `${product.sku} · ${getProductBasePrice(product)}`
                                        : getProductBasePrice(product)}
                                    </span>
                                  </span>
                                </button>
                              </li>
                            ))}
                            {hasMoreProducts ? (
                              <li className="px-3 py-2 text-center text-xs text-[#2f2924]/40">
                                Scrollujte pre ďalšie produkty…
                              </li>
                            ) : null}
                          </>
                        )}
                      </ul>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-3 rounded-xl border border-black/10 bg-[#faf8f5] px-3 py-2.5">
                    <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-white">
                      {selectedProduct?.image ? (
                        <Image
                          src={selectedProduct.image}
                          alt=""
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      ) : null}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#2f2924]">
                        {selectedProduct?.name ?? "Neznámy produkt"}
                      </p>
                      <p className="truncate text-xs text-[#2f2924]/50">
                        Produkt nie je možné zmeniť
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-[#2f2924]">
                  Pôvodná cena
                  <input
                    type="text"
                    inputMode="decimal"
                    value={originalPriceRaw}
                    onChange={(event) => updateOriginal(event.target.value)}
                    placeholder="24,90"
                    className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-[#faf8f5] px-3.5 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:bg-white"
                  />
                </label>
                <label className="block text-sm font-medium text-[#2f2924]">
                  Akciová cena
                  <input
                    type="text"
                    inputMode="decimal"
                    value={salePriceRaw}
                    onChange={(event) => updateSale(event.target.value)}
                    placeholder="17,90"
                    className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-[#faf8f5] px-3.5 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:bg-white"
                  />
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[#2f2924]">
                    Typ zadania zľavy
                  </p>
                  <div className="inline-flex rounded-xl border border-black/10 bg-[#faf8f5] p-1">
                    <button
                      type="button"
                      onClick={() => setInputMode("percent")}
                      className={`inline-flex h-8 cursor-pointer items-center rounded-lg px-3 text-xs font-medium transition-colors ${
                        inputMode === "percent"
                          ? "bg-white text-[#75825B] shadow-sm"
                          : "text-[#2f2924]/55"
                      }`}
                    >
                      Percento
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMode("price")}
                      className={`inline-flex h-8 cursor-pointer items-center rounded-lg px-3 text-xs font-medium transition-colors ${
                        inputMode === "price"
                          ? "bg-white text-[#75825B] shadow-sm"
                          : "text-[#2f2924]/55"
                      }`}
                    >
                      Nová cena
                    </button>
                  </div>
                </div>
                <label className="mt-3 block text-sm font-medium text-[#2f2924]">
                  Zľava (%)
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={percentRaw}
                    onChange={(event) => updatePercent(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-[#faf8f5] px-3.5 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:bg-white"
                  />
                </label>
                <p className="mt-2 text-sm text-[#2f2924]/50">
                  Badge na eshope: −{percentRaw || "0"}%
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-[#2f2924]">
                  Platnosť od
                  <input
                    type="date"
                    value={startsAt}
                    onChange={(event) => setStartsAt(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-[#faf8f5] px-3.5 text-sm text-[#2f2924] outline-none transition-colors focus:border-[#75825B] focus:bg-white"
                  />
                </label>
                <label className="block text-sm font-medium text-[#2f2924]">
                  Platnosť do
                  <input
                    type="date"
                    value={endsAt}
                    onChange={(event) => setEndsAt(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-[#faf8f5] px-3.5 text-sm text-[#2f2924] outline-none transition-colors focus:border-[#75825B] focus:bg-white"
                  />
                </label>
              </div>

              <div className="space-y-3 rounded-xl border border-black/8 bg-[#faf8f5] p-4">
                <ToggleRow
                  label="Aktívna"
                  description="Neaktívna zľava sa na eshope nezobrazí."
                  checked={active}
                  onChange={setActive}
                />
                <ToggleRow
                  label="Zobraziť na stránke Akcia"
                  description="Produkt sa objaví v sekcii Akcia a na /akcia."
                  checked={showOnAkciaPage}
                  onChange={setShowOnAkciaPage}
                />
              </div>
            </div>
          </div>

          <div className="relative z-10 shrink-0 border-t border-black/6 bg-white px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              {onDelete ? (
                <button
                  type="button"
                  onClick={() => {
                    setDiscardOpen(false);
                    setDeleteOpen(true);
                  }}
                  disabled={exiting}
                  className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-[#c45c4a]/30 px-4 text-sm font-medium text-[#c45c4a] transition-colors hover:bg-[#c45c4a]/8 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                >
                  Odstrániť
                </button>
              ) : null}
              {onEnd ? (
                <button
                  type="button"
                  onClick={onEnd}
                  disabled={exiting}
                  className="inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-black/10 px-4 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#e8ebe2]/60 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Ukončiť zľavu
                </button>
              ) : null}
              <button
                type="submit"
                disabled={!canSave || exiting || saving}
                className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-[#75825B] text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:ml-auto sm:w-auto sm:min-w-[12rem] sm:px-8"
              >
                Uložiť
              </button>
            </div>
          </div>
        </form>

        {discardOpen ? (
          <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/35 px-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="unsaved-discount-title"
              className="w-full max-w-sm rounded-2xl border border-black/8 bg-white p-5 shadow-[0_20px_48px_rgba(47,41,36,0.2)]"
            >
              <h3
                id="unsaved-discount-title"
                className="font-heading text-lg text-[#2f2924]"
              >
                Máte neuložené zmeny
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#2f2924]/65">
                Ak panel zatvoríte, úpravy sa stratia. Chcete ich zahodiť?
              </p>
              <div className="mt-5 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={closePanel}
                  className="inline-flex h-10 w-1/2 cursor-pointer items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#e8ebe2]/60"
                >
                  Zahodiť zmeny
                </button>
                <button
                  type="button"
                  onClick={saveAndClose}
                  disabled={!canSave || exiting || saving}
                  className="inline-flex h-10 w-1/2 cursor-pointer items-center justify-center rounded-xl bg-[#75825B] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Uložiť zmeny
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {deleteOpen ? (
          <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/35 px-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-discount-title"
              className="w-full max-w-sm rounded-2xl border border-black/8 bg-white p-5 shadow-[0_20px_48px_rgba(47,41,36,0.2)]"
            >
              <h3
                id="delete-discount-title"
                className="font-heading text-lg text-[#2f2924]"
              >
                Odstrániť zľavu?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#2f2924]/65">
                Zľava sa odstráni zo zoznamu. Produkt sa vráti na pôvodnú cenu.
              </p>
              <div className="mt-5 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeleteOpen(false)}
                  className="inline-flex h-10 w-1/2 cursor-pointer items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#e8ebe2]/60"
                >
                  Zrušiť
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={exiting}
                  className="inline-flex h-10 w-1/2 cursor-pointer items-center justify-center rounded-xl bg-[#c45c4a] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Odstrániť
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-[#2f2924]">{label}</p>
        <p className="mt-0.5 text-sm text-[#2f2924]/50">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
          checked ? "bg-[#75825B]" : "bg-[#2f2924]/20"
        }`}
      >
        <span
          className={`inline-block size-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
