"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ListFilter } from "lucide-react";
import { FilterSheet } from "@/components/FilterSheet";
import { FilterSheetFooter } from "@/components/FilterSheetFooter";
import { useTaxonomy } from "@/components/ProductCatalogProvider";
import {
  CatalogGridDensityToggle,
  catalogGridClass,
} from "@/components/CatalogGridDensityToggle";
import { ProductCard } from "@/components/ProductCard";
import {
  getInventoryForProduct,
  INVENTORY_EVENT,
  isInventoryAvailable,
} from "@/lib/inventory";
import { filterProducts, type Product } from "@/lib/products";
import { filterColors } from "@/lib/taxonomy";

function toggleId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

function sortSoldOutLast(list: Product[]): Product[] {
  return [...list].sort((a, b) => {
    const aOut = isInventoryAvailable(getInventoryForProduct(a)) ? 0 : 1;
    const bOut = isInventoryAvailable(getInventoryForProduct(b)) ? 0 : 1;
    return aOut - bOut;
  });
}

type ProductCollectionBrowserProps = {
  title: string;
  products: Product[];
  sortSoldOutLast?: boolean;
  emptyState?: ReactNode;
  listenInventory?: boolean;
};

export function ProductCollectionBrowser({
  title,
  products,
  sortSoldOutLast: sortOut = false,
  emptyState,
  listenInventory = false,
}: ProductCollectionBrowserProps) {
  const taxonomy = useTaxonomy();
  const categoryLabels =
    taxonomy.categories.length > 0
      ? taxonomy.categories.map((category) => category.label)
      : [];
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [gridDensity, setGridDensity] = useState<"comfortable" | "compact">(
    "comfortable",
  );
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [inventoryTick, setInventoryTick] = useState(0);

  useEffect(() => {
    if (!listenInventory && !sortOut) return;

    function sync() {
      setInventoryTick((value) => value + 1);
    }

    window.addEventListener(INVENTORY_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(INVENTORY_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [listenInventory, sortOut]);

  const filtered = useMemo(() => {
    void inventoryTick;
    const next = filterProducts(products, {
      categories: selectedCategory ? [selectedCategory] : undefined,
      colors: selectedColors.length > 0 ? selectedColors : undefined,
    });
    return sortOut ? sortSoldOutLast(next) : next;
  }, [products, selectedCategory, selectedColors, sortOut, inventoryTick]);

  const activeFilterCount =
    (selectedCategory ? 1 : 0) + selectedColors.length;

  function clearFilters() {
    setSelectedCategory(undefined);
    setSelectedColors([]);
  }

  if (products.length === 0 && emptyState) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-3xl text-[#2f2924] sm:text-4xl">{title}</h1>
        </div>
        {emptyState}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl text-[#2f2924] sm:text-4xl">{title}</h1>

        <div className="flex shrink-0 items-center gap-2">
          <CatalogGridDensityToggle
            value={gridDensity}
            onChange={setGridDensity}
          />
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className={`inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors sm:px-5 ${
              activeFilterCount > 0
                ? "border-[#75825B] bg-[#75825B] text-white"
                : "border-[#2f2924]/12 bg-white text-[#2f2924] hover:border-[#75825B]/40 hover:text-[#75825B]"
            }`}
          >
            <ListFilter className="size-4" strokeWidth={1.75} aria-hidden />
            Filtrovať
            {activeFilterCount > 0 ? (
              <span className="ml-0.5 inline-flex size-5 items-center justify-center rounded-full bg-white/20 text-xs">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className={catalogGridClass(gridDensity)}>
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              filterColorIds={
                selectedColors.length > 0 ? selectedColors : undefined
              }
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl bg-white px-6 py-12 text-center sm:px-10">
          <p className="font-heading text-xl text-[#2f2924]">
            Žiadne produkty pre zvolené filtre
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#2f2924]/65">
            Skúste zmeniť filtre alebo ich úplne zrušiť.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-6 inline-flex cursor-pointer rounded-full bg-[#75825B] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Zobraziť všetky
          </button>
        </div>
      )}

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
              <FilterChip
                label="Všetky"
                active={!selectedCategory}
                onClick={() => setSelectedCategory(undefined)}
              />
              {categoryLabels.map((category) => (
                <FilterChip
                  key={category}
                  label={category}
                  active={selectedCategory === category}
                  onClick={() => setSelectedCategory(category)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium tracking-[0.12em] text-[#75825B] uppercase">
              Farba
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {filterColors.map((color) => {
                const active = selectedColors.includes(color.id);
                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() =>
                      setSelectedColors((prev) => toggleId(prev, color.id))
                    }
                    className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors ${
                      active
                        ? "border-[#75825B] bg-[#75825B] text-white"
                        : "border-black/10 bg-[#faf8f5] text-[#2f2924] hover:border-[#75825B]/40"
                    }`}
                  >
                    {color.hex ? (
                      <span
                        className={`size-3.5 rounded-full border ${
                          active ? "border-white/40" : "border-black/10"
                        }`}
                        style={{ backgroundColor: color.hex }}
                        aria-hidden
                      />
                    ) : null}
                    {color.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </FilterSheet>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 cursor-pointer items-center rounded-full px-3.5 text-sm font-medium transition-colors ${
        active
          ? "bg-[#75825B] text-white"
          : "bg-[#e8ebe2] text-[#2f2924] hover:bg-[#75825B]/20"
      }`}
    >
      {label}
    </button>
  );
}
