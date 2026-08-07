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
  GripVertical,
  ImagePlus,
  Info,
  ListFilter,
  Package,
  Pencil,
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { formatPrice, parsePrice } from "@/lib/cart";
import { ImageLightbox } from "@/components/ImageLightbox";
import { FilterChip } from "@/components/FilterChip";
import { FilterSheet } from "@/components/FilterSheet";
import { FilterSheetFooter } from "@/components/FilterSheetFooter";
import { categories } from "@/lib/navigation";
import {
  ADMIN_CATEGORIES_EVENT,
  getAdminCategoryLabels,
  getAdminSubcategoriesForCategory,
  getAdminSubcategoryById,
} from "@/lib/admin-categories-store";
import { subscribeTaxonomy } from "@/lib/taxonomy-store";
import {
  buildEvenColorImageMap,
  colorsFromIds,
  colorSwatchStyle,
  DEFAULT_PRODUCT_DETAILS,
  encodeCustomColorId,
  generateProductSku,
  isActiveNewProduct,
  NEW_PRODUCT_DAYS,
  parseCustomColorId,
  productHref,
  suggestColorName,
  suggestSplitColorName,
  productColorMatchesFilter,
  type Product,
  type ProductDetail,
} from "@/lib/products";
import { setProductCatalog } from "@/lib/product-catalog";
import {
  deleteProductAction,
  uploadProductImageAction,
  upsertProductAction,
} from "@/lib/actions/products";
import {
  filterColors,
  getPackagingFormatById,
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
import type { AdminStockFilter } from "@/lib/admin-product-filters";

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
  details: DEFAULT_PRODUCT_DETAILS,
  inStock: true,
  isNew: true,
};

type ProductOverride = {
  name: string;
  description: string;
  sku?: string;
  price: string;
  image: string;
  hoverImage?: string;
  extraImages?: string[];
  category: string;
  subcategoryId?: string;
  attributes: ProductAttributes;
  colorImageMap?: Record<string, number[]>;
  details: ProductDetail[];
  markAsNew: boolean;
};

function normalizePriceInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "0,00 €";
  const parsed = parsePrice(
    trimmed.includes("€") ? trimmed : `${trimmed} €`,
  );
  if (!Number.isFinite(parsed) || parsed < 0) return "0,00 €";
  return formatPrice(parsed);
}

function normalizeOverride(value: ProductOverride): ProductOverride {
  return {
    name: value.name.trim(),
    description: value.description.trim(),
    sku: value.sku?.trim() || undefined,
    price: normalizePriceInput(value.price),
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
    colorImageMap: value.colorImageMap,
    details: DEFAULT_PRODUCT_DETAILS,
    markAsNew: value.markAsNew,
  };
}

type StockFilter = AdminStockFilter;

const LOW_STOCK_THRESHOLD = 5;

const CUSTOM_COLOR_PRESETS = [
  "#f5f2ec",
  "#e8d9c4",
  "#d4a0a8",
  "#c9959a",
  "#b43c3c",
  "#6e2c3a",
  "#d4894a",
  "#e0c35a",
  "#6b7f5a",
  "#5a7a9a",
  "#7a5f8a",
  "#8a6a4a",
  "#9a9a96",
  "#2f2924",
] as const;

