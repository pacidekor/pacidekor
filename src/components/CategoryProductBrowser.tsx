"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ListFilter } from "lucide-react";
import { FilterSheet } from "@/components/FilterSheet";
import { FilterSheetFooter } from "@/components/FilterSheetFooter";
import { CollapsibleChipList } from "@/components/CollapsibleChipList";
import {
  CatalogGridDensityToggle,
  catalogGridClass,
} from "@/components/CatalogGridDensityToggle";
import { ProductCard } from "@/components/ProductCard";
import {
  ADMIN_CATEGORIES_EVENT,
  getAdminDruhyForCategory,
  getAdminSubcategoriesForCategory,
} from "@/lib/admin-categories-store";
import { filterProducts } from "@/lib/products";
import {
  buildCategoryFilterHref,
  filterColors,
  getSubcategoriesForCategory,
  parseCategoryFilters,
  type CategoryFilters,
} from "@/lib/taxonomy";
import { subscribeTaxonomy } from "@/lib/taxonomy-store";
import { usePricedProducts } from "@/lib/use-priced-product";

type CategoryProductBrowserProps = {
  categoryLabel: string;
  categorySlug: string;
  products: import("@/lib/products").Product[];
};

/** First paint + each “load more” batch — keeps filter clicks snappy. */
const PAGE_SIZE = 24;

function toggleId(list: string[] | undefined, id: string): string[] | undefined {
  const current = list ?? [];
  const next = current.includes(id)
    ? current.filter((item) => item !== id)
    : [...current, id];
  return next.length > 0 ? next : undefined;
}

function filtersFromSearchParams(
  searchParams: URLSearchParams,
): CategoryFilters {
  const raw: Record<string, string | undefined> = {};
  searchParams.forEach((value, key) => {
    raw[key] = value;
  });
  return parseCategoryFilters(raw);
}

function filtersKey(filters: CategoryFilters) {
  return [
    filters.sub ?? "",
    filters.druh ?? "",
    (filters.farba ?? []).slice().sort().join(","),
  ].join("|");
}

