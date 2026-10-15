"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ListFilter } from "lucide-react";
import { FilterSheet } from "@/components/FilterSheet";
import { FilterSheetFooter } from "@/components/FilterSheetFooter";
import { ColorFilterChips } from "@/components/ColorFilterChips";
import {
  CatalogGridDensityToggle,
  catalogGridClass,
} from "@/components/CatalogGridDensityToggle";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/lib/products";
import type { StorefrontCollection } from "@/lib/produkty-url";
import { filterColors } from "@/lib/taxonomy";
import { useCatalogPagedList } from "@/lib/use-catalog-paged-list";

type CollectionCatalogBrowserProps = {
  title: string;
  collection: StorefrontCollection;
  initialProducts: Product[];
  initialTotal: number;
  initialHasMore: boolean;
  emptyState?: ReactNode;
};

function parseColors(searchParams: URLSearchParams): string[] {
  return (searchParams.get("farba") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function buildHref(basePath: string, colors: string[]) {
  const params = new URLSearchParams();
  if (colors.length > 0) {
    params.set("farba", colors.slice().sort().join(","));
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

function toggleId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

const BASE_PATH: Record<StorefrontCollection, string> = {
  novinky: "/novinky",
  bestsellery: "/bestsellery",
  vypredaj: "/vypredaj",
  akcia: "/akcia",
};

export function CollectionCatalogBrowser({
  title,
  collection,
  initialProducts,
  initialTotal,
  initialHasMore,
  emptyState,
}: CollectionCatalogBrowserProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const basePath = BASE_PATH[collection];

  const urlColors = useMemo(
    () => parseColors(searchParams),
    [searchParams],
  );

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [gridDensity, setGridDensity] = useState<"comfortable" | "compact">(
    "comfortable",
  );
  const [draftColors, setDraftColors] = useState(urlColors);

  useEffect(() => {
    setDraftColors(urlColors);
  }, [urlColors]);

  const filtersKey = `${collection}|${urlColors.slice().sort().join(",")}`;

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
      params.set("kolekcia", collection);
      if (urlColors.length > 0) {
        params.set("farba", urlColors.slice().sort().join(","));
      }
      return params;
    },
  });

  function applyColors(next: string[]) {
    setDraftColors(next);
    startTransition(() => {
      router.replace(buildHref(basePath, next), { scroll: false });
    });
  }

  function clearFilters() {
    applyColors([]);
  }

  return (
    <div ref={rootRef}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl text-[#2f2924] sm:text-4xl">{title}</h1>
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
              draftColors.length > 0
                ? "border-[#75825B] bg-[#75825B] text-white"
                : "border-[#2f2924]/12 bg-white text-[#2f2924] hover:border-[#75825B]/40 hover:text-[#75825B]"
            }`}
          >
            <ListFilter className="size-4" strokeWidth={1.75} aria-hidden />
            Filtrovať
            {draftColors.length > 0 ? (
              <span className="ml-0.5 inline-flex size-5 items-center justify-center rounded-full bg-white/20 text-xs">
                {draftColors.length}
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
                filterColorIds={urlColors.length > 0 ? urlColors : undefined}
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
        emptyState ?? (
          <div className="rounded-3xl bg-white px-6 py-12 text-center sm:px-10">
            <p className="font-heading text-xl text-[#2f2924]">
              Žiadne produkty pre zvolené filtre
            </p>
            {urlColors.length > 0 ? (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-6 inline-flex cursor-pointer rounded-full bg-[#75825B] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Zrušiť filtre
              </button>
            ) : null}
          </div>
        )
      )}

      <FilterSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        footer={
          <FilterSheetFooter
            hasActiveFilters={draftColors.length > 0}
            onClear={clearFilters}
            onDone={() => {
              applyColors(draftColors);
              setFiltersOpen(false);
            }}
          />
        }
      >
        <div>
          <p className="text-xs font-medium tracking-[0.12em] text-[#75825B] uppercase">
            Farba
          </p>
          <div className="mt-3">
            <ColorFilterChips
              colors={filterColors}
              selected={draftColors}
              onToggle={(id) => setDraftColors((prev) => toggleId(prev, id))}
            />
          </div>
        </div>
      </FilterSheet>
    </div>
  );
}