export function AdminProductsManager({
  initialProducts,
  initialStockFilter = "all",
}: {
  initialProducts: Product[];
  initialStockFilter?: StockFilter;
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [draftSku, setDraftSku] = useState(() => generateProductSku());
  const [savedFlash, setSavedFlash] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] =
    useState<StockFilter>(initialStockFilter);
  const [colorFilter, setColorFilter] = useState<string[]>([]);
  const [packagingFilter, setPackagingFilter] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [inventoryTick, setInventoryTick] = useState(0);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setStockFilter(initialStockFilter);
  }, [initialStockFilter]);

  useEffect(() => {
    setProducts(initialProducts);
    setProductCatalog(initialProducts);
  }, [initialProducts]);

  useEffect(() => {
    setProductCatalog(products);
  }, [products]);

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

  const filtered = useMemo(() => {
    void inventoryTick;
    const q = query.trim().toLowerCase();

    return products.filter((product) => {
      if (categoryFilter !== "all" && product.category !== categoryFilter) {
        return false;
      }

      if (colorFilter.length > 0) {
        const productColors = product.attributes?.colors ?? [];
        const matchesColor = colorFilter.some((filterId) =>
          productColors.some((colorId) =>
            productColorMatchesFilter(colorId, filterId),
          ),
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
      if (stockFilter === "attention") {
        const isLow =
          available &&
          inventory.quantity != null &&
          inventory.quantity <= LOW_STOCK_THRESHOLD;
        if (available && !isLow) return false;
      }

      if (!q) return true;
      return (
        product.name.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q) ||
        (product.sku ?? "").toLowerCase().includes(q)
      );
    });
  }, [
    products,
    query,
    categoryFilter,
    stockFilter,
    colorFilter,
    packagingFilter,
    inventoryTick,
  ]);

  const editing = isCreating
    ? { ...CREATE_DRAFT_PRODUCT, sku: draftSku }
    : (products.find((product) => product.id === editingId) ?? null);

  function showSavedToast() {
    setSavedFlash(true);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setSavedFlash(false), 2800);
  }

  async function saveOverride(
    productId: string,
    next: ProductOverride,
    stock: { inStock: boolean; quantity: number | null },
  ): Promise<boolean> {
    const normalized = normalizeOverride(next);
    const images = [
      normalized.image,
      ...(normalized.hoverImage ? [normalized.hoverImage] : []),
      ...(normalized.extraImages ?? []),
    ];
    const isCreate = productId === CREATE_DRAFT_ID;

    const result = await upsertProductAction({
      ...(isCreate ? {} : { id: productId }),
      name: normalized.name,
      description: normalized.description,
      sku: normalized.sku || (isCreate ? generateProductSku() : undefined),
      price: normalized.price,
      category: normalized.category,
      subcategoryId: normalized.subcategoryId,
      attributes: normalized.attributes,
      images,
      colorImageMap: normalized.colorImageMap,
      inStock: stock.inStock,
      stockQuantity: stock.inStock ? stock.quantity : null,
      details: normalized.details,
      markAsNew: normalized.markAsNew,
    });

    if (!result.ok) {
      window.alert(result.error);
      return false;
    }

    const saved = result.data;
    setProducts((prev) => {
      const index = prev.findIndex((product) => product.id === saved.id);
      if (index === -1) return [saved, ...prev];
      const copy = [...prev];
      copy[index] = saved;
      return copy;
    });

    setInventory(saved.id, {
      inStock: stock.inStock,
      quantity: stock.inStock ? stock.quantity : null,
    });

    showSavedToast();
    return true;
  }

  async function deleteProduct(productId: string): Promise<boolean> {
    if (productId === CREATE_DRAFT_ID) return false;

    const result = await deleteProductAction(productId);
    if (!result.ok) {
      window.alert(result.error);
      return false;
    }

    setProducts((prev) => prev.filter((product) => product.id !== productId));
    return true;
  }

  function openCreate() {
    setDraftSku(generateProductSku());
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
    {
      value: "attention",
      label: "Posledné kusy / nie je na sklade",
    },
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
          className="inline-flex h-11 w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#75825B] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:w-auto sm:self-start"
        >
          <Plus className="size-4" strokeWidth={2} aria-hidden />
          Nový produkt
        </button>
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
          <ListFilter className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
          <span className="truncate">Filtrovať</span>
          {activeFilterCount > 0 ? (
            <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[#75825B] text-[11px] font-semibold text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
      </div>

      {/* Mobile cards */}
      <div className="overflow-hidden rounded-2xl border border-black/6 bg-white md:hidden">
        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[#2f2924]/55">
            Žiadne produkty pre zvolené filtre.
          </p>
        ) : (
          <ul className="divide-y divide-black/5">
            {filtered.map((product) => {
              const inventory = getInventoryForProduct(product);
              const subcategoryLabel =
                getAdminSubcategoryById(product.subcategoryId)?.label ?? "";

              return (
                <li key={product.id} className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-[#e8ebe2]">
                      {product.image ? (
                        <ProductThumb src={product.image} />
                      ) : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[#2f2924]">{product.name}</p>
                      {product.sku ? (
                        <p className="mt-0.5 truncate font-mono text-xs text-[#2f2924]/45">
                          {product.sku}
                        </p>
                      ) : null}
                      <p className="mt-1 text-sm text-[#2f2924]/65">
                        {product.category}
                        {subcategoryLabel ? ` · ${subcategoryLabel}` : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${
                            isInventoryAvailable(inventory)
                              ? "bg-[#e8ebe2] text-[#5f6a49]"
                              : "bg-[#fee2e2] text-[#b91c1c]"
                          }`}
                        >
                          {inventoryLabel(inventory)}
                        </span>
                      </div>
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
                      onClick={() => {
                        setIsCreating(false);
                        setEditingId(product.id);
                      }}
                      className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#75825B] px-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
                    >
                      <Pencil
                        className="size-3.5"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      Upraviť
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-black/6 bg-white md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[15px]">
            <thead className="border-b border-black/6 bg-white text-xs tracking-wide text-[#2f2924]/55 uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Produkt</th>
                <th className="px-4 py-3 font-medium">Kategória</th>
                <th className="px-4 py-3 font-medium">Subkategória</th>
                <th className="px-4 py-3 font-medium">Sklad</th>
                <th className="px-4 py-3 text-right font-medium">Akcie</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const inventory = getInventoryForProduct(product);
                const subcategoryLabel =
                  getAdminSubcategoryById(product.subcategoryId)?.label ?? "";

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
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[#2f2924]/80">
                      {product.category}
                    </td>
                    <td className="px-4 py-3.5 text-[#2f2924]/80">
                      {subcategoryLabel || (
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
        <p className="mt-4 hidden text-center text-sm text-[#2f2924]/55 md:block">
          Žiadne produkty pre zvolené filtre.
        </p>
      ) : null}

      <FilterSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        footer={
          <FilterSheetFooter
            hasActiveFilters={activeFilterCount > 0}
            onClear={clearFilters}
            onDone={() => setFiltersOpen(false)}
          />
        }
      >
        <div className="space-y-7">
          <div>
            <p className="text-xs font-medium tracking-[0.12em] text-[#75825B] uppercase">
              Kategória
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {categoryOptions.map((option) => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  active={categoryFilter === option.value}
                  onClick={() => setCategoryFilter(option.value)}
                />
              ))}
            </div>
          </div>

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
                  onClick={() => setStockFilter(option.value as StockFilter)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium tracking-[0.12em] text-[#75825B] uppercase">
              Formát dodania
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {packagingFormats.map((format) => (
                <FilterChip
                  key={format.id}
                  label={format.label}
                  active={packagingFilter.includes(format.id)}
                  onClick={() => togglePackagingFilter(format.id)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium tracking-[0.12em] text-[#75825B] uppercase">
              Farba
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {filterColors.map((color) => (
                <FilterChip
                  key={color.id}
                  label={color.label}
                  active={colorFilter.includes(color.id)}
                  onClick={() => toggleColor(color.id)}
                  swatch={color.hex}
                />
              ))}
            </div>
          </div>
        </div>
      </FilterSheet>

      {editing ? (
        <ProductEditor
          key={isCreating ? CREATE_DRAFT_ID : editing.id}
          product={editing}
          isNew={isCreating}
          onClose={closeEditor}
          onSave={(next, stock) => saveOverride(editing.id, next, stock)}
          onDelete={
            isCreating
              ? undefined
              : () => deleteProduct(editing.id)
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
  ) => void | Promise<boolean | void>;
  onDelete?: () => void | Promise<boolean | void>;
}) {
  const initialInventory = getInventoryForProduct(product);
  const [entered, setEntered] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description);
  const [sku, setSku] = useState(product.sku ?? "");
  const [price, setPrice] = useState(
    product.price?.replace(/\s*€\s*$/, "").trim() || "",
  );
  const [markAsNew, setMarkAsNew] = useState(() =>
    isNew ? true : isActiveNewProduct(product),
  );
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
  const [colorImageMap, setColorImageMap] = useState<
    Record<string, number[]>
  >(() => product.colorImageMap ?? {});
  const [customPickerOpen, setCustomPickerOpen] = useState(false);
  const [customDraftHex, setCustomDraftHex] = useState("#d4a0a8");
  const [customDraftHexSecondary, setCustomDraftHexSecondary] =
    useState("#f5f2ec");
  const [customDraftSplit, setCustomDraftSplit] = useState(false);
  const [customDraftLabel, setCustomDraftLabel] = useState(() =>
    suggestColorName("#d4a0a8"),
  );
  const [customLabelTouched, setCustomLabelTouched] = useState(false);
  const [packaging, setPackaging] = useState<PackagingOption[]>(
    product.attributes?.packaging ?? [],
  );
  const [inStock, setInStock] = useState(initialInventory.inStock);
  const [stockQuantity, setStockQuantity] = useState(
    initialInventory.quantity != null ? String(initialInventory.quantity) : "",
  );
  const [discardOpen, setDiscardOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [colorImagesEditorId, setColorImagesEditorId] = useState<string | null>(
    null,
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceIndexRef = useRef<number | null>(null);
  const dragImageIndexRef = useRef<number | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dragOverImageIndex, setDragOverImageIndex] = useState<number | null>(
    null,
  );
  const initialSnapshotRef = useRef(
    serializeEditorSnapshot({
      name: product.name,
      description: product.description,
      sku: product.sku ?? "",
      price: product.price?.replace(/\s*€\s*$/, "").trim() || "",
      images: [
        product.image,
        product.hoverImage,
        ...(product.extraImages ?? []),
      ].filter((src): src is string => Boolean(src)),
      category: product.category,
      subcategoryId: product.subcategoryId ?? "",
      colors: product.attributes?.colors ?? [],
      colorImageMap: product.colorImageMap ?? {},
      packaging: product.attributes?.packaging ?? [],
      inStock: initialInventory.inStock,
      stockQuantity:
        initialInventory.quantity != null
          ? String(initialInventory.quantity)
          : "",
      markAsNew: isNew ? true : isActiveNewProduct(product),
    }),
  );

  const [categoryLabels, setCategoryLabels] = useState<string[]>(() => [
    ...categories,
  ]);
  const [availableSubs, setAvailableSubs] = useState<
    { id: string; label: string }[]
  >([]);
  const [taxonomyReady, setTaxonomyReady] = useState(false);
  const customColors = colors.flatMap((id) => {
    const parsed = parseCustomColorId(id);
    return parsed ? [parsed] : [];
  });
  const panelOpen = entered && !exiting;
  const isDirty =
    serializeEditorSnapshot({
      name,
      description,
      sku,
      price,
      images,
      category,
      subcategoryId,
      colors,
      colorImageMap,
      packaging,
      inStock,
      stockQuantity,
      markAsNew,
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

  async function confirmDelete() {
    if (!onDelete || exiting || saving) return;
    setSaving(true);
    try {
      const result = await onDelete();
      if (result === false) return;
      setDeleteOpen(false);
      setDiscardOpen(false);
      setExiting(true);
      closeTimeoutRef.current = setTimeout(() => {
        onClose();
      }, 320);
    } finally {
      setSaving(false);
    }
  }

  async function saveAndClose() {
    if (exiting || saving || uploading || !images[0] || !name.trim()) return;
    const [main = "", hover, ...extras] = images;
    const qtyRaw = stockQuantity.trim();
    const qty = qtyRaw === "" ? null : Number.parseInt(qtyRaw, 10);
    setSaving(true);
    try {
      const result = await onSave(
        {
          name,
          description,
          sku: sku.trim() || undefined,
          price,
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
          colorImageMap,
          details: DEFAULT_PRODUCT_DETAILS,
          markAsNew,
        },
        {
          inStock,
          quantity:
            inStock && qty != null && !Number.isNaN(qty) && qty > 0 ? qty : null,
        },
      );
      if (result === false) return;
      closePanel();
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    function refreshTaxonomy() {
      setCategoryLabels(getAdminCategoryLabels());
      setAvailableSubs(getAdminSubcategoriesForCategory(category));
      setTaxonomyReady(true);
    }

    refreshTaxonomy();

    window.addEventListener(ADMIN_CATEGORIES_EVENT, refreshTaxonomy);
    const unsubscribe = subscribeTaxonomy(refreshTaxonomy);
    return () => {
      window.removeEventListener(ADMIN_CATEGORIES_EVENT, refreshTaxonomy);
      unsubscribe();
    };
  }, [category]);

  useEffect(() => {
    if (!taxonomyReady) return;
    if (
      subcategoryId &&
      !availableSubs.some((sub) => sub.id === subcategoryId)
    ) {
      setSubcategoryId("");
    }
  }, [taxonomyReady, category, availableSubs, subcategoryId]);

  function toggle(list: string[], id: string, setter: (next: string[]) => void) {
    setter(list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
  }

  function toggleColor(id: string) {
    const removing = colors.includes(id);
    setColors(
      removing ? colors.filter((item) => item !== id) : [...colors, id],
    );
    if (removing) {
      setColorImagesEditorId((current) => (current === id ? null : current));
      setColorImageMap((prev) => {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  function toggleColorImage(colorId: string, imageIndex: number) {
    setColorImageMap((prev) => {
      const current = prev[colorId] ?? [];
      const has = current.includes(imageIndex);
      const nextIndexes = has
        ? current.filter((item) => item !== imageIndex)
        : [...current, imageIndex].sort((a, b) => a - b);
      const next = { ...prev };
      if (nextIndexes.length === 0) {
        delete next[colorId];
      } else {
        next[colorId] = nextIndexes;
      }
      return next;
    });
  }

  function distributeImagesEvenly() {
    if (colors.length === 0 || images.length === 0) return;
    setColorImageMap(buildEvenColorImageMap(colors, images.length));
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

  async function onFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0 || uploading) return;

    const replaceIndex = replaceIndexRef.current;
    // Při výměně jednoho slotu bereme jen první soubor
    const toUpload = replaceIndex !== null ? files.slice(0, 1) : files;

    setUploading(true);
    try {
      const urls: string[] = [];
      const errors: string[] = [];

      for (const file of toUpload) {
        const formData = new FormData();
        formData.set("file", file);
        const result = await uploadProductImageAction(formData);
        if (!result.ok) {
          errors.push(`${file.name}: ${result.error}`);
          continue;
        }
        urls.push(result.data.url);
      }

      if (urls.length > 0) {
        setImages((prev) => {
          if (replaceIndex === null) return [...prev, ...urls];
          return prev.map((src, index) =>
            index === replaceIndex ? urls[0]! : src,
          );
        });
      }

      replaceIndexRef.current = null;

      if (errors.length > 0) {
        window.alert(
          urls.length === 0
            ? errors.join("\n")
            : `Niektoré súbory sa nepodarilo nahrať:\n${errors.join("\n")}`,
        );
      }
    } finally {
      setUploading(false);
    }
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setColorImageMap((prev) => {
      const next: Record<string, number[]> = {};
      for (const [colorId, indexes] of Object.entries(prev)) {
        const remapped = indexes
          .filter((item) => item !== index)
          .map((item) => (item > index ? item - 1 : item));
        if (remapped.length > 0) next[colorId] = remapped;
      }
      return next;
    });
  }

  function remapIndexAfterMove(index: number, from: number, to: number) {
    if (index === from) return to;
    if (from < to) {
      if (index > from && index <= to) return index - 1;
    } else if (index >= to && index < from) {
      return index + 1;
    }
    return index;
  }

  function reorderImages(fromIndex: number, toIndex: number) {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= images.length ||
      toIndex >= images.length
    ) {
      return;
    }

    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) return prev;
      next.splice(toIndex, 0, moved);
      return next;
    });

    setColorImageMap((prev) => {
      const next: Record<string, number[]> = {};
      for (const [colorId, indexes] of Object.entries(prev)) {
        const remapped = Array.from(
          new Set(
            indexes.map((item) =>
              remapIndexAfterMove(item, fromIndex, toIndex),
            ),
          ),
        ).sort((a, b) => a - b);
        if (remapped.length > 0) next[colorId] = remapped;
      }
      return next;
    });
  }

  function imageRoleLabel(index: number) {
    if (index === 0) return "Hlavný";
    if (index === 1) return "Hover";
    return null;
  }

  function customDraftSuggestedLabel(
    hex = customDraftHex,
    split = customDraftSplit,
    hexSecondary = customDraftHexSecondary,
  ) {
    return split
      ? suggestSplitColorName(hex, hexSecondary)
      : suggestColorName(hex);
  }

  function resetCustomDraft() {
    setCustomDraftHex("#d4a0a8");
    setCustomDraftHexSecondary("#f5f2ec");
    setCustomDraftSplit(false);
    setCustomDraftLabel(suggestColorName("#d4a0a8"));
    setCustomLabelTouched(false);
  }

  const categoryOptions = categoryLabels.map((label) => ({
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

  const colorImagesEditor =
    colorImagesEditorId != null
      ? (colorsFromIds([colorImagesEditorId])[0] ?? null)
      : null;

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
        <div className="flex shrink-0 items-center justify-between border-b border-black/6 px-4 py-4 sm:px-6">
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

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
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

              <div className="grid gap-5 sm:grid-cols-2">
                <FieldLabel label="Kód produktu">
                  <input
                    type="text"
                    value={sku}
                    onChange={(event) => setSku(event.target.value)}
                    className="h-11 w-full rounded-xl border border-black/10 bg-[#faf8f5] px-3.5 font-mono text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:bg-white"
                    placeholder="napr. PD-ABC12345"
                  />
                </FieldLabel>

                <FieldLabel label="Cena">
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={price}
                      onChange={(event) => setPrice(event.target.value)}
                      onBlur={() => {
                        if (!price.trim()) return;
                        setPrice(
                          normalizePriceInput(price).replace(/\s*€\s*$/, ""),
                        );
                      }}
                      className="h-11 w-full rounded-xl border border-black/10 bg-[#faf8f5] py-2 pr-10 pl-3.5 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B] focus:bg-white"
                      placeholder="18,90"
                    />
                    <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-[#2f2924]/45">
                      €
                    </span>
                  </div>
                </FieldLabel>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/10 bg-[#faf8f5] px-3.5 py-3 transition-colors hover:border-[#75825B]/35">
                <input
                  type="checkbox"
                  checked={markAsNew}
                  onChange={(event) => setMarkAsNew(event.target.checked)}
                  className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-black/20 accent-[#75825B]"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-[#2f2924]">
                    Označiť ako novinku
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-[#2f2924]/55">
                    {markAsNew
                      ? !isNew && isActiveNewProduct(product)
                        ? `V Novinkách do ${formatNewUntilLabel(product.newUntil)}.`
                        : `Po uložení bude v Novinkách ${NEW_PRODUCT_DAYS} dní.`
                      : "Produkt sa zobrazí len v bežnom katalógu."}
                  </span>
                </span>
              </label>

              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-[#2f2924]">Médiá</p>
                  <InfoHint text="Presuňte obrázky myšou. Prvý je hlavný náhľad, druhý hover, ďalšie idú do galérie." />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {images.map((src, index) => {
                    const role = imageRoleLabel(index);
                    const isDragOver = dragOverImageIndex === index;
                    return (
                      <div
                        key={`${src}-${index}`}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                          if (dragOverImageIndex !== index) {
                            setDragOverImageIndex(index);
                          }
                        }}
                        onDragLeave={() => {
                          setDragOverImageIndex((prev) =>
                            prev === index ? null : prev,
                          );
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          const from =
                            dragImageIndexRef.current ??
                            Number.parseInt(
                              event.dataTransfer.getData("text/plain"),
                              10,
                            );
                          setDragOverImageIndex(null);
                          dragImageIndexRef.current = null;
                          if (!Number.isInteger(from)) return;
                          reorderImages(from, index);
                        }}
                        className={`group relative aspect-square overflow-hidden rounded-xl bg-[#e8ebe2] ${
                          isDragOver
                            ? "ring-2 ring-[#75825B] ring-offset-2"
                            : ""
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setLightboxIndex(index)}
                          className="absolute inset-0 cursor-zoom-in"
                          aria-label={`Zobraziť obrázok ${index + 1} na celú obrazovku`}
                        >
                          <ProductThumb src={src} />
                        </button>
                        <span
                          draggable
                          onDragStart={(event) => {
                            dragImageIndexRef.current = index;
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData(
                              "text/plain",
                              String(index),
                            );
                          }}
                          onDragEnd={() => {
                            dragImageIndexRef.current = null;
                            setDragOverImageIndex(null);
                          }}
                          className="absolute top-2 right-2 z-[1] inline-flex size-7 cursor-grab items-center justify-center rounded-md bg-white/90 text-[#2f2924]/55 shadow-sm active:cursor-grabbing"
                          aria-label={`Presunúť obrázok ${index + 1}`}
                          title="Presunúť"
                        >
                          <GripVertical
                            className="size-3.5"
                            strokeWidth={1.75}
                          />
                        </span>
                        {role ? (
                          <span className="pointer-events-none absolute top-2 left-2 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-[#2f2924] uppercase">
                            {role}
                          </span>
                        ) : (
                          <span className="pointer-events-none absolute top-2 left-2 rounded-md bg-white/80 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-[#2f2924]/55 uppercase">
                            {index + 1}
                          </span>
                        )}
                        <div className="pointer-events-none absolute inset-0 flex items-end justify-between gap-1 bg-gradient-to-t from-black/45 via-transparent to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => openFilePicker(index)}
                            className="pointer-events-auto cursor-pointer rounded-md bg-white/95 px-2 py-1 text-[11px] font-medium text-[#2f2924]"
                          >
                            Vymeniť
                          </button>
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="pointer-events-auto inline-flex size-7 cursor-pointer items-center justify-center rounded-md bg-white/95 text-[#2f2924] transition-colors hover:text-[#c45c4a]"
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
                  disabled={uploading || saving}
                  className="mt-2.5 inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#75825B]/40 bg-[#faf8f5] text-sm font-medium text-[#75825B] transition-colors hover:border-[#75825B] hover:bg-[#e8ebe2]/45 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ImagePlus className="size-4" strokeWidth={1.75} aria-hidden />
                  {uploading ? "Nahrávam…" : "Pridať obrázky"}
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
                <legend className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-[#2f2924]">
                  <span className="inline-flex items-center gap-1.5">
                    Farby
                    <InfoHint text="U vybranej farby cez ⋯ priradíte, ktoré fotky k nej patria." />
                  </span>
                  {colors.length > 1 && images.length > 0 ? (
                    <button
                      type="button"
                      onClick={distributeImagesEvenly}
                      className="cursor-pointer text-xs font-medium text-[#75825B] transition-colors hover:text-[#5f6a49]"
                    >
                      Rozdeliť rovnomerne
                    </button>
                  ) : null}
                </legend>
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  {filterColors.map((color) => {
                    const selected = colors.includes(color.id);
                    const assignedCount =
                      colorImageMap[color.id]?.length ?? 0;
                    return (
                      <div
                        key={color.id}
                        className={`flex items-center gap-1 rounded-xl border border-black/10 pr-1 text-sm text-[#2f2924] transition-colors hover:bg-[#e8ebe2]/60 ${
                          selected ? "bg-[#e8ebe2]/60" : ""
                        }`}
                      >
                        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 px-2.5 py-2">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleColor(color.id)}
                            className="size-4 shrink-0 accent-[#75825B]"
                          />
                          {color.hex ? (
                            <span
                              className="size-3.5 shrink-0 rounded-full border border-black/10"
                              style={{ backgroundColor: color.hex }}
                              aria-hidden
                            />
                          ) : null}
                          <span className="min-w-0 truncate">{color.label}</span>
                        </label>
                        {selected ? (
                          <button
                            type="button"
                            disabled={images.length === 0}
                            onClick={() => setColorImagesEditorId(color.id)}
                            className="relative inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#2f2924]/45 transition-colors hover:bg-white hover:text-[#2f2924] disabled:cursor-not-allowed disabled:opacity-35"
                            aria-label={`Priradiť fotky k farbe ${color.label}`}
                            title={
                              images.length === 0
                                ? "Najprv nahrajte fotky"
                                : assignedCount > 0
                                  ? `${assignedCount} fotiek`
                                  : "Priradiť fotky"
                            }
                          >
                            <MoreHorizontal
                              className="size-4"
                              strokeWidth={1.75}
                              aria-hidden
                            />
                            {assignedCount > 0 ? (
                              <span className="absolute -top-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-[#75825B] text-[9px] font-semibold text-white">
                                {assignedCount}
                              </span>
                            ) : null}
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      setCustomPickerOpen((open) => !open);
                      if (!customPickerOpen) {
                        resetCustomDraft();
                      }
                    }}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-xl border border-dashed px-2.5 py-2 text-left text-sm font-medium transition-colors ${
                      customPickerOpen
                        ? "border-[#75825B] bg-[#e8ebe2]/60 text-[#2f2924]"
                        : "border-[#2f2924]/20 bg-white text-[#2f2924] hover:border-[#75825B]/50 hover:bg-[#e8ebe2]/40"
                    }`}
                  >
                    <span
                      className="inline-flex size-3.5 items-center justify-center rounded-full border border-black/15 bg-[conic-gradient(from_0deg,#b43c3c,#e0c35a,#6b7f5a,#5a7a9a,#7a5f8a,#d4a0a8,#b43c3c)]"
                      aria-hidden
                    />
                    Vlastná
                  </button>
                </div>

                {customPickerOpen ? (
                  <div className="mt-3 space-y-3 rounded-xl border border-black/8 bg-[#faf8f5] p-3">
                    <p className="text-xs font-medium tracking-wide text-[#2f2924]/55 uppercase">
                      Nová vlastná farba
                    </p>
                    <p className="text-xs leading-relaxed text-[#2f2924]/55">
                      Vyberte HEX a zadajte vlastný názov (napr. Svetlo
                      fialová). Návrh názvu z katalógu môžete prepísať.
                    </p>

                    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[#2f2924]">
                      <input
                        type="checkbox"
                        checked={customDraftSplit}
                        onChange={(event) => {
                          const split = event.target.checked;
                          setCustomDraftSplit(split);
                          if (!customLabelTouched) {
                            setCustomDraftLabel(
                              customDraftSuggestedLabel(
                                customDraftHex,
                                split,
                                customDraftHexSecondary,
                              ),
                            );
                          }
                        }}
                        className="size-4 accent-[#75825B]"
                      />
                      Dve farby (split)
                      <span
                        className="size-4 rounded-full border border-black/10"
                        style={colorSwatchStyle({
                          hex: customDraftHex,
                          hexSecondary: customDraftSplit
                            ? customDraftHexSecondary
                            : undefined,
                        })}
                        aria-hidden
                      />
                    </label>

                    <div className="flex flex-wrap items-start gap-4">
                      <div className="space-y-2">
                        <p className="text-[11px] font-medium tracking-wide text-[#2f2924]/45 uppercase">
                          {customDraftSplit ? "Farba 1" : "Farba"}
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="relative size-11 shrink-0 cursor-pointer overflow-hidden rounded-full border border-black/10 shadow-sm">
                            <span
                              className="absolute inset-0"
                              style={{ backgroundColor: customDraftHex }}
                              aria-hidden
                            />
                            <input
                              type="color"
                              value={customDraftHex}
                              onChange={(event) => {
                                const hex = event.target.value;
                                setCustomDraftHex(hex);
                                if (!customLabelTouched) {
                                  setCustomDraftLabel(
                                    customDraftSuggestedLabel(hex),
                                  );
                                }
                              }}
                              className="absolute inset-0 cursor-pointer opacity-0"
                              aria-label="Vybrať prvú farbu"
                            />
                          </label>
                          <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                            {CUSTOM_COLOR_PRESETS.map((hex) => (
                              <button
                                key={`a-${hex}`}
                                type="button"
                                onClick={() => {
                                  setCustomDraftHex(hex);
                                  if (!customLabelTouched) {
                                    setCustomDraftLabel(
                                      customDraftSuggestedLabel(hex),
                                    );
                                  }
                                }}
                                className={`size-7 cursor-pointer rounded-full border transition-transform hover:scale-105 ${
                                  customDraftHex.toLowerCase() ===
                                  hex.toLowerCase()
                                    ? "border-[#2f2924] ring-2 ring-[#75825B]/35"
                                    : "border-black/10"
                                }`}
                                style={{ backgroundColor: hex }}
                                aria-label={`Predvoľba ${hex}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {customDraftSplit ? (
                        <div className="space-y-2">
                          <p className="text-[11px] font-medium tracking-wide text-[#2f2924]/45 uppercase">
                            Farba 2
                          </p>
                          <div className="flex flex-wrap items-center gap-3">
                            <label className="relative size-11 shrink-0 cursor-pointer overflow-hidden rounded-full border border-black/10 shadow-sm">
                              <span
                                className="absolute inset-0"
                                style={{
                                  backgroundColor: customDraftHexSecondary,
                                }}
                                aria-hidden
                              />
                              <input
                                type="color"
                                value={customDraftHexSecondary}
                                onChange={(event) => {
                                  const hex = event.target.value;
                                  setCustomDraftHexSecondary(hex);
                                  if (!customLabelTouched) {
                                    setCustomDraftLabel(
                                      customDraftSuggestedLabel(
                                        customDraftHex,
                                        true,
                                        hex,
                                      ),
                                    );
                                  }
                                }}
                                className="absolute inset-0 cursor-pointer opacity-0"
                                aria-label="Vybrať druhú farbu"
                              />
                            </label>
                            <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                              {CUSTOM_COLOR_PRESETS.map((hex) => (
                                <button
                                  key={`b-${hex}`}
                                  type="button"
                                  onClick={() => {
                                    setCustomDraftHexSecondary(hex);
                                    if (!customLabelTouched) {
                                      setCustomDraftLabel(
                                        customDraftSuggestedLabel(
                                          customDraftHex,
                                          true,
                                          hex,
                                        ),
                                      );
                                    }
                                  }}
                                  className={`size-7 cursor-pointer rounded-full border transition-transform hover:scale-105 ${
                                    customDraftHexSecondary.toLowerCase() ===
                                    hex.toLowerCase()
                                      ? "border-[#2f2924] ring-2 ring-[#75825B]/35"
                                      : "border-black/10"
                                  }`}
                                  style={{ backgroundColor: hex }}
                                  aria-label={`Predvoľba ${hex}`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <FieldLabel label="Názov farby">
                      <input
                        type="text"
                        value={customDraftLabel}
                        onChange={(event) => {
                          setCustomLabelTouched(true);
                          setCustomDraftLabel(event.target.value);
                        }}
                        className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-[#2f2924] outline-none transition-colors placeholder:text-[#2f2924]/35 focus:border-[#75825B]"
                        placeholder="Napr. Fialová"
                      />
                    </FieldLabel>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCustomPickerOpen(false);
                          resetCustomDraft();
                        }}
                        className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-sm font-medium text-[#2f2924] transition-colors hover:bg-[#e8ebe2]/60"
                      >
                        Zrušiť
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const label =
                            customDraftLabel.trim() ||
                            customDraftSuggestedLabel();

                          const id = encodeCustomColorId(
                            customDraftHex,
                            label,
                            customDraftSplit
                              ? customDraftHexSecondary
                              : undefined,
                          );

                          if (!colors.includes(id)) {
                            setColors((prev) => [...prev, id]);
                          }
                          setCustomPickerOpen(false);
                          resetCustomDraft();
                        }}
                        className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center rounded-xl bg-[#75825B] px-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
                      >
                        Pridať farbu
                      </button>
                    </div>
                  </div>
                ) : null}

                {customColors.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-xs font-medium tracking-wide text-[#2f2924]/55 uppercase">
                      Vlastné farby
                    </p>
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {customColors.map((color) => {
                        const assignedCount =
                          colorImageMap[color.id]?.length ?? 0;
                        return (
                          <li
                            key={color.id}
                            className="flex items-center gap-1 rounded-xl border border-black/8 bg-white py-1 pr-1 pl-2.5"
                          >
                            <span
                              className="size-3.5 shrink-0 rounded-full border border-black/10"
                              style={colorSwatchStyle(color)}
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1 truncate text-sm text-[#2f2924]">
                              {color.label}
                            </span>
                            <button
                              type="button"
                              disabled={images.length === 0}
                              onClick={() => setColorImagesEditorId(color.id)}
                              className="relative inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#2f2924]/45 transition-colors hover:bg-[#e8ebe2] hover:text-[#2f2924] disabled:cursor-not-allowed disabled:opacity-35"
                              aria-label={`Priradiť fotky k farbe ${color.label}`}
                              title={
                                images.length === 0
                                  ? "Najprv nahrajte fotky"
                                  : assignedCount > 0
                                    ? `${assignedCount} fotiek`
                                    : "Priradiť fotky"
                              }
                            >
                              <MoreHorizontal
                                className="size-4"
                                strokeWidth={1.75}
                                aria-hidden
                              />
                              {assignedCount > 0 ? (
                                <span className="absolute -top-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-[#75825B] text-[9px] font-semibold text-white">
                                  {assignedCount}
                                </span>
                              ) : null}
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleColor(color.id)}
                              className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#2f2924]/45 transition-colors hover:bg-[#fee2e2] hover:text-[#b91c1c]"
                              aria-label={`Odstrániť farbu ${color.label}`}
                            >
                              <Trash2
                                className="size-3.5"
                                strokeWidth={1.75}
                                aria-hidden
                              />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
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

        <div className="relative z-10 shrink-0 border-t border-black/6 bg-white px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            {onDelete ? (
              <button
                type="button"
                onClick={() => {
                  setDiscardOpen(false);
                  setDeleteOpen(true);
                }}
                disabled={exiting || saving}
                className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#c45c4a]/30 px-4 text-sm font-medium text-[#c45c4a] transition-colors hover:bg-[#c45c4a]/8 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
              >
                <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
                Odstrániť produkt
              </button>
            ) : null}
            <button
              type="button"
              onClick={saveAndClose}
              disabled={!images[0] || !name.trim() || exiting || saving || uploading}
              className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-[#75825B] text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:ml-auto sm:w-auto sm:min-w-[12rem] sm:px-8"
            >
              {saving ? "Ukladám…" : "Uložiť"}
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
                disabled={!images[0] || !name.trim() || exiting || saving || uploading}
                className="inline-flex h-10 w-1/2 cursor-pointer items-center justify-center rounded-xl bg-[#75825B] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? "Ukladám…" : "Uložiť zmeny"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {colorImagesEditor ? (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/35 px-4">
          <button
            type="button"
            className="absolute inset-0 cursor-pointer"
            aria-label="Zavrieť"
            onClick={() => setColorImagesEditorId(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="color-images-title"
            className="relative z-10 w-full max-w-md rounded-2xl border border-black/8 bg-white p-5 shadow-[0_20px_48px_rgba(47,41,36,0.2)]"
          >
            <div className="flex items-start gap-3">
              <span
                className="mt-1 size-5 shrink-0 rounded-full border border-black/10"
                style={colorSwatchStyle(colorImagesEditor)}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <h3
                  id="color-images-title"
                  className="font-heading text-lg text-[#2f2924]"
                >
                  Fotky pre {colorImagesEditor.label}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-[#2f2924]/65">
                  Zaškrtnite fotky, ktoré patria k tejto farbe.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setColorImagesEditorId(null)}
                className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#2f2924]/45 transition-colors hover:bg-[#e8ebe2] hover:text-[#2f2924]"
                aria-label="Zavrieť"
              >
                <X className="size-4" strokeWidth={1.75} aria-hidden />
              </button>
            </div>

            {images.length === 0 ? (
              <p className="mt-4 text-sm text-[#2f2924]/55">
                Zatiaľ nie sú nahraté žiadne fotky.
              </p>
            ) : (
              <div className="mt-4 grid max-h-[50vh] grid-cols-3 gap-2.5 overflow-y-auto sm:grid-cols-4">
                {images.map((src, index) => {
                  const checked =
                    colorImageMap[colorImagesEditor.id]?.includes(index) ??
                    false;
                  return (
                    <label
                      key={`${colorImagesEditor.id}-${src}-${index}`}
                      className={`relative aspect-square cursor-pointer overflow-hidden rounded-xl border transition-colors ${
                        checked
                          ? "border-[#75825B] ring-2 ring-[#75825B]/30"
                          : "border-black/10 opacity-75 hover:opacity-100"
                      }`}
                      title={`Fotka ${index + 1}`}
                    >
                      <Image
                        src={src}
                        alt=""
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          toggleColorImage(colorImagesEditor.id, index)
                        }
                        className="absolute top-1.5 left-1.5 size-4 accent-[#75825B]"
                        aria-label={`${colorImagesEditor.label}: fotka ${index + 1}`}
                      />
                      {index === 0 || index === 1 ? (
                        <span className="absolute right-1.5 bottom-1.5 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-[#2f2924] uppercase">
                          {index === 0 ? "Hlavný" : "Hover"}
                        </span>
                      ) : null}
                    </label>
                  );
                })}
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setColorImagesEditorId(null)}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl bg-[#75825B] px-5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Hotovo
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {lightboxIndex != null && images.length > 0 ? (
        <ImageLightbox
          images={images}
          index={Math.min(lightboxIndex, images.length - 1)}
          alt={name.trim() || "Obrázok produktu"}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
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
                disabled={exiting || saving}
                className="inline-flex h-10 w-1/2 cursor-pointer items-center justify-center rounded-xl bg-[#c45c4a] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? "Odstraňujem…" : "Odstrániť"}
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
  price: string;
  images: string[];
  category: string;
  subcategoryId: string;
  colors: string[];
  colorImageMap: Record<string, number[]>;
  packaging: PackagingOption[];
  inStock: boolean;
  stockQuantity: string;
  markAsNew: boolean;
}) {
  return JSON.stringify({
    name: value.name.trim(),
    description: value.description.trim(),
    sku: value.sku.trim(),
    price: value.price.trim(),
    images: value.images,
    category: value.category,
    subcategoryId: value.subcategoryId,
    colors: [...value.colors].sort(),
    colorImageMap: value.colorImageMap,
    packaging: [...value.packaging]
      .map((item) => ({
        id: item.id,
        pieces: item.pieces,
        label: item.label?.trim() || undefined,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    inStock: value.inStock,
    stockQuantity: value.stockQuantity.trim(),
    markAsNew: value.markAsNew,
  });
}

function formatNewUntilLabel(iso?: string) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "—";
  return date.toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
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
