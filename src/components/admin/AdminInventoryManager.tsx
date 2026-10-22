"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ExternalLink,
  ListFilter,
  Package,
  Pencil,
  Search,
  Warehouse,
  X,
} from "lucide-react";
import { FilterChip } from "@/components/FilterChip";
import { FilterSheet } from "@/components/FilterSheet";
import { FilterSheetFooter } from "@/components/FilterSheetFooter";
import { AdminSaveIcon } from "@/components/admin/AdminSaveIcon";
import { adminImageThumbUrl } from "@/lib/admin-image-url";
import { lockPageScroll } from "@/lib/lock-page-scroll";
import { colorSwatchStyle, productHref, type Product } from "@/lib/products";
import type { VariantMode } from "@/lib/product-variants";
import { productMatchesSearchQuery } from "@/lib/search";
import { getProductOrderMultiple } from "@/lib/taxonomy";
import {
  buildWarehouseLines,
  summarizeWarehouse,
  WAREHOUSE_LOW_STOCK_THRESHOLD,
  type StockQty,
  type WarehouseLine,
} from "@/lib/warehouse-stock";

const PAGE_SIZE = 50;

type StockFilter = "all" | "in" | "out" | "low" | "partial";

/** UI mode for one warehouse line — maps to StockQty on save. */
type LineStockMode = "tracked" | "untracked" | "soldout";

type LineDraft = {
  mode: LineStockMode;
  /** Only used when mode === "tracked"; may be incomplete while typing. */
  qtyText: string;
};

type DraftMap = Record<string, LineDraft>;

type Props = {
  initialProducts: Product[];
  /** Open warehouse drawer on mount (deep-link from Produkty). */
  initialOpenProductId?: string;
};

function productMode(product: Product): VariantMode {
  const mode = product.variantMode;
  if (mode === "colors" || mode === "custom" || mode === "none") return mode;
  const colors = product.attributes?.colors ?? [];
  return colors.length > 0 ? "colors" : "none";
}

function modeLabel(mode: VariantMode) {
  if (mode === "colors") return "Farby";
  if (mode === "custom") return "Vlastné varianty";
  return "Bez variant";
}

function draftKey(line: WarehouseLine) {
  return line.key || "__product";
}

function qtyToDraft(qty: StockQty): LineDraft {
  if (qty === null) return { mode: "untracked", qtyText: "" };
  if (qty === 0) return { mode: "soldout", qtyText: "0" };
  return { mode: "tracked", qtyText: String(qty) };
}

function draftToQty(draft: LineDraft): StockQty | { error: string } {
  if (draft.mode === "untracked") return null;
  if (draft.mode === "soldout") return 0;
  const t = draft.qtyText.trim();
  if (!t) {
    return {
      error:
        "Doplňte počet kusov alebo zvoľte iný režim dostupnosti.",
    };
  }
  const n = Math.floor(Number(t.replace(",", ".")));
  if (!Number.isFinite(n) || n < 0) {
    return { error: "Počet musí byť nezáporné celé číslo." };
  }
  return n;
}

function draftSnapshot(draft: DraftMap): string {
  return JSON.stringify(
    Object.keys(draft)
      .sort()
      .map((k) => [k, draft[k].mode, draft[k].qtyText]),
  );
}

function hasTrackedExactCounts(draft: DraftMap): boolean {
  return Object.values(draft).some(
    (row) =>
      row.mode === "tracked" &&
      row.qtyText.trim() !== "" &&
      Number(row.qtyText.replace(",", ".")) > 0,
  );
}

function useIsDesktopMd() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return isDesktop;
}

function ProductThumb({ src }: { src: string; size: number }) {
  const [useOriginal, setUseOriginal] = useState(false);
  const isLocalPath = src.startsWith("/");
  const displaySrc =
    useOriginal || isLocalPath ? src : adminImageThumbUrl(src, 112);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={displaySrc}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setUseOriginal(true)}
      className="size-full object-cover"
    />
  );
}

function stockBadgeClass(inStock: boolean, partial: boolean) {
  if (!inStock) return "bg-[#fee2e2] text-[#b91c1c]";
  if (partial) return "bg-[#fef3c7] text-[#92400e]";
  return "bg-[#e8ebe2] text-[#5f6a49]";
}

const STOCK_MODE_OPTIONS: { value: LineStockMode; label: string }[] = [
  { value: "tracked", label: "Evidovať počet" },
  { value: "untracked", label: "Skladom bez počtu" },
  { value: "soldout", label: "Vypredané" },
];

