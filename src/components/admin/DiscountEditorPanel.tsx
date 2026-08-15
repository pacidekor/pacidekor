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
import { Search, X } from "lucide-react";
import { formatPrice, parsePrice } from "@/lib/cart";
import type { AdminPromoCode } from "@/lib/actions/promo";
import {
  computePercent,
  computeSalePrice,
  getProductBasePrice,
  getProductForDiscount,
  type ProductDiscount,
} from "@/lib/discounts";
import { lockPageScroll } from "@/lib/lock-page-scroll";
import { normalizePromoCode } from "@/lib/promo";
import type { Product } from "@/lib/products";
import { getProductCatalog } from "@/lib/product-catalog";

type DiscountKind = "product" | "promo";
type DiscountInputMode = "percent" | "price";

export type EditorTarget =
  | { mode: "create" }
  | { mode: "product"; discount: ProductDiscount }
  | { mode: "promo"; promo: AdminPromoCode };

/** How many products to reveal per scroll batch in the discount product picker. */
const PRODUCT_PICKER_PAGE_SIZE = 24;

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

const fieldInputClass =
  "mt-2 h-11 w-full rounded-xl border border-black/10 bg-[#faf8f5] px-3.5 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:bg-white";

const dateInputClass =
  "mt-2 h-11 w-full rounded-xl border border-black/10 bg-[#faf8f5] px-3.5 text-sm text-[#2f2924] outline-none transition-colors focus:border-[#75825B] focus:bg-white";

