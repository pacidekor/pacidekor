"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgePercent,
  Check,
  ChevronRight,
  ListFilter,
  Plus,
  Search,
} from "lucide-react";
import { DiscountEditorPanel } from "@/components/admin/DiscountEditorPanel";
import { FilterChip } from "@/components/FilterChip";
import { FilterSheet } from "@/components/FilterSheet";
import { FilterSheetFooter } from "@/components/FilterSheetFooter";
import {
  deleteDiscountAction,
  setDiscountActiveAction,
  upsertDiscountAction,
} from "@/lib/actions/discounts";
import {
  deletePromoCodeAction,
  listPromoCodesAction,
  setPromoCodeActiveAction,
  upsertPromoCodeAction,
  type AdminPromoCode,
} from "@/lib/actions/promo";
import {
  DISCOUNT_STATUS_META,
  formatDiscountValidity,
  getDiscountStatus,
  getProductForDiscount,
  readDiscounts,
  seedDiscounts,
  writeDiscounts,
  type DiscountStatus,
  type ProductDiscount,
} from "@/lib/discounts";
import {
  normalizeSearchText,
  productMatchesSearchQuery,
} from "@/lib/search";

type StatusFilter = "all" | DiscountStatus;
type TypeFilter = "all" | "product" | "promo";

type EditorTarget =
  | { mode: "create" }
  | { mode: "product"; discount: ProductDiscount }
  | { mode: "promo"; promo: AdminPromoCode };

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "Všetky stavy" },
  { id: "active", label: "Aktívne" },
  { id: "inactive", label: "Neaktívne" },
  { id: "scheduled", label: "Naplánované" },
  { id: "expired", label: "Vypršané" },
];

const TYPE_FILTERS: { id: TypeFilter; label: string }[] = [
  { id: "all", label: "Všetky typy" },
  { id: "product", label: "Produktové zľavy" },
  { id: "promo", label: "Zľavové kódy" },
];

function getPromoStatus(promo: AdminPromoCode): DiscountStatus {
  if (!promo.active) return "inactive";
  const today = new Date().toISOString().slice(0, 10);
  if (promo.startsAt && promo.startsAt > today) return "scheduled";
  if (promo.endsAt && promo.endsAt < today) return "expired";
  if (promo.maxUses != null && promo.usedCount >= promo.maxUses) {
    return "expired";
  }
  return "active";
}

function formatPromoValidity(promo: AdminPromoCode) {
  if (!promo.startsAt && !promo.endsAt) return "Bez limitu";
  if (promo.startsAt && promo.endsAt) {
    return `${promo.startsAt} – ${promo.endsAt}`;
  }
  if (promo.startsAt) return `Od ${promo.startsAt}`;
  return `Do ${promo.endsAt}`;
}

