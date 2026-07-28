"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import {
  Check,
  ChevronDown,
  ExternalLink,
  ImagePlus,
  Info,
  ListFilter,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { categories, toSlug } from "@/lib/navigation";
import {
  productHref,
  products as seedProducts,
  type Product,
} from "@/lib/products";
import {
  filterColors,
  getPackagingFormatById,
  getSubcategoriesForCategory,
  packagingFormats,
  type PackagingOption,
  type ProductAttributes,
} from "@/lib/taxonomy";
import {
  getInventoryForProduct,
  INVENTORY_EVENT,
  inventoryLabel,
  isInventoryAvailable,
  setInventory,
} from "@/lib/inventory";
import { lockPageScroll } from "@/lib/lock-page-scroll";

const STORAGE_KEY = "pacidekor.admin.product-taxonomy";
const CUSTOM_PRODUCTS_KEY = "pacidekor.admin.custom-products";
const DELETED_PRODUCTS_KEY = "pacidekor.admin.deleted-products";
const CREATE_DRAFT_ID = "__new__";

const CREATE_DRAFT_PRODUCT: Product = {
  id: CREATE_DRAFT_ID,
  slug: "novy-produkt",
  name: "",
  description: "",
  sku: "",
  price: "0,00 €",
  image: "",
  category: "Umelé kvety",
  details: [
    {
      title: "Materiál",
      content: "",
    },
    {
      title: "Použitie",
      content: "",
    },
    {
      title: "Doprava",
      content:
        "Objednávky expedujeme do 24 hodín. Doručenie kuriérom obvykle do 1-2 pracovných dní na Slovensku.",
    },
  ],
  inStock: true,
};

type ProductOverride = {
  name: string;
  description: string;
  sku?: string;
  image: string;
  hoverImage?: string;
  extraImages?: string[];
  category: string;
  subcategoryId?: string;
  attributes: ProductAttributes;
};

type OverridesMap = Record<string, ProductOverride>;

function readOverrides(): OverridesMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as OverridesMap;
  } catch {
    return {};
  }
}

function writeOverrides(overrides: OverridesMap) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

