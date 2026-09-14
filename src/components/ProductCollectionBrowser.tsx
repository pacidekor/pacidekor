"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
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
import {
  getInventoryForProduct,
  INVENTORY_EVENT,
  isInventoryAvailable,
} from "@/lib/inventory";
import {
  listingScrollKey,
  peekListingScroll,
  saveListingScroll,
  takeListingScroll,
} from "@/lib/listing-scroll";
import {
  collectCatalogColorFilters,
  filterProducts,
  type Product,
} from "@/lib/products";

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

function collectionFilterKey(category?: string, colors: string[] = []) {
  return `${category ?? ""}|${colors.slice().sort().join(",")}`;
}

type ProductCollectionBrowserProps = {
  title: string;
  products: Product[];
  sortSoldOutLast?: boolean;
  emptyState?: ReactNode;
  listenInventory?: boolean;
  /** Extra controls next to the title (e.g. add-all-to-cart). */
  headerAction?: ReactNode;
};

export function ProductCollectionBrowser({
  title,
  products,
  sortSoldOutLast: sortOut = false,
  emptyState,
  listenInventory = false,
  headerAction,
}: ProductCollectionBrowserProps) {
  const pathname = usePathname();
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
  const rootRef = useRef<HTMLDivElement>(null);
  const didReadRestoreRef = useRef(false);
  const filterKeyRef = useRef(collectionFilterKey(undefined, []));
  const pendingScrollYRef = useRef<number | null>(null);
  const pendingProductIdRef = useRef<string | null>(null);

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

  const colorFilters = useMemo(
    () => collectCatalogColorFilters(products),
    [products],
  );

  const filtered = useMemo(() => {
    void inventoryTick;
    const next = filterProducts(products, {
      categories: selectedCategory ? [selectedCategory] : undefined,
      colors: selectedColors.length > 0 ? selectedColors : undefined,
    });
    return sortOut ? sortSoldOutLast(next) : next;
  }, [products, selectedCategory, selectedColors, sortOut, inventoryTick]);

  filterKeyRef.current = collectionFilterKey(
    selectedCategory,
    selectedColors,
  );

  useLayoutEffect(() => {
    if (didReadRestoreRef.current) return;
    didReadRestoreRef.current = true;
    // Local filters don't survive navigation — key by pathname only.
    const key = listingScrollKey(pathname);
    const saved = peekListingScroll(key);
    if (!saved) return;
    pendingScrollYRef.current = saved.scrollY;
    pendingProductIdRef.current = saved.productId ?? null;
  }, [pathname]);

  useLayoutEffect(() => {
    if (pendingScrollYRef.current == null && !pendingProductIdRef.current) {
      return;
    }

    const key = listingScrollKey(pathname);

    function applyRestore() {
      const productId = pendingProductIdRef.current;
      if (productId) {
        const el = document.querySelector(
          `[data-product-id="${CSS.escape(productId)}"]`,
        );
        if (el) {
          el.scrollIntoView({ block: "center" });
          pendingScrollYRef.current = null;
          pendingProductIdRef.current = null;
          takeListingScroll(key);
          return true;
        }
      }

      const y = pendingScrollYRef.current;
      if (y == null) return true;
      window.scrollTo(0, y);
      const tallEnough =
        document.documentElement.scrollHeight >= y + window.innerHeight * 0.5;
      if (!tallEnough) return false;
      pendingScrollYRef.current = null;
      pendingProductIdRef.current = null;
      takeListingScroll(key);
      return true;
    }

    let tries = 0;
    const run = () => {
      if (applyRestore()) return;
      tries += 1;
      if (tries < 30) {
        window.setTimeout(run, 50);
      } else {
        pendingScrollYRef.current = null;
        pendingProductIdRef.current = null;
        takeListingScroll(key);
      }
    };

    requestAnimationFrame(() => requestAnimationFrame(run));
  }, [pathname, filtered.length]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const target = event.target as Element | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || !rootRef.current?.contains(anchor)) return;
      const href = anchor.getAttribute("href") ?? "";
      if (!href.includes("/produkt/")) return;

      const productId =
        anchor.closest("[data-product-id]")?.getAttribute("data-product-id") ??
        undefined;

      saveListingScroll(listingScrollKey(pathname), {
        scrollY: window.scrollY,
        productId: productId ?? undefined,
        productHref: href,
      });
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname]);

  const activeFilterCount =
    (selectedCategory ? 1 : 0) + selectedColors.length;

  function clearFilters() {
    setSelectedCategory(undefined);
    setSelectedColors([]);
  }

  if (products.length === 0 && emptyState) {
    return (
      <div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl text-[#2f2924] sm:text-4xl">{title}</h1>
          {headerAction}
        </div>
        {emptyState}
      </div>
    );
  }

  return (
    <div ref={rootRef}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl text-[#2f2924] sm:text-4xl">{title}</h1>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {headerAction}
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
            <div className="mt-3">
              <ColorFilterChips
                colors={colorFilters}
                selected={selectedColors}
                onToggle={(id) =>
                  setSelectedColors((prev) => toggleId(prev, id))
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