export function AdminInventoryManager({
  initialProducts,
  initialOpenProductId,
}: Props) {
  const router = useRouter();
  const isDesktop = useIsDesktopMd();
  const [products, setProducts] = useState(initialProducts);
  const [query, setQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [drawerProductId, setDrawerProductId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [draft, setDraft] = useState<DraftMap>({});
  const [baseline, setBaseline] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState<
    null | "soldout" | "untracked"
  >(null);
  const [leaveToEdit, setLeaveToEdit] = useState(false);
  const [pending, startTransition] = useTransition();
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoOpenDoneRef = useRef(false);

  const isDirty = draftSnapshot(draft) !== baseline;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => {
      if (product.archivedAt) return false;
      const mode = productMode(product);
      const summary = summarizeWarehouse({
        mode,
        inStock: product.inStock !== false,
        stockQuantity: product.stockQuantity,
        colorIds: product.attributes?.colors ?? [],
        colorStock: product.colorStock ?? {},
        textVariants: product.textVariants ?? [],
      });

      if (stockFilter === "in" && !summary.inStock) return false;
      if (stockFilter === "out" && summary.inStock) return false;
      if (stockFilter === "low" && summary.lowStockCount === 0) return false;
      if (
        stockFilter === "partial" &&
        !(summary.soldOutCount > 0 && summary.orderableCount > 0)
      ) {
        return false;
      }

      if (!q) return true;
      return productMatchesSearchQuery(product, q);
    });
  }, [products, query, stockFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [query, stockFilter]);

  const drawerProduct = useMemo(
    () => products.find((p) => p.id === drawerProductId) ?? null,
    [products, drawerProductId],
  );

  useEffect(() => {
    if (!drawerProductId) {
      setPanelOpen(false);
      return;
    }
    const unlock = lockPageScroll();
    const show = window.setTimeout(() => setPanelOpen(true), 20);
    return () => {
      window.clearTimeout(show);
      unlock();
    };
  }, [drawerProductId]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  function buildDraftFromProduct(product: Product): DraftMap {
    const mode = productMode(product);
    const colorLabels = Object.fromEntries(
      (product.colors ?? []).map((c) => [c.id, c.label]),
    );
    const lines = buildWarehouseLines({
      mode,
      productName: product.name,
      inStock: product.inStock !== false,
      stockQuantity: product.stockQuantity,
      colorIds: product.attributes?.colors ?? [],
      colorLabels,
      colorStock: product.colorStock ?? {},
      textVariants: product.textVariants ?? [],
    });
    const next: DraftMap = {};
    for (const line of lines) {
      next[draftKey(line)] = qtyToDraft(line.qty);
    }
    return next;
  }

  function openDrawer(product: Product) {
    const next = buildDraftFromProduct(product);
    setDraft(next);
    setBaseline(draftSnapshot(next));
    setError(null);
    setDiscardOpen(false);
    setBulkConfirm(null);
    setLeaveToEdit(false);
    setDrawerProductId(product.id);
  }

  useEffect(() => {
    const id = initialOpenProductId?.trim();
    if (!id || autoOpenDoneRef.current) return;
    const product = products.find((p) => p.id === id && !p.archivedAt);
    if (!product) return;
    autoOpenDoneRef.current = true;
    openDrawer(product);
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("product")) {
        url.searchParams.delete("product");
        window.history.replaceState(
          {},
          "",
          url.pathname + url.search + url.hash,
        );
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once from deep-link
  }, [initialOpenProductId, products]);

  function closeDrawerNow() {
    setPanelOpen(false);
    setDiscardOpen(false);
    setBulkConfirm(null);
    setLeaveToEdit(false);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setDrawerProductId(null);
      setDraft({});
      setBaseline("");
      setError(null);
    }, 300);
  }

  function requestCloseDrawer() {
    if (saving) return;
    if (isDirty) {
      setLeaveToEdit(false);
      setDiscardOpen(true);
      return;
    }
    closeDrawerNow();
  }

  function applyBulk(mode: "soldout" | "untracked") {
    setDraft((prev) => {
      const next: DraftMap = {};
      for (const key of Object.keys(prev)) {
        next[key] =
          mode === "soldout"
            ? { mode: "soldout", qtyText: "0" }
            : { mode: "untracked", qtyText: "" };
      }
      return next;
    });
    setBulkConfirm(null);
    setError(null);
  }

  function requestBulk(mode: "soldout" | "untracked") {
    if (hasTrackedExactCounts(draft)) {
      setBulkConfirm(mode);
      return;
    }
    applyBulk(mode);
  }

  function setLineMode(key: string, mode: LineStockMode) {
    setDraft((prev) => {
      const current = prev[key] ?? { mode: "untracked", qtyText: "" };
      if (mode === "soldout") {
        return { ...prev, [key]: { mode: "soldout", qtyText: "0" } };
      }
      if (mode === "untracked") {
        return { ...prev, [key]: { mode: "untracked", qtyText: "" } };
      }
      // tracked — keep existing number if any, else empty (incomplete until filled)
      const keep =
        current.mode === "tracked" && current.qtyText.trim() !== ""
          ? current.qtyText
          : current.mode === "soldout"
            ? ""
            : current.qtyText;
      return { ...prev, [key]: { mode: "tracked", qtyText: keep } };
    });
    setError(null);
  }

  function setLineQtyText(key: string, raw: string) {
    setDraft((prev) => {
      const cleaned = raw.replace(/[^\d]/g, "");
      if (cleaned === "0" || cleaned === "") {
        // Typing 0 → sold out; clearing stays tracked (incomplete) — never auto-untracked
        if (cleaned === "0") {
          return { ...prev, [key]: { mode: "soldout", qtyText: "0" } };
        }
        return { ...prev, [key]: { mode: "tracked", qtyText: "" } };
      }
      return { ...prev, [key]: { mode: "tracked", qtyText: cleaned } };
    });
    setError(null);
  }

  function saveProduct(product: Product) {
    const mode = productMode(product);
    const lines = Object.keys(draft);
    const resolved: Record<string, StockQty> = {};
    for (const key of lines) {
      const result = draftToQty(draft[key]);
      if (result && typeof result === "object" && "error" in result) {
        setError(result.error);
        return;
      }
      resolved[key] = result as StockQty;
    }

    setSaving(true);
    setError(null);

    startTransition(async () => {
      try {
        let body: Record<string, unknown> = { productId: product.id };

        if (mode === "colors") {
          const colorStock: Record<string, StockQty> = {};
          for (const id of product.attributes?.colors ?? []) {
            colorStock[id] = resolved[`c:${id}`] ?? null;
          }
          body = { ...body, colorStock };
        } else if (mode === "custom") {
          const variantStock: Record<string, StockQty> = {};
          for (const v of product.textVariants ?? []) {
            variantStock[v.id] = resolved[`v:${v.id}`] ?? null;
          }
          body = { ...body, variantStock };
        } else {
          body = {
            ...body,
            productQty: resolved.__product ?? null,
          };
        }

        const res = await fetch("/api/admin/warehouse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(body),
        });
        const json = (await res.json().catch(() => null)) as
          | {
              ok: true;
              product: {
                inStock: boolean;
                stockQuantity: number | null;
                unavailableColorIds: string[];
                colorStock: Record<string, StockQty>;
                textVariants: Product["textVariants"];
                variantOrderableCount: number;
                variantTotalCount: number;
              };
            }
          | { ok: false; error?: string }
          | null;

        if (!res.ok || !json || json.ok !== true) {
          setError(
            (json && "error" in json && json.error) ||
              `Uloženie zlyhalo (${res.status}).`,
          );
          return;
        }

        setProducts((prev) =>
          prev.map((p) =>
            p.id === product.id
              ? {
                  ...p,
                  inStock: json.product.inStock,
                  stockQuantity: json.product.stockQuantity ?? undefined,
                  unavailableColorIds: json.product.unavailableColorIds,
                  colorStock: json.product.colorStock,
                  textVariants: json.product.textVariants ?? p.textVariants,
                  variantOrderableCount: json.product.variantOrderableCount,
                  variantTotalCount: json.product.variantTotalCount,
                }
              : p,
          ),
        );
        setFlashId(product.id);
        setTimeout(() => setFlashId(null), 1600);
        // Mark clean then close
        const refreshed = buildDraftFromProduct({
          ...product,
          inStock: json.product.inStock,
          stockQuantity: json.product.stockQuantity ?? undefined,
          unavailableColorIds: json.product.unavailableColorIds,
          colorStock: json.product.colorStock,
          textVariants: json.product.textVariants ?? product.textVariants,
        });
        setDraft(refreshed);
        setBaseline(draftSnapshot(refreshed));
        closeDrawerNow();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Uloženie zlyhalo.");
      } finally {
        setSaving(false);
      }
    });
  }

  function goToProductSettings(product: Product) {
    const href = `/admin/produkty?edit=${encodeURIComponent(product.id)}`;
    if (isDirty) {
      setLeaveToEdit(true);
      setDiscardOpen(true);
      return;
    }
    router.push(href);
  }

  function confirmDiscard() {
    if (leaveToEdit && drawerProduct) {
      const href = `/admin/produkty?edit=${encodeURIComponent(drawerProduct.id)}`;
      closeDrawerNow();
      router.push(href);
      return;
    }
    closeDrawerNow();
  }

  const stockOptions: { value: StockFilter; label: string }[] = [
    { value: "all", label: "Celý sklad" },
    { value: "in", label: "Na sklade" },
    { value: "out", label: "Nie je na sklade" },
    { value: "partial", label: "Čiastočne vypredané" },
    {
      value: "low",
      label: `Posledné kusy (≤${WAREHOUSE_LOW_STOCK_THRESHOLD})`,
    },
  ];

  const activeFilterCount = stockFilter !== "all" ? 1 : 0;

  function renderRowActions(product: Product) {
    return (
      <>
        <Link
          href={productHref(product.slug)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-[#2f2924]/65 transition-colors hover:bg-[#e8ebe2] hover:text-[#2f2924]"
        >
          <ExternalLink className="size-3.5" strokeWidth={1.75} aria-hidden />
          Prejsť na produkt
        </Link>
        <button
          type="button"
          onClick={() => openDrawer(product)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-[#75825B] transition-colors hover:bg-[#e8ebe2]"
        >
          <Warehouse className="size-3.5" strokeWidth={1.75} aria-hidden />
          Upraviť sklad
        </button>
      </>
    );
  }

  function renderSummaryBadge(product: Product) {
    const mode = productMode(product);
    const summary = summarizeWarehouse({
      mode,
      inStock: product.inStock !== false,
      stockQuantity: product.stockQuantity,
      colorIds: product.attributes?.colors ?? [],
      colorStock: product.colorStock ?? {},
      textVariants: product.textVariants ?? [],
    });
    const partial = summary.soldOutCount > 0 && summary.orderableCount > 0;
    return (
      <span
        className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${stockBadgeClass(summary.inStock, partial)}`}
      >
        {summary.label}
        {flashId === product.id ? " · uložené" : ""}
      </span>
    );
  }

  return (
    <div>
      <div className="min-w-0">
        <h1 className="font-heading text-2xl font-semibold text-[#2f2924] sm:text-3xl">
          Sklad
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#2f2924]/65 sm:text-base">
          Evidencia kusov podľa produktu a variant (farby / vlastné).
        </p>
      </div>

      <div className="mt-5">
        <div className="mb-4 flex items-center gap-2.5 sm:gap-3">
          <div className="relative min-w-0 flex-[7] sm:max-w-md sm:flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#2f2924]/40"
              strokeWidth={1.75}
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Hľadať produkt…"
              className="h-11 w-full rounded-xl border border-black/10 bg-white py-2 pr-3.5 pl-10 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B]"
            />
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="inline-flex h-11 min-w-0 flex-[3] cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white px-2.5 text-sm font-medium text-[#2f2924] transition-colors hover:border-[#75825B]/40 sm:ml-auto sm:w-auto sm:flex-none sm:gap-2 sm:px-4"
          >
            <ListFilter
              className="size-4 shrink-0"
              strokeWidth={1.75}
              aria-hidden
            />
            <span className="truncate">Filtrovať</span>
            {activeFilterCount > 0 ? (
              <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[#75825B] text-[11px] font-semibold text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>

        {!isDesktop ? (
          <div className="overflow-hidden rounded-2xl border border-black/6 bg-white">
            {filtered.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-[#2f2924]/55">
                Žiadne produkty pre zvolené filtre.
              </p>
            ) : (
              <ul className="divide-y divide-black/5">
                {pageItems.map((product) => (
                  <li key={product.id} className="px-4 py-4">
                    <div className="flex items-start gap-3">
                      <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-[#e8ebe2]">
                        {product.image ? (
                          <ProductThumb src={product.image} size={112} />
                        ) : (
                          <span className="flex size-full items-center justify-center">
                            <Package className="size-5 text-[#2f2924]/35" />
                          </span>
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[#2f2924]">
                          {product.name}
                        </p>
                        {product.sku ? (
                          <p className="mt-0.5 truncate font-mono text-xs text-[#2f2924]/45">
                            {product.sku}
                          </p>
                        ) : null}
                        <p className="mt-1 text-sm text-[#2f2924]/65">
                          {modeLabel(productMode(product))}
                        </p>
                        <div className="mt-2">{renderSummaryBadge(product)}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={productHref(product.slug)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-[#faf8f5] px-3 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#e8ebe2]"
                      >
                        <ExternalLink
                          className="size-3.5"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        Prejsť
                      </Link>
                      <button
                        type="button"
                        onClick={() => openDrawer(product)}
                        className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#75825B] px-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
                      >
                        <Warehouse
                          className="size-3.5"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        Upraviť sklad
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {isDesktop ? (
          <div className="overflow-hidden rounded-2xl border border-black/6 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-[15px]">
                <thead className="border-b border-black/6 bg-white text-xs tracking-wide text-[#2f2924]/55 uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Produkt</th>
                    <th className="px-4 py-3 font-medium">Režim</th>
                    <th className="px-4 py-3 font-medium">Sklad</th>
                    <th className="px-4 py-3 text-right font-medium">Akcie</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b border-black/5 last:border-b-0"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-[#e8ebe2]">
                            {product.image ? (
                              <ProductThumb src={product.image} size={112} />
                            ) : null}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[15px] font-medium text-[#2f2924]">
                              {product.name}
                            </p>
                            {product.sku ? (
                              <p className="truncate font-mono text-xs text-[#2f2924]/45">
                                {product.sku}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[#2f2924]/80">
                        {modeLabel(productMode(product))}
                      </td>
                      <td className="px-4 py-3.5">
                        {renderSummaryBadge(product)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          {renderRowActions(product)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {isDesktop && filtered.length === 0 ? (
          <p className="mt-4 text-center text-sm text-[#2f2924]/55">
            Žiadne produkty pre zvolené filtre.
          </p>
        ) : null}

        {filtered.length > PAGE_SIZE ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#2f2924]/55">
              {filtered.length} produktov · strana {safePage} / {pageCount}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                className="inline-flex h-10 cursor-pointer items-center rounded-xl border border-black/10 bg-white px-3 text-sm font-medium text-[#2f2924] transition-colors hover:border-[#75825B]/40 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Predchádzajúca
              </button>
              <button
                type="button"
                disabled={safePage >= pageCount}
                onClick={() =>
                  setPage((value) => Math.min(pageCount, value + 1))
                }
                className="inline-flex h-10 cursor-pointer items-center rounded-xl border border-black/10 bg-white px-3 text-sm font-medium text-[#2f2924] transition-colors hover:border-[#75825B]/40 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Ďalšia
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-[#2f2924]/55">
            {filtered.length} produktov
          </p>
        )}
      </div>

      <FilterSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        footer={
          <FilterSheetFooter
            hasActiveFilters={activeFilterCount > 0}
            onClear={() => setStockFilter("all")}
            onDone={() => setFiltersOpen(false)}
          />
        }
      >
        <div className="space-y-7">
          <div>
            <p className="text-xs font-medium tracking-[0.12em] text-[#75825B] uppercase">
              Sklad
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {stockOptions.map((option) => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  active={stockFilter === option.value}
                  onClick={() => setStockFilter(option.value)}
                />
              ))}
            </div>
          </div>
        </div>
      </FilterSheet>

      {drawerProduct && typeof document !== "undefined"
        ? createPortal(
            <WarehouseDrawer
              product={drawerProduct}
              panelOpen={panelOpen}
              draft={draft}
              error={error}
              saving={saving || pending}
              discardOpen={discardOpen}
              bulkConfirm={bulkConfirm}
              leaveToEdit={leaveToEdit}
              onClose={requestCloseDrawer}
              onSave={() => saveProduct(drawerProduct)}
              onConfirmDiscard={confirmDiscard}
              onCancelDiscard={() => {
                setDiscardOpen(false);
                setLeaveToEdit(false);
              }}
              onRequestBulk={requestBulk}
              onConfirmBulk={() => {
                if (bulkConfirm) applyBulk(bulkConfirm);
              }}
              onCancelBulk={() => setBulkConfirm(null)}
              onSetMode={setLineMode}
              onSetQtyText={setLineQtyText}
              onEditProduct={() => goToProductSettings(drawerProduct)}
            />,
            document.body,
          )
        : null}
    </div>
  );
}

function WarehouseDrawer({
  product,
  panelOpen,
  draft,
  error,
  saving,
  discardOpen,
  bulkConfirm,
  leaveToEdit,
  onClose,
  onSave,
  onConfirmDiscard,
  onCancelDiscard,
  onRequestBulk,
  onConfirmBulk,
  onCancelBulk,
  onSetMode,
  onSetQtyText,
  onEditProduct,
}: {
  product: Product;
  panelOpen: boolean;
  draft: DraftMap;
  error: string | null;
  saving: boolean;
  discardOpen: boolean;
  bulkConfirm: null | "soldout" | "untracked";
  leaveToEdit: boolean;
  onClose: () => void;
  onSave: () => void;
  onConfirmDiscard: () => void;
  onCancelDiscard: () => void;
  onRequestBulk: (mode: "soldout" | "untracked") => void;
  onConfirmBulk: () => void;
  onCancelBulk: () => void;
  onSetMode: (key: string, mode: LineStockMode) => void;
  onSetQtyText: (key: string, value: string) => void;
  onEditProduct: () => void;
}) {
  const mode = productMode(product);
  const showBulk = mode === "colors" || mode === "custom";
  const orderMultiple = getProductOrderMultiple(
    product.attributes?.packaging,
  );
  const colorById = Object.fromEntries(
    (product.colors ?? []).map((c) => [c.id, c]),
  );
  const colorLabels = Object.fromEntries(
    (product.colors ?? []).map((c) => [c.id, c.label]),
  );
  const lines: WarehouseLine[] = buildWarehouseLines({
    mode,
    productName: product.name,
    inStock: product.inStock !== false,
    stockQuantity: product.stockQuantity,
    colorIds: product.attributes?.colors ?? [],
    colorLabels,
    colorStock: product.colorStock ?? {},
    textVariants: product.textVariants ?? [],
  });

  const [bulkOpen, setBulkOpen] = useState(false);
  const [openModeKey, setOpenModeKey] = useState<string | null>(null);
  const bulkRef = useRef<HTMLDivElement>(null);
  const modeMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const qtyRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!bulkOpen && !openModeKey) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (bulkOpen && bulkRef.current && !bulkRef.current.contains(target)) {
        setBulkOpen(false);
      }
      if (openModeKey) {
        const root = modeMenuRefs.current[openModeKey];
        const menu = document.querySelector(
          `[data-stock-mode-menu="${CSS.escape(openModeKey)}"]`,
        );
        const inRoot = root?.contains(target);
        const inMenu = menu?.contains(target);
        if (!inRoot && !inMenu) {
          setOpenModeKey(null);
        }
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setBulkOpen(false);
        setOpenModeKey(null);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [bulkOpen, openModeKey]);

  function changeMode(key: string, next: LineStockMode) {
    onSetMode(key, next);
    setOpenModeKey(null);
    if (next === "tracked") {
      requestAnimationFrame(() => {
        qtyRefs.current[key]?.focus();
        qtyRefs.current[key]?.select();
      });
    }
  }

  const qtyFieldClass =
    "flex h-10 w-24 shrink-0 items-center justify-end gap-1 rounded-xl border border-black/10 bg-[#faf8f5] px-2.5 text-sm tabular-nums text-[#2f2924]";

  const rowGridClass =
    "grid min-h-16 grid-cols-1 gap-2.5 px-4 py-2.5 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.35fr)_6.5rem] sm:items-center sm:gap-3 sm:pr-4";

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end transition-colors duration-300 ${
        panelOpen ? "bg-black/30" : "bg-black/0"
      }`}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-pointer"
        aria-label="Zavrieť"
        onClick={onClose}
      />
      <aside
        className={`relative z-10 flex h-full w-full max-w-2xl flex-col bg-white shadow-[-12px_0_40px_rgba(47,41,36,0.14)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          panelOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-black/6 px-4 py-3.5 sm:px-6">
          <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-[#e8ebe2]">
            {product.image ? (
              <ProductThumb src={product.image} size={128} />
            ) : (
              <span className="flex size-full items-center justify-center">
                <Package className="size-5 text-[#2f2924]/35" />
              </span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium tracking-[0.12em] text-[#75825B] uppercase">
              Úprava skladu
            </p>
            <h2 className="mt-0.5 font-heading text-lg leading-snug text-[#2f2924]">
              {product.name}
            </h2>
            {product.sku ? (
              <p className="mt-0.5 font-mono text-xs text-[#2f2924]/50">
                {product.sku}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#2f2924]/55 transition-colors hover:bg-[#e8ebe2] hover:text-[#2f2924]"
            aria-label="Zavrieť"
          >
            <X className="size-4" strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {error ? (
            <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-[#2f2924]">
              {showBulk ? (
                <>
                  Varianty{" "}
                  <span className="font-normal text-[#2f2924]/55">
                    · {lines.length}
                  </span>
                </>
              ) : (
                "Sklad"
              )}
            </p>
            {showBulk ? (
              <div ref={bulkRef} className="relative">
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={bulkOpen}
                  onClick={() => {
                    setOpenModeKey(null);
                    setBulkOpen((v) => !v);
                  }}
                  className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#e8ebe2]/60"
                >
                  Hromadné akcie
                  <ChevronDown
                    className={`size-3.5 text-[#2f2924]/45 transition-transform ${
                      bulkOpen ? "rotate-180" : ""
                    }`}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </button>
                {bulkOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 z-20 mt-1.5 w-64 overflow-hidden rounded-xl border border-black/8 bg-white shadow-[0_12px_32px_rgba(47,41,36,0.12)]"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full cursor-pointer px-3.5 py-2.5 text-left text-sm text-[#2f2924] transition-colors hover:bg-[#faf8f5]"
                      onClick={() => {
                        setBulkOpen(false);
                        onRequestBulk("soldout");
                      }}
                    >
                      Všetky označiť ako vypredané
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full cursor-pointer px-3.5 py-2.5 text-left text-sm text-[#2f2924] transition-colors hover:bg-[#faf8f5]"
                      onClick={() => {
                        setBulkOpen(false);
                        onRequestBulk("untracked");
                      }}
                    >
                      Všetky nastaviť skladom bez počtu
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-2 overflow-hidden rounded-2xl border border-black/8 bg-white">
            <div
              className={`hidden border-b border-black/6 bg-[#faf8f5] py-2 text-xs font-medium tracking-wide text-[#2f2924]/55 uppercase sm:grid sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.35fr)_6.5rem] sm:items-center sm:gap-3 sm:px-4 sm:pr-4`}
            >
              <span>Varianta</span>
              <span>Stav skladu</span>
              <span className="text-right">Počet</span>
            </div>
            <ul className="divide-y divide-black/[0.06]">
              {lines.map((line) => {
                const key = draftKey(line);
                const row = draft[key] ?? {
                  mode: "untracked" as const,
                  qtyText: "",
                };
                const color =
                  line.kind === "color" ? colorById[line.optionId] : null;

                return (
                  <li key={key} className={rowGridClass}>
                    <div className="flex min-w-0 items-center gap-2.5">
                      {color ? (
                        <span
                          className="size-3.5 shrink-0 rounded-full border border-black/10"
                          style={colorSwatchStyle(color)}
                          aria-hidden
                        />
                      ) : null}
                      <span className="text-sm font-medium break-words text-[#2f2924]">
                        {line.label}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <StockModeDropdown
                        lineKey={key}
                        label={line.label}
                        value={row.mode}
                        open={openModeKey === key}
                        rootRef={(el) => {
                          modeMenuRefs.current[key] = el;
                        }}
                        onToggle={() => {
                          setBulkOpen(false);
                          setOpenModeKey((prev) =>
                            prev === key ? null : key,
                          );
                        }}
                        onChange={(next) => changeMode(key, next)}
                      />
                    </div>

                    <div className="flex sm:justify-end">
                      {row.mode === "tracked" ? (
                        <label
                          className={`${qtyFieldClass} bg-white focus-within:border-[#75825B]`}
                        >
                          <input
                            ref={(el) => {
                              qtyRefs.current[key] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={row.qtyText}
                            onChange={(e) =>
                              onSetQtyText(key, e.target.value)
                            }
                            className="w-10 min-w-0 bg-transparent text-right text-sm text-[#2f2924] outline-none"
                            aria-label={`Počet kusov: ${line.label}`}
                          />
                          <span className="shrink-0 text-[#2f2924]/55">ks</span>
                        </label>
                      ) : row.mode === "untracked" ? (
                        <div
                          className={`${qtyFieldClass} text-[#2f2924]`}
                          aria-label="Skladom bez počtu"
                        >
                          <span aria-hidden>∞</span>
                        </div>
                      ) : (
                        <div
                          className={`${qtyFieldClass} text-[#b91c1c]`}
                          aria-label="Vypredané"
                        >
                          0 ks
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-[#2f2924]/65">
            Skladom bez počtu umožňuje predaj bez sledovania množstva. Počty
            zadávajte v kusoch
            {orderMultiple > 1
              ? `. Produkt sa objednáva po ${orderMultiple} ks.`
              : "."}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2.5 border-t border-black/6 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#e8ebe2]/60"
            >
              <X className="size-4" strokeWidth={1.75} aria-hidden />
              Zavrieť
            </button>
            <button
              type="button"
              onClick={onEditProduct}
              className="inline-flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white px-4 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#e8ebe2]/60"
            >
              <Pencil className="size-3.5" strokeWidth={1.75} aria-hidden />
              Upraviť produkt
            </button>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="inline-flex h-11 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#75825B] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:ml-auto sm:w-auto sm:flex-none sm:min-w-[12rem] sm:px-8"
          >
            <AdminSaveIcon />
            {saving ? "Ukladám…" : "Uložiť sklad"}
          </button>
        </div>

        {discardOpen ? (
          <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/35 px-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="warehouse-unsaved-title"
              className="w-full max-w-sm rounded-2xl border border-black/8 bg-white p-5 shadow-[0_20px_48px_rgba(47,41,36,0.2)]"
            >
              <h3
                id="warehouse-unsaved-title"
                className="font-heading text-lg text-[#2f2924]"
              >
                Máte neuložené zmeny
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#2f2924]/65">
                {leaveToEdit
                  ? "Úpravy skladu ešte nie sú uložené. Chcete pokračovať do nastavení produktu bez uloženia?"
                  : "Ak panel zatvoríte, úpravy skladu sa stratia. Chcete ich zahodiť?"}
              </p>
              <div className="mt-5 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onConfirmDiscard}
                  className="inline-flex h-10 w-1/2 cursor-pointer items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#e8ebe2]/60"
                >
                  {leaveToEdit ? "Pokračovať" : "Zahodiť zmeny"}
                </button>
                <button
                  type="button"
                  onClick={onCancelDiscard}
                  className="inline-flex h-10 w-1/2 cursor-pointer items-center justify-center rounded-xl bg-[#75825B] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  Zostať
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {bulkConfirm ? (
          <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/35 px-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="warehouse-bulk-title"
              className="w-full max-w-sm rounded-2xl border border-black/8 bg-white p-5 shadow-[0_20px_48px_rgba(47,41,36,0.2)]"
            >
              <h3
                id="warehouse-bulk-title"
                className="font-heading text-lg text-[#2f2924]"
              >
                Prepísať zadané počty?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#2f2924]/65">
                {bulkConfirm === "soldout"
                  ? "Niektoré varianty majú evidovaný počet kusov. Nastaviť všetky ako vypredané?"
                  : "Niektoré varianty majú evidovaný počet kusov. Prestaviť všetky na skladom bez počtu?"}
              </p>
              <div className="mt-5 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onCancelBulk}
                  className="inline-flex h-10 w-1/2 cursor-pointer items-center justify-center rounded-xl border border-black/10 bg-white px-4 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#e8ebe2]/60"
                >
                  Zrušiť
                </button>
                <button
                  type="button"
                  onClick={onConfirmBulk}
                  className="inline-flex h-10 w-1/2 cursor-pointer items-center justify-center rounded-xl bg-[#75825B] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  Potvrdiť
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function StockModeDropdown({
  lineKey,
  label,
  value,
  open,
  rootRef,
  onToggle,
  onChange,
}: {
  lineKey: string;
  label: string;
  value: LineStockMode;
  open: boolean;
  rootRef: (el: HTMLDivElement | null) => void;
  onToggle: () => void;
  onChange: (next: LineStockMode) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const selected =
    STOCK_MODE_OPTIONS.find((opt) => opt.value === value) ??
    STOCK_MODE_OPTIONS[0];
  const listId = `stock-mode-list-${lineKey}`;

  useEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    function sync() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuHeight = menuRef.current?.offsetHeight ?? 140;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < menuHeight + 12 && rect.top > menuHeight;
      setMenuPos({
        top: openUp ? rect.top - menuHeight - 6 : rect.bottom + 6,
        left: rect.left,
        width: Math.max(rect.width, 192),
      });
    }
    sync();
    const frame = requestAnimationFrame(sync);
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative"
      data-stock-mode-root={lineKey}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Stav skladu: ${label}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={onToggle}
        className={`flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-black/10 bg-[#faf8f5] px-3.5 text-left text-sm text-[#2f2924] outline-none transition-colors hover:border-[#75825B]/40 focus:border-[#75825B] focus:bg-white ${
          open ? "border-[#75825B] bg-white" : ""
        }`}
      >
        <span className="truncate">{selected.label}</span>
        <ChevronDown
          className={`size-4 shrink-0 text-[#2f2924]/45 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>

      {open && menuPos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              id={listId}
              role="listbox"
              aria-label={`Stav skladu: ${label}`}
              data-stock-mode-menu={lineKey}
              style={{
                position: "fixed",
                top: menuPos.top,
                left: menuPos.left,
                width: menuPos.width,
                zIndex: 80,
              }}
              className="overflow-hidden rounded-xl border border-black/8 bg-white shadow-[0_12px_32px_rgba(47,41,36,0.12)]"
            >
              {STOCK_MODE_OPTIONS.map((opt) => {
                const active = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`flex w-full cursor-pointer px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-[#faf8f5] ${
                      active
                        ? "bg-[#faf8f5] font-medium text-[#75825B]"
                        : "bg-white text-[#2f2924]"
                    }`}
                    onClick={() => onChange(opt.value)}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