export function DiscountEditorPanel({
  target,
  productsWithDiscount,
  onClose,
  onSaveProduct,
  onSavePromo,
  onDelete,
  onEnd,
}: {
  target: EditorTarget;
  productsWithDiscount: Set<string>;
  onClose: () => void;
  onSaveProduct: (
    next: Omit<ProductDiscount, "id" | "createdAt" | "updatedAt"> & {
      id?: string;
    },
  ) => void | Promise<void>;
  onSavePromo: (next: {
    id?: string;
    code: string;
    discountPercent: number;
    active: boolean;
    startsAt?: string;
    endsAt?: string;
    minOrderEur?: number;
    maxUses?: number;
    note?: string;
  }) => void | Promise<void>;
  onDelete?: () => void;
  onEnd?: () => void;
}) {
  const isCreate = target.mode === "create";
  const discount = target.mode === "product" ? target.discount : null;
  const promo = target.mode === "promo" ? target.promo : null;

  const lockedKind: DiscountKind =
    target.mode === "promo"
      ? "promo"
      : target.mode === "product"
        ? "product"
        : "product";

  const [kind, setKind] = useState<DiscountKind>(lockedKind);
  const effectiveKind = isCreate ? kind : lockedKind;

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
  const [active, setActive] = useState(discount?.active ?? promo?.active ?? true);
  const [startsAt, setStartsAt] = useState(
    toDateInputValue(discount?.startsAt ?? promo?.startsAt),
  );
  const [endsAt, setEndsAt] = useState(
    toDateInputValue(discount?.endsAt ?? promo?.endsAt),
  );

  const [promoCode, setPromoCode] = useState(promo?.code ?? "");
  const [promoPercentRaw, setPromoPercentRaw] = useState(
    promo ? String(promo.discountPercent) : "10",
  );
  const [maxUsesRaw, setMaxUsesRaw] = useState(
    promo?.maxUses != null ? String(promo.maxUses) : "",
  );
  const [minOrderRaw, setMinOrderRaw] = useState(
    promo?.minOrderEur != null
      ? promo.minOrderEur.toFixed(2).replace(".", ",")
      : "",
  );
  const [note, setNote] = useState(promo?.note ?? "");

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

  function productSnapshot(value: {
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

  function promoSnapshot(value: {
    promoCode: string;
    promoPercentRaw: string;
    active: boolean;
    startsAt: string;
    endsAt: string;
    maxUsesRaw: string;
    minOrderRaw: string;
    note: string;
  }) {
    return JSON.stringify(value);
  }

  const initialProductSnapshotRef = useRef(
    productSnapshot({
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

  const initialPromoSnapshotRef = useRef(
    promoSnapshot({
      promoCode: promo?.code ?? "",
      promoPercentRaw: promo ? String(promo.discountPercent) : "10",
      active: promo?.active ?? true,
      startsAt: toDateInputValue(promo?.startsAt),
      endsAt: toDateInputValue(promo?.endsAt),
      maxUsesRaw: promo?.maxUses != null ? String(promo.maxUses) : "",
      minOrderRaw:
        promo?.minOrderEur != null
          ? promo.minOrderEur.toFixed(2).replace(".", ",")
          : "",
      note: promo?.note ?? "",
    }),
  );

  const isProductDirty =
    productSnapshot({
      productId,
      originalPriceRaw,
      salePriceRaw,
      percentRaw,
      inputMode,
      showOnAkciaPage,
      active,
      startsAt,
      endsAt,
    }) !== initialProductSnapshotRef.current;

  const isPromoDirty =
    promoSnapshot({
      promoCode,
      promoPercentRaw,
      active,
      startsAt,
      endsAt,
      maxUsesRaw,
      minOrderRaw,
      note,
    }) !== initialPromoSnapshotRef.current;

  const isDirty =
    effectiveKind === "product" ? isProductDirty : isPromoDirty;

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
    if (!isCreate) return;
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

  function updatePromoCode(value: string) {
    setPromoCode(normalizePromoCode(value));
  }

  function buildProductPayload() {
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

  function buildPromoPayload() {
    const code = normalizePromoCode(promoCode);
    const percent = Number.parseInt(promoPercentRaw, 10);
    if (code.length < 3 || !Number.isFinite(percent)) return null;
    if (percent < 1 || percent > 100) return null;

    const maxUses = maxUsesRaw.trim()
      ? Number.parseInt(maxUsesRaw, 10)
      : undefined;
    if (maxUsesRaw.trim() && (!Number.isFinite(maxUses) || maxUses! < 1)) {
      return null;
    }

    let minOrderEur: number | undefined;
    if (minOrderRaw.trim()) {
      const parsed = parsePrice(
        minOrderRaw.includes("€") ? minOrderRaw : `${minOrderRaw} €`,
      );
      if (!Number.isFinite(parsed) || parsed <= 0) return null;
      minOrderEur = parsed;
    }

    return {
      id: promo?.id,
      code,
      discountPercent: percent,
      active,
      startsAt: startsAt || undefined,
      endsAt: endsAt || undefined,
      maxUses,
      minOrderEur,
      note: note.trim() || undefined,
    };
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

  async function saveAndClose() {
    if (exiting || saving) return;

    if (effectiveKind === "product") {
      const payload = buildProductPayload();
      if (!payload) return;
      setSaving(true);
      try {
        await onSaveProduct(payload);
      } finally {
        setSaving(false);
      }
      return;
    }

    const payload = buildPromoPayload();
    if (!payload) return;
    setSaving(true);
    try {
      await onSavePromo(payload);
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

  const canSave =
    effectiveKind === "product"
      ? Boolean(buildProductPayload())
      : Boolean(buildPromoPayload());

  const headerEyebrow = isCreate ? "Nová zľava" : "Úprava zľavy";
  const headerTitle =
    effectiveKind === "product"
      ? (selectedProduct?.name ?? "Vyberte produkt")
      : (normalizePromoCode(promoCode) || "Nový zľavový kód");

  const deleteDescription =
    effectiveKind === "promo"
      ? "Zľavový kód sa odstráni zo zoznamu."
      : "Zľava sa odstráni zo zoznamu. Produkt sa vráti na pôvodnú cenu.";

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
              {headerEyebrow}
            </p>
            <h2
              id="discount-editor-title"
              className="mt-1 truncate font-heading text-lg text-[#2f2924]"
            >
              {headerTitle}
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

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            <div className="space-y-6">
              {isCreate ? (
                <KindSwitcher kind={kind} onChange={setKind} />
              ) : null}

              {effectiveKind === "product" ? (
                <>
                  <div>
                    <p className="text-sm font-medium text-[#2f2924]">Produkt</p>
                    {isCreate ? (
                      <div className="mt-2 space-y-2">
                        <div className="relative">
                          <Search
                            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#2f2924]/35"
                            aria-hidden
                          />
                          <input
                            type="search"
                            value={productQuery}
                            onChange={(event) =>
                              setProductQuery(event.target.value)
                            }
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
                        onChange={(event) =>
                          updateOriginal(event.target.value)
                        }
                        placeholder="24,90"
                        className={fieldInputClass}
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
                        className={fieldInputClass}
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
                        onChange={(event) =>
                          updatePercent(event.target.value)
                        }
                        className={fieldInputClass}
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
                        className={dateInputClass}
                      />
                    </label>
                    <label className="block text-sm font-medium text-[#2f2924]">
                      Platnosť do
                      <input
                        type="date"
                        value={endsAt}
                        onChange={(event) => setEndsAt(event.target.value)}
                        className={dateInputClass}
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
                </>
              ) : (
                <>
                  <label className="block text-sm font-medium text-[#2f2924]">
                    Zľavový kód
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(event) => updatePromoCode(event.target.value)}
                      onBlur={(event) => updatePromoCode(event.target.value)}
                      placeholder="LETO2026"
                      autoComplete="off"
                      spellCheck={false}
                      className={`${fieldInputClass} uppercase tracking-wide`}
                    />
                  </label>

                  <div>
                    <p className="text-sm font-medium text-[#2f2924]">
                      Typ zadania zľavy
                    </p>
                    <label className="mt-3 block text-sm font-medium text-[#2f2924]">
                      Zľava (%)
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={promoPercentRaw}
                        onChange={(event) =>
                          setPromoPercentRaw(event.target.value)
                        }
                        className={fieldInputClass}
                      />
                    </label>
                    <p className="mt-2 text-sm text-[#2f2924]/50">
                      Badge v košíku: −{promoPercentRaw || "0"}%
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-medium text-[#2f2924]">
                      Platnosť od
                      <input
                        type="date"
                        value={startsAt}
                        onChange={(event) => setStartsAt(event.target.value)}
                        className={dateInputClass}
                      />
                    </label>
                    <label className="block text-sm font-medium text-[#2f2924]">
                      Platnosť do
                      <input
                        type="date"
                        value={endsAt}
                        onChange={(event) => setEndsAt(event.target.value)}
                        className={dateInputClass}
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-medium text-[#2f2924]">
                      Max. počet použití
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={maxUsesRaw}
                        onChange={(event) => setMaxUsesRaw(event.target.value)}
                        placeholder="Neobmedzené"
                        className={fieldInputClass}
                      />
                    </label>
                    <label className="block text-sm font-medium text-[#2f2924]">
                      Minimálna objednávka (€)
                      <input
                        type="text"
                        inputMode="decimal"
                        value={minOrderRaw}
                        onChange={(event) => setMinOrderRaw(event.target.value)}
                        placeholder="50,00"
                        className={fieldInputClass}
                      />
                    </label>
                  </div>

                  <label className="block text-sm font-medium text-[#2f2924]">
                    Poznámka
                    <textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      rows={3}
                      placeholder="Interná poznámka pre administráciu…"
                      className="mt-2 min-h-[4.5rem] w-full resize-y rounded-xl border border-black/10 bg-[#faf8f5] px-3.5 py-3 text-sm leading-relaxed text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:bg-white"
                    />
                  </label>

                  <div className="rounded-xl border border-black/8 bg-[#faf8f5] p-4">
                    <ToggleRow
                      label="Aktívna"
                      description="Neaktívny kód sa v košíku neaplikuje."
                      checked={active}
                      onChange={setActive}
                    />
                  </div>
                </>
              )}
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
                {deleteDescription}
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

function KindSwitcher({
  kind,
  onChange,
}: {
  kind: DiscountKind;
  onChange: (kind: DiscountKind) => void;
}) {
  return (
    <div className="grid grid-cols-2 border-b border-black/10">
      <button
        type="button"
        role="tab"
        aria-selected={kind === "product"}
        onClick={() => onChange("product")}
        className={`-mb-px cursor-pointer px-2 py-3 text-center text-xs font-semibold tracking-[0.14em] uppercase transition-colors ${
          kind === "product"
            ? "border-b-2 border-[#75825B] text-[#2f2924]"
            : "border-b-2 border-transparent text-[#2f2924]/35"
        }`}
      >
        Produkt
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={kind === "promo"}
        onClick={() => onChange("promo")}
        className={`-mb-px cursor-pointer px-2 py-3 text-center text-xs font-semibold tracking-[0.14em] uppercase transition-colors ${
          kind === "promo"
            ? "border-b-2 border-[#75825B] text-[#2f2924]"
            : "border-b-2 border-transparent text-[#2f2924]/35"
        }`}
      >
        Zľavový kód
      </button>
    </div>
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