function readCustomProducts(): Product[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_PRODUCTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Product[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCustomProducts(products: Product[]) {
  window.localStorage.setItem(CUSTOM_PRODUCTS_KEY, JSON.stringify(products));
}

function readDeletedProductIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DELETED_PRODUCTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDeletedProductIds(ids: string[]) {
  window.localStorage.setItem(DELETED_PRODUCTS_KEY, JSON.stringify(ids));
}

function applyOverride(product: Product, override?: ProductOverride): Product {
  if (!override) return product;
  return {
    ...product,
    name: override.name ?? product.name,
    description: override.description ?? product.description,
    sku: override.sku ?? product.sku,
    image: override.image ?? product.image,
    hoverImage: override.hoverImage,
    extraImages: override.extraImages,
    category: override.category ?? product.category,
    subcategoryId: override.subcategoryId,
    attributes: override.attributes,
  };
}

function productToOverride(product: Product): ProductOverride {
  return {
    name: product.name,
    description: product.description,
    sku: product.sku,
    image: product.image,
    hoverImage: product.hoverImage,
    extraImages: product.extraImages,
    category: product.category,
    subcategoryId: product.subcategoryId,
    attributes: product.attributes ?? {},
  };
}

function overridesEqual(a: ProductOverride, b: ProductOverride) {
  return JSON.stringify(normalizeOverride(a)) === JSON.stringify(normalizeOverride(b));
}

function normalizeOverride(value: ProductOverride): ProductOverride {
  return {
    name: value.name.trim(),
    description: value.description.trim(),
    sku: value.sku?.trim() || undefined,
    image: value.image.trim(),
    hoverImage: value.hoverImage?.trim() || undefined,
    extraImages:
      value.extraImages?.map((item) => item.trim()).filter(Boolean) ?? undefined,
    category: value.category,
    subcategoryId: value.subcategoryId || undefined,
    attributes: {
      colors:
        value.attributes.colors && value.attributes.colors.length > 0
          ? value.attributes.colors
          : undefined,
      packaging:
        value.attributes.packaging && value.attributes.packaging.length > 0
          ? value.attributes.packaging
              .map((item) => ({
                id: item.id,
                pieces: Math.max(0, Math.floor(Number(item.pieces) || 0)),
                label: item.label?.trim() || undefined,
              }))
              .filter((item) => item.pieces > 0)
          : undefined,
    },
  };
}

type StockFilter = "all" | "in" | "out" | "low";

const LOW_STOCK_THRESHOLD = 5;

export function AdminProductsManager() {
  const [overrides, setOverrides] = useState<OverridesMap>({});
  const [customProducts, setCustomProducts] = useState<Product[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [colorFilter, setColorFilter] = useState<string[]>([]);
  const [packagingFilter, setPackagingFilter] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [inventoryTick, setInventoryTick] = useState(0);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setOverrides(readOverrides());
    setCustomProducts(readCustomProducts());
    setDeletedIds(readDeletedProductIds());
    setHydrated(true);
  }, []);

  useEffect(() => {
    function syncInventory() {
      setInventoryTick((value) => value + 1);
    }
    window.addEventListener(INVENTORY_EVENT, syncInventory);
    window.addEventListener("storage", syncInventory);
    return () => {
      window.removeEventListener(INVENTORY_EVENT, syncInventory);
      window.removeEventListener("storage", syncInventory);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const list = useMemo(() => {
    const deleted = new Set(deletedIds);
    const customs = customProducts
      .filter((product) => !deleted.has(product.id))
      .map((product) => applyOverride(product, overrides[product.id]));
    const seeds = seedProducts
      .filter((product) => !deleted.has(product.id))
      .map((product) => applyOverride(product, overrides[product.id]));
    return [...customs, ...seeds];
  }, [customProducts, overrides, deletedIds]);

  const filtered = useMemo(() => {
    void inventoryTick;
    const q = query.trim().toLowerCase();

    return list.filter((product) => {
      if (categoryFilter !== "all" && product.category !== categoryFilter) {
        return false;
      }

      if (colorFilter.length > 0) {
        const productColors = product.attributes?.colors ?? [];
        const matchesColor = colorFilter.some((color) =>
          productColors.includes(color),
        );
        if (!matchesColor) return false;
      }

      if (packagingFilter.length > 0) {
        const productPackaging = product.attributes?.packaging ?? [];
        const matchesPackaging = packagingFilter.some((formatId) =>
          productPackaging.some((option) => option.id === formatId),
        );
        if (!matchesPackaging) return false;
      }

      const inventory = getInventoryForProduct(product);
      const available = isInventoryAvailable(inventory);

      if (stockFilter === "in" && !available) return false;
      if (stockFilter === "out" && available) return false;
      if (
        stockFilter === "low" &&
        !(
          available &&
          inventory.quantity != null &&
          inventory.quantity <= LOW_STOCK_THRESHOLD
        )
      ) {
        return false;
      }

      if (!q) return true;
      return (
        product.name.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q) ||
        (product.sku ?? "").toLowerCase().includes(q)
      );
    });
  }, [
    list,
    query,
    categoryFilter,
    stockFilter,
    colorFilter,
    packagingFilter,
    inventoryTick,
  ]);

  const editing = isCreating
    ? CREATE_DRAFT_PRODUCT
    : (list.find((product) => product.id === editingId) ?? null);

  function showSavedToast() {
    setSavedFlash(true);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setSavedFlash(false), 2800);
  }

  function uniqueSlug(base: string) {
    const existing = new Set(
      [...seedProducts, ...customProducts].map((product) => product.slug),
    );
    let slug = base || "novy-produkt";
    let suffix = 2;
    while (existing.has(slug)) {
      slug = `${base || "novy-produkt"}-${suffix}`;
      suffix += 1;
    }
    return slug;
  }

  function saveOverride(
    productId: string,
    next: ProductOverride,
    stock: { inStock: boolean; quantity: number | null },
  ) {
    const normalized = normalizeOverride(next);

    if (productId === CREATE_DRAFT_ID) {
      const id = `custom-${Date.now()}`;
      const slug = uniqueSlug(toSlug(normalized.name));
      const created: Product = {
        id,
        slug,
        name: normalized.name,
        description: normalized.description,
        sku: normalized.sku,
        price: "0,00 €",
        image: normalized.image,
        hoverImage: normalized.hoverImage,
        extraImages: normalized.extraImages,
        category: normalized.category,
        subcategoryId: normalized.subcategoryId,
        attributes: normalized.attributes,
        details: CREATE_DRAFT_PRODUCT.details,
        inStock: stock.inStock,
        stockQuantity: stock.quantity ?? undefined,
      };

      setCustomProducts((prev) => {
        const copy = [created, ...prev];
        writeCustomProducts(copy);
        return copy;
      });

      setInventory(id, {
        inStock: stock.inStock,
        quantity: stock.inStock ? stock.quantity : null,
      });

      showSavedToast();
      return;
    }

    const base =
      seedProducts.find((product) => product.id === productId) ??
      customProducts.find((product) => product.id === productId);
    if (!base) return;

    const matchesBase = overridesEqual(normalized, productToOverride(base));

    setOverrides((prev) => {
      const copy = { ...prev };
      if (matchesBase) {
        delete copy[productId];
      } else {
        copy[productId] = normalized;
      }
      writeOverrides(copy);
      return copy;
    });

    setInventory(productId, {
      inStock: stock.inStock,
      quantity: stock.inStock ? stock.quantity : null,
    });

    showSavedToast();
  }

  function deleteProduct(productId: string) {
    if (productId === CREATE_DRAFT_ID) return;

    const isCustom = customProducts.some((product) => product.id === productId);

    if (isCustom) {
      setCustomProducts((prev) => {
        const next = prev.filter((product) => product.id !== productId);
        writeCustomProducts(next);
        return next;
      });
    } else {
      setDeletedIds((prev) => {
        if (prev.includes(productId)) return prev;
        const next = [...prev, productId];
        writeDeletedProductIds(next);
        return next;
      });
    }

    setOverrides((prev) => {
      if (!(productId in prev)) return prev;
      const copy = { ...prev };
      delete copy[productId];
      writeOverrides(copy);
      return copy;
    });
  }

  function resetAll() {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(DELETED_PRODUCTS_KEY);
    setOverrides({});
    setDeletedIds([]);
    setEditingId(null);
    setIsCreating(false);
  }

  function openCreate() {
    setEditingId(null);
    setIsCreating(true);
  }

  function closeEditor() {
    setEditingId(null);
    setIsCreating(false);
  }

  const categoryOptions = [
    { value: "all", label: "Všetky kategórie" },
    ...categories.map((label) => ({ value: label, label })),
  ];

  const stockOptions = [
    { value: "all", label: "Celý sklad" },
    { value: "in", label: "Na sklade" },
    { value: "out", label: "Nie je na sklade" },
    { value: "low", label: `Posledné kusy (≤${LOW_STOCK_THRESHOLD})` },
  ];

  const activeFilterCount =
    (categoryFilter !== "all" ? 1 : 0) +
    (stockFilter !== "all" ? 1 : 0) +
    (colorFilter.length > 0 ? 1 : 0) +
    (packagingFilter.length > 0 ? 1 : 0);

  function clearFilters() {
    setCategoryFilter("all");
    setStockFilter("all");
    setColorFilter([]);
    setPackagingFilter([]);
  }

  function toggleColor(colorId: string) {
    setColorFilter((prev) =>
      prev.includes(colorId)
        ? prev.filter((id) => id !== colorId)
        : [...prev, colorId],
    );
  }

  function togglePackagingFilter(formatId: string) {
    setPackagingFilter((prev) =>
      prev.includes(formatId)
        ? prev.filter((id) => id !== formatId)
        : [...prev, formatId],
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-semibold text-[#2f2924] sm:text-3xl">
            Produkty
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#2f2924]/65 sm:text-base">
            Správa produktov a ich zaradenia do kategórií, subkategórií a
            filtrov.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 self-start rounded-xl bg-[#75825B] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" strokeWidth={2} aria-hidden />
          Nový produkt
        </button>
      </div>

      <div className="mt-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full min-w-0 max-w-md">
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

        <div className="ml-auto flex shrink-0 items-center gap-3">
          {hydrated && Object.keys(overrides).length > 0 ? (
            <button
              type="button"
              onClick={resetAll}
              className="hidden cursor-pointer text-sm font-medium text-[#2f2924]/55 transition-colors hover:text-[#2f2924] sm:inline"
            >
              Obnoviť predvolené
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-sm font-medium text-[#2f2924] transition-colors hover:border-[#75825B]/40"
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
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/6 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[15px]">
            <thead className="border-b border-black/6 bg-white text-xs tracking-wide text-[#2f2924]/55 uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Produkt</th>
                <th className="px-4 py-3 font-medium">Kategória</th>
                <th className="px-4 py-3 font-medium">Formát dodania</th>
                <th className="px-4 py-3 font-medium">Sklad</th>
                <th className="px-4 py-3 text-right font-medium">Akcie</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const hasOverride = Boolean(overrides[product.id]);
                const isCustom = customProducts.some(
                  (item) => item.id === product.id,
                );
                const inventory = getInventoryForProduct(product);
                const packagingLabel = formatPackagingSummary(
                  product.attributes?.packaging,
                );

                return (
                  <tr
                    key={product.id}
                    className="border-b border-black/5 last:border-b-0"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-[#e8ebe2]">
                          {product.image ? (
                            <ProductThumb src={product.image} />
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
                          {hasOverride || isCustom ? (
                            <p className="text-xs text-[#75825B]">
                              {isCustom ? "Vlastný produkt" : "Upravené lokálne"}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[#2f2924]/80">
                      {product.category}
                    </td>
                    <td className="px-4 py-3.5 text-[#2f2924]/80">
                      {packagingLabel || (
                        <span className="text-[#2f2924]/35">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${
                          isInventoryAvailable(inventory)
                            ? "bg-[#e8ebe2] text-[#5f6a49]"
                            : "bg-[#fee2e2] text-[#b91c1c]"
                        }`}
                      >
                        {inventoryLabel(inventory)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {!isCustom ? (
                          <Link
                            href={productHref(product.slug)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-[#2f2924]/65 transition-colors hover:bg-[#e8ebe2] hover:text-[#2f2924]"
                          >
                            <ExternalLink
                              className="size-3.5"
                              strokeWidth={1.75}
                              aria-hidden
                            />
                            Prejsť na produkt
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreating(false);
                            setEditingId(product.id);
                          }}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-[#75825B] transition-colors hover:bg-[#e8ebe2]"
                        >
                          <Pencil
                            className="size-3.5"
                            strokeWidth={1.75}
                            aria-hidden
                          />
                          Upraviť
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-4 text-center text-sm text-[#2f2924]/55">
          Žiadne produkty pre zvolené filtre.
        </p>
      ) : null}

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

            <div className="space-y-5 px-5 py-5">
              <FieldLabel label="Kategória">
                <AdminSelect
                  value={categoryFilter}
                  options={categoryOptions}
                  onChange={setCategoryFilter}
                />
              </FieldLabel>

              <FieldLabel label="Sklad">
                <AdminSelect
                  value={stockFilter}
                  options={stockOptions}
                  onChange={(value) => setStockFilter(value as StockFilter)}
                />
              </FieldLabel>

              <fieldset>
                <legend className="text-sm font-medium text-[#2f2924]">
                  Formát dodania
                </legend>
                <div className="mt-3 flex flex-col gap-1">
                  {packagingFormats.map((format) => (
                    <label
                      key={format.id}
                      className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-[#2f2924] transition-colors hover:bg-[#e8ebe2]/60"
                    >
                      <input
                        type="checkbox"
                        checked={packagingFilter.includes(format.id)}
                        onChange={() => togglePackagingFilter(format.id)}
                        className="size-4 accent-[#75825B]"
                      />
                      {format.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-sm font-medium text-[#2f2924]">
                  Farba
                </legend>
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  {filterColors.map((color) => (
                    <label
                      key={color.id}
                      className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-[#2f2924] transition-colors hover:bg-[#e8ebe2]/60"
                    >
                      <input
                        type="checkbox"
                        checked={colorFilter.includes(color.id)}
                        onChange={() => toggleColor(color.id)}
                        className="size-4 accent-[#75825B]"
                      />
                      {color.hex ? (
                        <span
                          className="size-3.5 rounded-full border border-black/10"
                          style={{ backgroundColor: color.hex }}
                          aria-hidden
                        />
                      ) : null}
                      {color.label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-black/6 px-5 py-4">
              <button
                type="button"
                onClick={clearFilters}
                className="cursor-pointer text-sm font-medium text-[#2f2924]/55 transition-colors hover:text-[#2f2924]"
              >
                Zrušiť filtre
              </button>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[#75825B] px-5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Použiť
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editing ? (
        <ProductEditor
          key={isCreating ? CREATE_DRAFT_ID : editing.id}
          product={editing}
          isNew={isCreating}
          onClose={closeEditor}
          onSave={(next, stock) => {
            saveOverride(editing.id, next, stock);
          }}
          onDelete={
            isCreating
              ? undefined
              : () => {
                  deleteProduct(editing.id);
                }
          }
        />
      ) : null}
      </div>

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

function ProductEditor({
  product,
  isNew = false,
  onClose,
  onSave,
  onDelete,
}: {
  product: Product;
  isNew?: boolean;
  onClose: () => void;
  onSave: (
    next: ProductOverride,
    stock: { inStock: boolean; quantity: number | null },
  ) => void;
  onDelete?: () => void;
}) {
  const initialInventory = getInventoryForProduct(product);
  const [entered, setEntered] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description);
  const [sku, setSku] = useState(product.sku ?? "");
  const [images, setImages] = useState<string[]>(() =>
    [
      product.image,
      product.hoverImage,
      ...(product.extraImages ?? []),
    ].filter((src): src is string => Boolean(src)),
  );
  const [category, setCategory] = useState(product.category);
  const [subcategoryId, setSubcategoryId] = useState(
    product.subcategoryId ?? "",
  );
  const [colors, setColors] = useState<string[]>(
    product.attributes?.colors ?? [],
  );
  const [packaging, setPackaging] = useState<PackagingOption[]>(
    product.attributes?.packaging ?? [],
  );
  const [inStock, setInStock] = useState(initialInventory.inStock);
  const [stockQuantity, setStockQuantity] = useState(
    initialInventory.quantity != null ? String(initialInventory.quantity) : "",
  );
  const [discardOpen, setDiscardOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceIndexRef = useRef<number | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialSnapshotRef = useRef(
    serializeEditorSnapshot({
      name: product.name,
      description: product.description,
      sku: product.sku ?? "",
      images: [
        product.image,
        product.hoverImage,
        ...(product.extraImages ?? []),
      ].filter((src): src is string => Boolean(src)),
      category: product.category,
      subcategoryId: product.subcategoryId ?? "",
      colors: product.attributes?.colors ?? [],
      packaging: product.attributes?.packaging ?? [],
      inStock: initialInventory.inStock,
      stockQuantity:
        initialInventory.quantity != null
          ? String(initialInventory.quantity)
          : "",
    }),
  );

  const availableSubs = getSubcategoriesForCategory(category);
  const panelOpen = entered && !exiting;
  const isDirty =
    serializeEditorSnapshot({
      name,
      description,
      sku,
      images,
      category,
      subcategoryId,
      colors,
      packaging,
      inStock,
      stockQuantity,
    }) !== initialSnapshotRef.current;

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

  function confirmDelete() {
    if (!onDelete || exiting) return;
    setDeleteOpen(false);
    setDiscardOpen(false);
    setExiting(true);
    closeTimeoutRef.current = setTimeout(() => {
      onDelete();
      onClose();
    }, 320);
  }

  function saveAndClose() {
    if (exiting || !images[0] || !name.trim()) return;
    const [main = "", hover, ...extras] = images;
    const qtyRaw = stockQuantity.trim();
    const qty = qtyRaw === "" ? null : Number.parseInt(qtyRaw, 10);
    onSave(
      {
        name,
        description,
        sku: sku.trim() || undefined,
        image: main,
        hoverImage: hover,
        extraImages: extras.length > 0 ? extras : undefined,
        category,
        subcategoryId: subcategoryId || undefined,
        attributes: {
          colors: colors.length > 0 ? colors : undefined,
          packaging:
            packaging.filter((item) => item.pieces > 0).length > 0
              ? packaging
                  .filter((item) => item.pieces > 0)
                  .map((item) => ({
                    id: item.id,
                    pieces: item.pieces,
                    ...(item.id === "vlastni" && item.label?.trim()
                      ? { label: item.label.trim() }
                      : {}),
                  }))
              : undefined,
        },
      },
      {
        inStock,
        quantity:
          inStock && qty != null && !Number.isNaN(qty) && qty > 0 ? qty : null,
      },
    );
    closePanel();
  }

  useEffect(() => {
    if (
      subcategoryId &&
      !availableSubs.some((sub) => sub.id === subcategoryId)
    ) {
      setSubcategoryId("");
    }
  }, [category, availableSubs, subcategoryId]);

  function toggle(list: string[], id: string, setter: (next: string[]) => void) {
    setter(list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
  }

  function packagingSelected(id: string) {
    return packaging.some((item) => item.id === id);
  }

  function togglePackaging(id: string) {
    setPackaging((prev) => {
      if (prev.some((item) => item.id === id)) {
        return prev.filter((item) => item.id !== id);
      }
      return [
        ...prev,
        {
          id,
          pieces: 0,
          ...(id === "vlastni" ? { label: "Vlastní" } : {}),
        },
      ];
    });
  }

  function setPackagingPieces(id: string, raw: string) {
    const pieces = raw === "" ? 0 : Number.parseInt(raw, 10);
    setPackaging((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              pieces: Number.isNaN(pieces) ? 0 : Math.max(0, pieces),
            }
          : item,
      ),
    );
  }

  function setPackagingLabel(id: string, label: string) {
    setPackaging((prev) =>
      prev.map((item) => (item.id === id ? { ...item, label } : item)),
    );
  }

  function openFilePicker(replaceIndex: number | null = null) {
    replaceIndexRef.current = replaceIndex;
    fileInputRef.current?.click();
  }

  function onFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) return;

      setImages((prev) => {
        const replaceIndex = replaceIndexRef.current;
        if (replaceIndex === null) return [...prev, result];
        return prev.map((src, index) =>
          index === replaceIndex ? result : src,
        );
      });
      replaceIndexRef.current = null;
    };
    reader.readAsDataURL(file);
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function imageRoleLabel(index: number) {
    if (index === 0) return "Hlavný";
    if (index === 1) return "Hover";
    return null;
  }

  const categoryOptions = categories.map((label) => ({
    value: label,
    label,
  }));

  const subcategoryOptions = [
    {
      value: "",
      label:
        availableSubs.length === 0
          ? "Pre túto kategóriu zatiaľ nie sú subkategórie"
          : "Bez subkategórie",
    },
    ...availableSubs.map((sub) => ({ value: sub.id, label: sub.label })),
  ];

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
        onClick={requestClose}
      />
      <aside
        className={`relative z-10 flex h-full w-full max-w-4xl flex-col bg-white shadow-[-12px_0_40px_rgba(47,41,36,0.14)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          panelOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-black/6 px-6 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-[0.12em] text-[#75825B] uppercase">
              {isNew ? "Nový produkt" : "Úprava produktu"}
            </p>
            <h2 className="mt-1 truncate font-heading text-lg text-[#2f2924]">
              {name.trim() || "Bez názvu"}
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

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileSelected}
          />

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <section className="min-w-0 space-y-5">
              <FieldLabel label="Názov produktu">
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-11 w-full rounded-xl border border-black/10 bg-[#faf8f5] px-3.5 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:bg-white"
                  placeholder="Názov produktu"
                />
              </FieldLabel>

              <FieldLabel label="Popis">
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  className="min-h-[4.5rem] w-full resize-y rounded-xl border border-black/10 bg-[#faf8f5] px-3.5 py-3 text-sm leading-relaxed text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:bg-white"
                  placeholder="Popis produktu…"
                />
              </FieldLabel>

              <FieldLabel label="Kód produktu">
                <input
                  type="text"
                  value={sku}
                  onChange={(event) => setSku(event.target.value)}
                  className="h-11 w-full rounded-xl border border-black/10 bg-[#faf8f5] px-3.5 font-mono text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:bg-white"
                  placeholder="napr. #123A82"
                />
              </FieldLabel>

              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-[#2f2924]">Médiá</p>
                  <InfoHint text="Prvý obrázok je hlavný, druhý hover, ďalšie idú do galérie." />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {images.map((src, index) => {
                    const role = imageRoleLabel(index);
                    return (
                      <div
                        key={`${src.slice(0, 24)}-${index}`}
                        className="group relative aspect-square overflow-hidden rounded-xl bg-[#e8ebe2]"
                      >
                        <ProductThumb src={src} />
                        {role ? (
                          <span className="absolute top-2 left-2 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-[#2f2924] uppercase">
                            {role}
                          </span>
                        ) : null}
                        <div className="absolute inset-0 flex items-end justify-between gap-1 bg-gradient-to-t from-black/45 via-transparent to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => openFilePicker(index)}
                            className="cursor-pointer rounded-md bg-white/95 px-2 py-1 text-[11px] font-medium text-[#2f2924]"
                          >
                            Vymeniť
                          </button>
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md bg-white/95 text-[#2f2924] transition-colors hover:text-[#c45c4a]"
                            aria-label="Odstrániť obrázok"
                          >
                            <Trash2 className="size-3.5" strokeWidth={1.75} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => openFilePicker(null)}
                  className="mt-2.5 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#75825B]/40 bg-[#faf8f5] text-sm font-medium text-[#75825B] transition-colors hover:border-[#75825B] hover:bg-[#e8ebe2]/45"
                >
                  <ImagePlus className="size-4" strokeWidth={1.75} aria-hidden />
                  Pridať obrázok
                </button>
              </div>

              <div className="rounded-xl border border-black/8 bg-[#faf8f5] px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex shrink-0 cursor-pointer items-center gap-2.5 text-sm font-medium text-[#2f2924]">
                    <input
                      type="checkbox"
                      checked={inStock}
                      onChange={(event) => setInStock(event.target.checked)}
                      className="size-4 accent-[#75825B]"
                    />
                    Je na sklade?
                  </label>
                  {inStock ? (
                    <input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={stockQuantity}
                      onChange={(event) =>
                        setStockQuantity(event.target.value.replace(/\D/g, ""))
                      }
                      placeholder="Počet ks (voliteľné)"
                      aria-label="Počet kusov na sklade"
                      className="h-10 min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B]"
                    />
                  ) : (
                    <p className="text-xs text-[#2f2924]/45">
                      Produkt sa zákazníkom zobrazí ako vypredaný.
                    </p>
                  )}
                </div>
                {inStock ? (
                  <p className="mt-2 text-xs text-[#2f2924]/45">
                    Prázdne pole = neobmedzený počet kusov (sklad sa nepočíta).
                  </p>
                ) : null}
              </div>
            </section>

            <section className="min-w-0 space-y-5">
              <FieldLabel label="Kategória">
                <AdminSelect
                  value={category}
                  options={categoryOptions}
                  onChange={setCategory}
                />
              </FieldLabel>

              <FieldLabel label="Subkategória">
                <AdminSelect
                  value={subcategoryId}
                  options={subcategoryOptions}
                  onChange={setSubcategoryId}
                  disabled={availableSubs.length === 0}
                />
              </FieldLabel>

              <fieldset>
                <legend className="text-sm font-medium text-[#2f2924]">
                  Farby (filter)
                </legend>
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  {filterColors.map((color) => {
                    const selected = colors.includes(color.id);
                    return (
                      <label
                        key={color.id}
                        className={`flex cursor-pointer items-center gap-2.5 rounded-xl border border-black/10 px-2.5 py-2 text-sm text-[#2f2924] transition-colors hover:bg-[#e8ebe2]/60 ${
                          selected ? "bg-[#e8ebe2]/60" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggle(colors, color.id, setColors)}
                          className="size-4 accent-[#75825B]"
                        />
                        {color.hex ? (
                          <span
                            className="size-3.5 rounded-full border border-black/10"
                            style={{ backgroundColor: color.hex }}
                            aria-hidden
                          />
                        ) : null}
                        {color.label}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset>
                <legend className="flex items-center gap-1.5 text-sm font-medium text-[#2f2924]">
                  Formát dodania
                  <InfoHint text="Zaškrtnite spôsob balenia a uveďte počet kusov v danej jednotke." />
                </legend>
                <div className="mt-3 flex flex-col gap-2">
                  {packagingFormats.map((format) => {
                    const selected = packagingSelected(format.id);
                    const option = packaging.find(
                      (item) => item.id === format.id,
                    );
                    const pieces = option?.pieces ?? 0;
                    const customLabel = option?.label ?? format.label;
                    const isCustom = format.id === "vlastni";
                    return (
                      <label
                        key={format.id}
                        className={`flex min-h-11 cursor-pointer flex-wrap items-center gap-2.5 rounded-xl border border-black/10 px-2.5 py-2 text-sm text-[#2f2924] transition-colors hover:bg-[#e8ebe2]/60 ${
                          selected ? "bg-[#e8ebe2]/60" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => togglePackaging(format.id)}
                          className="size-4 accent-[#75825B]"
                        />
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          <PackagingFormatIcon id={format.id} />
                          {selected && isCustom ? (
                            <input
                              type="text"
                              value={customLabel}
                              onChange={(event) =>
                                setPackagingLabel(format.id, event.target.value)
                              }
                              onClick={(event) => event.preventDefault()}
                              placeholder="Názov balenia"
                              className="h-9 min-w-0 flex-1 cursor-text rounded-lg border border-black/10 bg-white px-2.5 text-sm text-[#2f2924] outline-none placeholder:text-[#2f2924]/35 focus:border-[#75825B]/50"
                            />
                          ) : (
                            format.label
                          )}
                        </span>
                        {selected ? (
                          <span
                            className="flex items-center gap-1.5"
                            onClick={(event) => event.preventDefault()}
                          >
                            <input
                              type="number"
                              min={1}
                              inputMode="numeric"
                              value={pieces > 0 ? String(pieces) : ""}
                              onChange={(e) =>
                                setPackagingPieces(format.id, e.target.value)
                              }
                              onClick={(event) => event.stopPropagation()}
                              placeholder="Počet ks"
                              className="h-9 w-28 cursor-text rounded-lg border border-black/10 bg-white px-2.5 text-sm text-[#2f2924] outline-none placeholder:text-[#2f2924]/35 focus:border-[#75825B]/50"
                            />
                            <span className="text-xs text-[#2f2924]/45">
                              ks
                            </span>
                          </span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </section>
          </div>
        </div>

        <div className="relative z-10 shrink-0 border-t border-black/6 bg-white px-6 py-4">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            {onDelete ? (
              <button
                type="button"
                onClick={() => {
                  setDiscardOpen(false);
                  setDeleteOpen(true);
                }}
                disabled={exiting}
                className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#c45c4a]/30 px-4 text-sm font-medium text-[#c45c4a] transition-colors hover:bg-[#c45c4a]/8 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
              >
                <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
                Odstrániť produkt
              </button>
            ) : null}
            <button
              type="button"
              onClick={saveAndClose}
              disabled={!images[0] || !name.trim() || exiting}
              className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-[#75825B] text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:ml-auto sm:w-auto sm:min-w-[12rem] sm:px-8"
            >
              Uložiť
            </button>
          </div>
        </div>
      </aside>

      {discardOpen ? (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/35 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="unsaved-changes-title"
            className="w-full max-w-sm rounded-2xl border border-black/8 bg-white p-5 shadow-[0_20px_48px_rgba(47,41,36,0.2)]"
          >
            <h3
              id="unsaved-changes-title"
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
                disabled={!images[0] || !name.trim() || exiting}
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
            aria-labelledby="delete-product-title"
            className="w-full max-w-sm rounded-2xl border border-black/8 bg-white p-5 shadow-[0_20px_48px_rgba(47,41,36,0.2)]"
          >
            <h3
              id="delete-product-title"
              className="font-heading text-lg text-[#2f2924]"
            >
              Odstrániť produkt?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#2f2924]/65">
              Produkt sa natrvalo odstráni zo zoznamu. Túto akciu nie je možné
              vrátiť späť.
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
    </div>
  );
}

function serializeEditorSnapshot(value: {
  name: string;
  description: string;
  sku: string;
  images: string[];
  category: string;
  subcategoryId: string;
  colors: string[];
  packaging: PackagingOption[];
  inStock: boolean;
  stockQuantity: string;
}) {
  return JSON.stringify({
    name: value.name.trim(),
    description: value.description.trim(),
    sku: value.sku.trim(),
    images: value.images,
    category: value.category,
    subcategoryId: value.subcategoryId,
    colors: [...value.colors].sort(),
    packaging: [...value.packaging]
      .map((item) => ({
        id: item.id,
        pieces: item.pieces,
        label: item.label?.trim() || undefined,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    inStock: value.inStock,
    stockQuantity: value.stockQuantity.trim(),
  });
}

function formatPackagingSummary(packaging?: PackagingOption[]) {
  if (!packaging || packaging.length === 0) return "";

  return packaging
    .map((option) => {
      const format = getPackagingFormatById(option.id);
      const label =
        option.id === "vlastni"
          ? option.label?.trim() || format?.label || "Vlastní"
          : format?.label || option.id;
      return `${label} (${option.pieces} ks)`;
    })
    .join(", ");
}

function ProductThumb({ src }: { src: string }) {
  const isLocalPath = src.startsWith("/");

  if (isLocalPath) {
    return (
      <Image src={src} alt="" fill sizes="160px" className="object-cover" />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="absolute inset-0 size-full object-cover" />
  );
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-[#2f2924]">
      {label}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function InfoHint({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  function updatePosition() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCoords({
      top: rect.top - 8,
      left: rect.left,
    });
  }

  function show() {
    updatePosition();
    setOpen(true);
  }

  function hide() {
    setOpen(false);
  }

  return (
    <span className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex size-4 cursor-help items-center justify-center rounded-full text-[#2f2924]/40 transition-colors hover:text-[#75825B]"
        aria-label={text}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        <Info className="size-3.5" strokeWidth={1.75} aria-hidden />
      </button>
      {open
        ? createPortal(
            <span
              role="tooltip"
              className="pointer-events-none fixed z-[80] w-56 -translate-y-full rounded-lg border border-black/8 bg-white px-2.5 py-2 text-xs font-normal leading-relaxed text-[#2f2924]/75 shadow-[0_8px_24px_rgba(47,41,36,0.12)]"
              style={{ top: coords.top, left: coords.left }}
            >
              {text}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}

function PackagingFormatIcon({ id }: { id: string }) {
  if (id === "krabica") {
    return (
      <Package
        className="size-4 shrink-0 text-[#75825B]"
        strokeWidth={1.75}
        aria-hidden
      />
    );
  }

  if (id === "paleta") {
    return (
      <span
        className="size-4 shrink-0 bg-[#75825B]"
        style={{
          maskImage: "url(/icons/pallet.png)",
          maskSize: "contain",
          maskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskImage: "url(/icons/pallet.png)",
          WebkitMaskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
        }}
        aria-hidden
      />
    );
  }

  if (id === "vlastni") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        className="size-4 shrink-0"
        aria-hidden
      >
        <path
          stroke="#75825B"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M11 5h10m-10 7h10m-10 7h10"
        />
        <rect
          width="4"
          height="4"
          x="3"
          y="3"
          stroke="#75825B"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          rx="1"
        />
        <rect
          width="4"
          height="4"
          x="3"
          y="10"
          stroke="#75825B"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          rx="1"
        />
        <rect
          width="4"
          height="4"
          x="3"
          y="17"
          stroke="#75825B"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          rx="1"
        />
      </svg>
    );
  }

  return null;
}

function AdminSelect({
  value,
  options,
  onChange,
  disabled = false,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected =
    options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-black/10 bg-[#faf8f5] px-3.5 text-left text-sm text-[#2f2924] outline-none transition-colors hover:border-[#75825B]/40 focus:border-[#75825B] focus:bg-white disabled:cursor-not-allowed disabled:opacity-50 ${
          open ? "border-[#75825B] bg-white" : ""
        }`}
      >
        <span className="truncate">{selected?.label ?? "Vybrať"}</span>
        <ChevronDown
          className={`size-4 shrink-0 text-[#2f2924]/45 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>

      {open && !disabled ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1.5 max-h-60 w-full overflow-auto rounded-xl border border-black/8 bg-white p-1.5 shadow-[0_12px_32px_rgba(47,41,36,0.12)]"
        >
          {options.map((option) => {
            const isActive = option.value === value;
            return (
              <li key={option.value || "__empty"}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                    isActive
                      ? "bg-[#e8ebe2] font-medium text-[#2f2924]"
                      : "text-[#2f2924]/80 hover:bg-[#faf8f5]"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {isActive ? (
                    <Check
                      className="size-3.5 shrink-0 text-[#75825B]"
                      strokeWidth={2}
                      aria-hidden
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