export function AdminDiscountsManager() {
  const [list, setList] = useState<ProductDiscount[]>(seedDiscounts);
  const [promos, setPromos] = useState<AdminPromoCode[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setList(readDiscounts());
    void listPromoCodesAction().then((result) => {
      if (result.ok) setPromos(result.data);
    });
    setHydrated(true);
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const filteredProducts = useMemo(() => {
    if (typeFilter === "promo") return [];
    const q = query.trim().toLowerCase();

    return list.filter((discount) => {
      const status = getDiscountStatus(discount);
      if (statusFilter !== "all" && status !== statusFilter) return false;

      const product = getProductForDiscount(discount.productId);
      if (!q) return true;

      if (product && productMatchesSearchQuery(product, q)) return true;

      const haystack = normalizeSearchText(
        [
          discount.originalPrice,
          discount.salePrice,
          DISCOUNT_STATUS_META[status].label,
          "produkt",
        ].join(" "),
      );

      return haystack.includes(normalizeSearchText(q));
    });
  }, [list, query, statusFilter, typeFilter]);

  const filteredPromos = useMemo(() => {
    if (typeFilter === "product") return [];
    const q = query.trim().toLowerCase();

    return promos.filter((promo) => {
      const status = getPromoStatus(promo);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (!q) return true;

      const haystack = normalizeSearchText(
        [
          promo.code,
          promo.note ?? "",
          String(promo.discountPercent),
          DISCOUNT_STATUS_META[status].label,
          "kod",
          "kód",
          "slevovy",
          "zľavový",
        ].join(" "),
      );

      return haystack.includes(normalizeSearchText(q));
    });
  }, [promos, query, statusFilter, typeFilter]);

  const totalVisible = filteredProducts.length + filteredPromos.length;
  const totalAll = list.length + promos.length;
  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) + (typeFilter !== "all" ? 1 : 0);

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
    setEditor({ mode: "create" });
  }

  function closeEditor() {
    setEditor(null);
  }

  async function saveDiscount(next: Omit<ProductDiscount, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
  }) {
    const result = await upsertDiscountAction({
      id: next.id,
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

  async function savePromo(next: {
    id?: string;
    code: string;
    discountPercent: number;
    active: boolean;
    startsAt?: string;
    endsAt?: string;
    minOrderEur?: number;
    maxUses?: number;
    note?: string;
  }) {
    const result = await upsertPromoCodeAction(next);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }

    const saved = result.data;
    setPromos((prev) => {
      const without = prev.filter((item) => item.id !== saved.id);
      return [saved, ...without];
    });
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

  async function endPromo(id: string) {
    const result = await setPromoCodeActiveAction(id, false);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    setPromos((prev) =>
      prev.map((item) => (item.id === id ? result.data : item)),
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

  async function deletePromo(id: string) {
    const result = await deletePromoCodeAction(id);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    setPromos((prev) => prev.filter((item) => item.id !== id));
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
            Správa akciových cien produktov a zľavových kódov.
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
        <div className="mb-4 flex items-center gap-2.5 sm:gap-3">
          <div className="relative min-w-0 flex-[7] sm:max-w-md sm:flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#2f2924]/35"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Hľadať produkt, SKU alebo zľavový kód…"
              className="h-11 w-full rounded-xl border border-black/10 bg-white pr-4 pl-10 text-sm text-[#2f2924] outline-none placeholder:text-[#2f2924]/35 transition-colors focus:border-[#75825B] focus:ring-2 focus:ring-[#75825B]/20"
            />
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="inline-flex h-11 min-w-0 flex-[3] cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white px-2.5 text-sm font-medium text-[#2f2924] transition-colors hover:border-[#75825B]/40 sm:ml-auto sm:w-auto sm:flex-none sm:gap-2 sm:px-4"
          >
            <ListFilter className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
            <span className="truncate">Filtrovať</span>
            {activeFilterCount > 0 ? (
              <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[#75825B] text-[11px] font-semibold text-white">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>

        <section className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
          <div className="hidden items-center gap-4 border-b border-black/[0.05] px-5 py-3 text-xs font-medium tracking-wide text-[#2f2924]/45 uppercase lg:flex">
            <span className="min-w-0 flex-1">Položka</span>
            <span className="w-[6.5rem] shrink-0 text-right">Detail</span>
            <span className="w-[6.5rem] shrink-0 text-right">Hodnota</span>
            <span className="w-14 shrink-0 text-right">Zľava</span>
            <span className="w-[9.5rem] shrink-0">Platnosť</span>
            <span className="w-16 shrink-0 text-center">Typ</span>
            <span className="w-[7.5rem] shrink-0">Stav</span>
            <span className="w-20 shrink-0" aria-hidden />
          </div>

          {totalVisible === 0 ? (
            <div className="px-5 py-16 text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#e8ebe2] text-[#75825B]">
                <BadgePercent className="size-5" aria-hidden />
              </span>
              <p className="mt-4 text-sm font-medium text-[#2f2924]">
                {totalAll === 0
                  ? "Zatiaľ žiadne zľavy"
                  : "Žiadne zľavy podľa filtra"}
              </p>
              <p className="mt-1 text-sm text-[#2f2924]/50">
                {totalAll === 0
                  ? "Pridajte akciovú cenu produktu alebo zľavový kód."
                  : "Skúste zmeniť filter alebo vyhľadávanie."}
              </p>
              {totalAll === 0 ? (
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
              {filteredProducts.map((discount) => {
                const product = getProductForDiscount(discount.productId);
                const status = getDiscountStatus(discount);
                const meta = DISCOUNT_STATUS_META[status];

                return (
                  <li key={`product-${discount.id}`}>
                    <div className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:gap-4">
                      <button
                        type="button"
                        onClick={() =>
                          setEditor({ mode: "product", discount })
                        }
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
                          Produkt
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
                            onClick={() =>
                              setEditor({ mode: "product", discount })
                            }
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

              {filteredPromos.map((promo) => {
                const status = getPromoStatus(promo);
                const meta = DISCOUNT_STATUS_META[status];

                return (
                  <li key={`promo-${promo.id}`}>
                    <div className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:gap-4">
                      <button
                        type="button"
                        onClick={() => setEditor({ mode: "promo", promo })}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                      >
                        <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#e8ebe2] text-[#75825B]">
                          <BadgePercent className="size-5" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-medium tracking-wide text-[#2f2924] uppercase">
                            {promo.code}
                          </span>
                          <span className="mt-0.5 block truncate text-sm text-[#2f2924]/45">
                            {promo.maxUses != null
                              ? `Použité ${promo.usedCount}/${promo.maxUses}`
                              : `Použité ${promo.usedCount}×`}
                            {promo.minOrderEur != null
                              ? ` · od ${promo.minOrderEur.toFixed(2).replace(".", ",")} €`
                              : ""}
                          </span>
                        </span>
                      </button>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-[3.75rem] text-sm lg:contents lg:pl-0">
                        <p className="tabular-nums text-[#2f2924]/55 lg:w-[6.5rem] lg:shrink-0 lg:text-right">
                          <span className="lg:hidden">Kód: </span>
                          —
                        </p>
                        <p className="font-medium tabular-nums text-[#2f2924] lg:w-[6.5rem] lg:shrink-0 lg:text-right">
                          <span className="lg:hidden">Hodnota: </span>
                          {promo.discountPercent}&nbsp;%
                        </p>
                        <p className="font-semibold tabular-nums text-[#75825B] lg:w-14 lg:shrink-0 lg:text-right">
                          -{promo.discountPercent}%
                        </p>
                        <p className="text-[#2f2924]/55 lg:w-[9.5rem] lg:shrink-0">
                          {formatPromoValidity(promo)}
                        </p>
                        <p className="text-center text-[#2f2924]/70 lg:w-16 lg:shrink-0">
                          Kód
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
                            onClick={() => endPromo(promo.id)}
                            className="inline-flex h-8 cursor-pointer items-center rounded-lg px-2.5 text-xs font-medium text-[#c45c4a] transition-colors hover:bg-[#c45c4a]/8"
                          >
                            Ukončiť
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditor({ mode: "promo", promo })}
                            className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-[#2f2924]/35 transition-colors hover:bg-[#e8ebe2] hover:text-[#2f2924]"
                            aria-label="Upraviť zľavový kód"
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

      <FilterSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        footer={
          <FilterSheetFooter
            hasActiveFilters={activeFilterCount > 0}
            onClear={() => {
              setStatusFilter("all");
              setTypeFilter("all");
            }}
            onDone={() => setFiltersOpen(false)}
          />
        }
      >
        <div>
          <p className="text-xs font-medium tracking-[0.12em] text-[#75825B] uppercase">
            Typ zľavy
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {TYPE_FILTERS.map((filter) => (
              <FilterChip
                key={filter.id}
                label={filter.label}
                active={typeFilter === filter.id}
                onClick={() => setTypeFilter(filter.id)}
              />
            ))}
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs font-medium tracking-[0.12em] text-[#75825B] uppercase">
            Stav zľavy
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => (
              <FilterChip
                key={filter.id}
                label={filter.label}
                active={statusFilter === filter.id}
                onClick={() => setStatusFilter(filter.id)}
              />
            ))}
          </div>
        </div>
      </FilterSheet>

      {editor ? (
        <DiscountEditorPanel
          key={
            editor.mode === "create"
              ? "__new__"
              : editor.mode === "product"
                ? `product-${editor.discount.id}`
                : `promo-${editor.promo.id}`
          }
          target={editor}
          productsWithDiscount={productsWithDiscount}
          onClose={closeEditor}
          onSaveProduct={saveDiscount}
          onSavePromo={savePromo}
          onDelete={
            editor.mode === "product"
              ? () => deleteDiscount(editor.discount.id)
              : editor.mode === "promo"
                ? () => deletePromo(editor.promo.id)
                : undefined
          }
          onEnd={
            editor.mode === "product" &&
            (getDiscountStatus(editor.discount) === "active" ||
              getDiscountStatus(editor.discount) === "scheduled")
              ? () => {
                  endDiscount(editor.discount.id);
                  closeEditor();
                }
              : editor.mode === "promo" &&
                  (getPromoStatus(editor.promo) === "active" ||
                    getPromoStatus(editor.promo) === "scheduled")
                ? () => {
                    endPromo(editor.promo.id);
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
