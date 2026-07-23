import { toSlug, type CategoryLabel } from "@/lib/navigation";

export type TaxonomyValue = {
  id: string;
  label: string;
  /** Optional swatch for filter UI */
  hex?: string;
};

export type Subcategory = TaxonomyValue & {
  category: CategoryLabel;
};

/** Filter color palette — basic groups, not product variant shades. */
export const filterColors: TaxonomyValue[] = [
  { id: "biela", label: "Biela", hex: "#f5f2ec" },
  { id: "cervena", label: "Červená", hex: "#b43c3c" },
  { id: "ruzova", label: "Ružová", hex: "#d4a0a8" },
  { id: "fialova", label: "Fialová", hex: "#7a5f8a" },
  { id: "zelena", label: "Zelená", hex: "#6b7f5a" },
  { id: "kremova", label: "Krémová", hex: "#e8d9c4" },
  { id: "oranzova", label: "Oranžová", hex: "#d4894a" },
  { id: "zlta", label: "Žltá", hex: "#e0c35a" },
  { id: "modra", label: "Modrá", hex: "#5a7a9a" },
  { id: "hneda", label: "Hnedá", hex: "#8a6a4a" },
  { id: "seda", label: "Sivá", hex: "#9a9a96" },
];

/** Balenie / spôsob dodania – počet kusov v danej jednotke. */
export const packagingFormats: TaxonomyValue[] = [
  { id: "krabica", label: "Krabica" },
  { id: "paleta", label: "Paleta" },
  { id: "vlastni", label: "Vlastní" },
];

export const subcategories: Subcategory[] = [
  { id: "ruze", label: "Ruže", category: "Umelé kvety" },
  { id: "pivonie", label: "Pivónie", category: "Umelé kvety" },
  { id: "dalie", label: "Dálie", category: "Umelé kvety" },
  { id: "vres", label: "Vres", category: "Umelé kvety" },
  { id: "eukalyptus", label: "Eukalyptus", category: "Umelé kvety" },
  { id: "paprad", label: "Papraď", category: "Umelé kvety" },
  { id: "zelen", label: "Zeleň / výplň", category: "Umelé kvety" },
  { id: "ostatne", label: "Ostatné", category: "Umelé kvety" },
];

export type PackagingOption = {
  id: string;
  /** Počet kusov v tejto jednotke balenia */
  pieces: number;
  /** Vlastný názov jednotky (pre id `vlastni`) */
  label?: string;
};

export type ProductAttributes = {
  colors?: string[];
  packaging?: PackagingOption[];
};

export type CategoryFilters = {
  sub?: string;
  farba?: string[];
};

export function getSubcategoriesForCategory(category: string): Subcategory[] {
  return subcategories.filter((item) => item.category === category);
}

export function getSubcategoryById(id: string | undefined) {
  if (!id) return undefined;
  return subcategories.find((item) => item.id === id);
}

export function getFilterColorById(id: string) {
  return filterColors.find((item) => item.id === id);
}

export function getPackagingFormatById(id: string) {
  return packagingFormats.find((item) => item.id === id);
}

export function parseCategoryFilters(
  searchParams: Record<string, string | string[] | undefined>,
): CategoryFilters {
  const subRaw = searchParams.sub;
  const farbaRaw = searchParams.farba;

  const sub =
    typeof subRaw === "string" && subRaw.length > 0 ? subRaw : undefined;

  const farba = normalizeMultiParam(farbaRaw).filter((id) =>
    filterColors.some((color) => color.id === id),
  );

  return {
    sub,
    farba: farba.length > 0 ? farba : undefined,
  };
}

function normalizeMultiParam(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const parts = Array.isArray(value) ? value : value.split(",");
  return parts
    .flatMap((part) => part.split(","))
    .map((part) => part.trim())
    .filter(Boolean);
}

export function buildCategoryFilterHref(
  categorySlug: string,
  filters: CategoryFilters,
): string {
  const params = new URLSearchParams();
  if (filters.sub) params.set("sub", filters.sub);
  if (filters.farba?.length) params.set("farba", filters.farba.join(","));
  const qs = params.toString();
  return qs ? `/kategorie/${categorySlug}?${qs}` : `/kategorie/${categorySlug}`;
}

/** Keep for future pretty URLs / admin slug helpers */
export function taxonomyValueSlug(label: string) {
  return toSlug(label);
}