export function CategoryProductBrowser({
  categoryLabel,
  categorySlug,
  products,
}: CategoryProductBrowserProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [gridDensity, setGridDensity] = useState<"comfortable" | "compact">(
    "comfortable",
  );
  const [subcategories, setSubcategories] = useState(() =>
    getSubcategoriesForCategory(categoryLabel).map((sub) => ({
      id: sub.id,
      label: sub.label,
    })),
  );
  const [druhy, setDruhy] = useState(() =>
    getAdminDruhyForCategory(categoryLabel),
  );

  // Optimistic filters — update UI immediately; URL syncs in background.
  const [filters, setFilters] = useState<CategoryFilters>(() =>
    filtersFromSearchParams(searchParams),
  );
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const applyingFiltersRef = useRef(false);

  useEffect(() => {
    function refresh() {
      setSubcategories(getAdminSubcategoriesForCategory(categoryLabel));
      setDruhy(getAdminDruhyForCategory(categoryLabel));
    }
    refresh();
    window.addEventListener(ADMIN_CATEGORIES_EVENT, refresh);
    const unsubscribe = subscribeTaxonomy(refresh);
    return () => {
      window.removeEventListener(ADMIN_CATEGORIES_EVENT, refresh);
      unsubscribe();
    };
  }, [categoryLabel]);

  // Back/forward / shared links — adopt URL when it diverges (skip our own replaces).
  useEffect(() => {
    if (applyingFiltersRef.current) {
      applyingFiltersRef.current = false;
      return;
    }
    const fromUrl = filtersFromSearchParams(searchParams);
    setFilters((prev) =>
      filtersKey(prev) === filtersKey(fromUrl) ? prev : fromUrl,
    );
  }, [searchParams]);

  const pricedProducts = usePricedProducts(products);

  const filtered = useMemo(
    () =>
      filterProducts(pricedProducts, {
        subcategoryId: filters.sub,
        druhId: filters.druh,
        colors: filters.farba,
      }),
    [pricedProducts, filters],
  );

  // Keep chip taps responsive while the heavy grid catches up.
  const deferredFiltered = useDeferredValue(filtered);
  const isFilterPending = filtered !== deferredFiltered;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filters]);

  const visibleProducts = useMemo(
    () => deferredFiltered.slice(0, visibleCount),
    [deferredFiltered, visibleCount],
  );
  const hasMore = visibleCount < deferredFiltered.length;

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((count) =>
            Math.min(count + PAGE_SIZE, deferredFiltered.length),
          );
        }
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, deferredFiltered.length, visibleCount]);

  const activeFilterCount =
    (filters.sub ? 1 : 0) +
    (filters.druh ? 1 : 0) +
    (filters.farba?.length ?? 0);

  function applyFilters(next: CategoryFilters) {
    applyingFiltersRef.current = true;
    setFilters(next);
    const href = buildCategoryFilterHref(categorySlug, next);
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  function clearFilters() {
    applyFilters({});
  }

  if (products.length === 0) {
    return (
      <div className="rounded-3xl bg-white px-6 py-12 text-center sm:px-10">
        <p className="font-heading text-xl text-[#2f2924] sm:text-2xl">
          Produkty pripravujeme
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#2f2924]/65 sm:text-base">
          V tejto kategórii zatiaľ nie sú žiadne produkty. Čoskoro ich doplníme.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex cursor-pointer rounded-full bg-[#75825B] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Späť na úvod
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl text-[#2f2924] sm:text-4xl">{categoryLabel}</h1>

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

      {deferredFiltered.length > 0 ? (
        <div
          className={
            isFilterPending ? "opacity-70 transition-opacity" : undefined
          }
        >
          <div className={catalogGridClass(gridDensity)}>
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                filterColorIds={filters.farba}
              />
            ))}
          </div>
          {hasMore ? (
            <div
              ref={loadMoreRef}
              className="flex justify-center py-10"
              aria-hidden
            >
              <button
                type="button"
                onClick={() =>
                  setVisibleCount((count) =>
                    Math.min(count + PAGE_SIZE, deferredFiltered.length),
                  )
                }
                className="inline-flex h-11 cursor-pointer items-center rounded-full border border-black/10 bg-white px-5 text-sm font-medium text-[#2f2924] transition-colors hover:border-[#75825B]/40 hover:text-[#75825B]"
              >
                Zobraziť ďalšie (
                {deferredFiltered.length - visibleCount})
              </button>
            </div>
          ) : null}
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
          {subcategories.length > 0 ? (
            <div>
              <p className="text-xs font-medium tracking-[0.12em] text-[#75825B] uppercase">
                Subkategória
              </p>
              <div className="mt-3">
                <CollapsibleChipList>
                  <FilterChip
                    label="Všetky"
                    active={!filters.sub}
                    onClick={() =>
                      applyFilters({ ...filters, sub: undefined })
                    }
                  />
                  {subcategories.map((sub) => (
                    <FilterChip
                      key={sub.id}
                      label={sub.label}
                      active={filters.sub === sub.id}
                      onClick={() =>
                        applyFilters({ ...filters, sub: sub.id })
                      }
                    />
                  ))}
                </CollapsibleChipList>
              </div>
            </div>
          ) : null}

          {druhy.length > 0 ? (
            <div>
              <p className="text-xs font-medium tracking-[0.12em] text-[#75825B] uppercase">
                Druh
              </p>
              <div className="mt-3">
                <CollapsibleChipList>
                  <FilterChip
                    label="Všetky"
                    active={!filters.druh}
                    onClick={() =>
                      applyFilters({ ...filters, druh: undefined })
                    }
                  />
                  {druhy.map((druh) => (
                    <FilterChip
                      key={druh.id}
                      label={druh.label}
                      active={filters.druh === druh.id}
                      onClick={() =>
                        applyFilters({ ...filters, druh: druh.id })
                      }
                    />
                  ))}
                </CollapsibleChipList>
              </div>
            </div>
          ) : null}

          <div>
            <p className="text-xs font-medium tracking-[0.12em] text-[#75825B] uppercase">
              Farba
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {filterColors.map((color) => {
                const active = filters.farba?.includes(color.id) ?? false;
                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() =>
                      applyFilters({
                        ...filters,
                        farba: toggleId(filters.farba, color.id),
                      })
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
