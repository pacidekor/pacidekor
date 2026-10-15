"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ListFilter } from "lucide-react";
import { FilterSheet } from "@/components/FilterSheet";
import { FilterSheetFooter } from "@/components/FilterSheetFooter";
import { ColorFilterChips } from "@/components/ColorFilterChips";
import { useTaxonomy } from "@/components/ProductCatalogProvider";
import {
  CatalogGridDensityToggle,
  catalogGridClass,
} from "@/components/CatalogGridDensityToggle";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/lib/products";
import { filterColors } from "@/lib/taxonomy";
import {
  buildProduktyHref,
  parseProduktySearchParams,
  produktyFiltersKey,
  type ProduktyFilters,
} from "@/lib/produkty-url";
import { useCatalogPagedList } from "@/lib/use-catalog-paged-list";

type ProduktyBrowserProps = {
  initialProducts: Product[];
  initialTotal: number;
  initialHasMore: boolean;
};

function toggleId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

export function ProduktyBrowser({
  initialProducts,
  initialTotal,
  initialHasMore,
}: ProduktyBrowserProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taxonomy = useTaxonomy();
  const [, startTransition] = useTransition();

  const urlFilters = useMemo(
    () => parseProduktySearchParams(searchParams),
    [searchParams],
  );

  const categoryLabels =
    taxonomy.categories.length > 0
      ? taxonomy.categories.map((category) => category.label)
      : [];

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [gridDensity, setGridDensity] = useState<"comfortable" | "compact">(
    "comfortable",
  );
  const [draftFilters, setDraftFilters] = useState<ProduktyFilters>(urlFilters);

  const filtersKey = produktyFiltersKey(urlFilters);

  const {
    products,
    total,
    hasMore,
    loadingMore,
    loadError,
    rootRef,
    loadMoreRef,
    loadMore,
  } = useCatalogPagedList({
    initialProducts,
    initialTotal,
    initialHasMore,
    filtersKey,
    buildFilterParams: () => {
      const params = new URLSearchParams();
      if (urlFilters.category) params.set("kategoria", urlFilters.category);
      if (urlFilters.colors.length > 0) {
        params.set("farba", urlFilters.colors.slice().sort().join(","));
      }
      return params;
    },
  });

  useEffect(() => {
    setDraftFilters(urlFilters);
  }, [urlFilters]);

  const activeFilterCount =
    (draftFilters.category ? 1 : 0) + draftFilters.colors.length;

  function applyFilters(next: ProduktyFilters) {
    setDraftFilters(next);
    const href = buildProduktyHref(next);
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  function clearFilters() {
    applyFilters({ colors: [] });
  }

  return (
    <div ref={rootRef}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl text-[#2f2924] sm:text-4xl">Produkty</h1>
          <p className="mt-1 text-sm text-[#2f2924]/55">
            {total} {total === 1 ? "produkt" : total < 5 ? "produkty" : "produktov"}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
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

      {products.length > 0 ? (
        <div>
          <div className={catalogGridClass(gridDensity)}>
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                filterColorIds={
                  urlFilters.colors.length > 0 ? urlFilters.colors : undefined
                }
                priority={index < 4}
              />
            ))}
          </div>
          {hasMore ? (
            <div ref={loadMoreRef} className="flex justify-center py-10">
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => void loadMore()}
                className="inline-flex h-11 cursor-pointer items-center rounded-full border border-black/10 bg-white px-5 text-sm font-medium text-[#2f2924] transition-colors hover:border-[#75825B]/40 hover:text-[#75825B] disabled:opacity-60"
              >
                {loadingMore
                  ? "Načítavam…"
                  : `Zobraziť ďalšie (${Math.max(0, total - products.length)})`}
              </button>
            </div>
          ) : null}
          {loadError ? (
            <p className="pb-6 text-center text-sm text-[#9a4d3f]">{loadError}</p>
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
            onDone={() => {
              applyFilters(draftFilters);
              setFiltersOpen(false);
            }}
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
                active={!draftFilters.category}
                onClick={() =>
                  setDraftFilters((prev) => ({ ...prev, category: undefined }))
                }
              />
              {categoryLabels.map((category) => (
                <FilterChip
                  key={category}
                  label={category}
                  active={draftFilters.category === category}
                  onClick={() =>
                    setDraftFilters((prev) => ({ ...prev, category }))
                  }
                />
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium tracking-[0.12em] text-[#75825B] uppercase">
              Farba
            </p>
            <div className="mt-3">
              <ColorFilterChips
                colors={filterColors}
                selected={draftFilters.colors}
                onToggle={(id) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    colors: toggleId(prev.colors, id),
                  }))
                }
              />
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
