"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ListFilter, X } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { filterProducts, type Product } from "@/lib/products";
import {
  buildCategoryFilterHref,
  filterColors,
  getSubcategoriesForCategory,
  parseCategoryFilters,
  type CategoryFilters,
} from "@/lib/taxonomy";

type CategoryProductBrowserProps = {
  categoryLabel: string;
  categorySlug: string;
  products: Product[];
};

function toggleId(list: string[] | undefined, id: string): string[] | undefined {
  const current = list ?? [];
  const next = current.includes(id)
    ? current.filter((item) => item !== id)
    : [...current, id];
  return next.length > 0 ? next : undefined;
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

  const filters = useMemo(() => {
    const raw: Record<string, string | undefined> = {};
    searchParams.forEach((value, key) => {
      raw[key] = value;
    });
    return parseCategoryFilters(raw);
  }, [searchParams]);

  const subcategories = getSubcategoriesForCategory(categoryLabel);
  const hasTaxonomy = subcategories.length > 0;

  const filtered = useMemo(
    () =>
      filterProducts(products, {
        subcategoryId: filters.sub,
        colors: filters.farba,
      }),
    [products, filters],
  );

  const activeFilterCount = filters.farba?.length ?? 0;

  function applyFilters(next: CategoryFilters) {
    const href = buildCategoryFilterHref(categorySlug, next);
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  function setSubcategory(subId: string | undefined) {
    applyFilters({ ...filters, sub: subId });
  }

  function clearAttributeFilters() {
    applyFilters({ sub: filters.sub });
    setFiltersOpen(false);
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

        {hasTaxonomy ? (
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            className={`inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors sm:px-5 ${
              filtersOpen || activeFilterCount > 0
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
        ) : null}
      </div>

      {hasTaxonomy ? (
        <div className="mb-5 flex flex-wrap gap-2">
          <SubChip
            label="Všetky"
            active={!filters.sub}
            href={buildCategoryFilterHref(categorySlug, {
              ...filters,
              sub: undefined,
            })}
            onNavigate={() => setSubcategory(undefined)}
          />
          {subcategories.map((sub) => (
            <SubChip
              key={sub.id}
              label={sub.label}
              active={filters.sub === sub.id}
              href={buildCategoryFilterHref(categorySlug, {
                ...filters,
                sub: sub.id,
              })}
              onNavigate={() => setSubcategory(sub.id)}
            />
          ))}
        </div>
      ) : null}

      {hasTaxonomy && filtersOpen ? (
        <div className="mb-6 rounded-2xl border border-black/6 bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <p className="font-heading text-lg text-[#2f2924]">Filtre</p>
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-[#2f2924]/55 transition-colors hover:bg-[#e8ebe2] hover:text-[#2f2924]"
              aria-label="Zavrieť filtre"
            >
              <X className="size-4" strokeWidth={1.75} aria-hidden />
            </button>
          </div>

          <div className="mt-5 grid gap-6 sm:grid-cols-1">
            <FilterGroup title="Farba">
              {filterColors.map((color) => {
                const checked = filters.farba?.includes(color.id) ?? false;
                return (
                  <label
                    key={color.id}
                    className="flex cursor-pointer items-center gap-2.5 text-sm text-[#2f2924]"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        applyFilters({
                          ...filters,
                          farba: toggleId(filters.farba, color.id),
                        })
                      }
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
            </FilterGroup>
          </div>

          {activeFilterCount > 0 ? (
            <button
              type="button"
              onClick={clearAttributeFilters}
              className="mt-5 cursor-pointer text-sm font-medium text-[#75825B] transition-colors hover:text-[#5f6a49]"
            >
              Zrušiť filtre
            </button>
          ) : null}
        </div>
      ) : null}

      <p className="mb-4 text-sm text-[#2f2924]/55">
        {filtered.length === products.length
          ? `${filtered.length} produktov`
          : `${filtered.length} z ${products.length} produktov`}
      </p>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl bg-white px-6 py-12 text-center sm:px-10">
          <p className="font-heading text-xl text-[#2f2924]">
            Žiadne produkty pre zvolené filtre
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#2f2924]/65">
            Skúste zmeniť subkategóriu alebo zrušiť niektoré filtre.
          </p>
          <button
            type="button"
            onClick={() => {
              applyFilters({});
              setFiltersOpen(false);
            }}
            className="mt-6 inline-flex cursor-pointer rounded-full bg-[#75825B] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Zobraziť všetky
          </button>
        </div>
      )}
    </div>
  );
}

function SubChip({
  label,
  active,
  href,
  onNavigate,
}: {
  label: string;
  active: boolean;
  href: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      onClick={(event) => {
        event.preventDefault();
        onNavigate();
      }}
      className={`inline-flex h-9 items-center rounded-full px-3.5 text-sm font-medium transition-colors ${
        active
          ? "bg-[#75825B] text-white"
          : "bg-[#e8ebe2] text-[#2f2924] hover:bg-[#75825B]/20"
      }`}
    >
      {label}
    </Link>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium tracking-[0.12em] text-[#75825B] uppercase">
        {title}
      </p>
      <div className="mt-3 flex flex-col gap-2.5">{children}</div>
    </div>
  );
}
