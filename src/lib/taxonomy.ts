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
  { id: "kytice", label: "Kytice", category: "Umelé kvety" },
  { id: "stopkove-kvety", label: "Stopkové kvety", category: "Umelé kvety" },
  { id: "vencovky", label: "Venčovky", category: "Umelé kvety" },
  { id: "listy", label: "Listy", category: "Umelé kvety" },
  { id: "doplnky", label: "Doplnky", category: "Umelé kvety" },
  { id: "ozdobne-stuhy", label: "Ozdobné stuhy", category: "Stuhy" },
  { id: "satinove-stuhy", label: "Saténové stuhy", category: "Stuhy" },
  { id: "pohrebne-stuhy", label: "Pohrebné stuhy", category: "Stuhy" },
  {
    id: "latkove-pohrebne-stuhy",
    label: "Látkové pohrebné stuhy",
    category: "Stuhy",
  },
  { id: "jutove-stuhy", label: "Jutové stuhy", category: "Stuhy" },
  { id: "sametove-stuhy", label: "Sametové stuhy", category: "Stuhy" },
  { id: "viazacky", label: "Viazačky", category: "Stuhy" },
  { id: "folie", label: "Fólie", category: "Obalový materiál" },
  { id: "folie-harky", label: "Fólie hárky", category: "Obalový materiál" },
  {
    id: "sietka-plastova",
    label: "Sieťka plastová",
    category: "Obalový materiál",
  },
  {
    id: "sietka-hackovana",
    label: "Sieťka hačkovaná",
    category: "Obalový materiál",
  },
  {
    id: "sisalova-sietka",
    label: "Sisalová sieťka",
    category: "Obalový materiál",
  },
  { id: "jutova-sietka", label: "Jutová sieťka", category: "Obalový materiál" },
  {
    id: "papierova-rolka",
    label: "Papierová rolka",
    category: "Obalový materiál",
  },
  {
    id: "papierova-rolka-roztahovacia",
    label: "Papierová rolka rozťahovacia",
    category: "Obalový materiál",
  },
  { id: "papier-harky", label: "Papier hárky", category: "Obalový materiál" },
  {
    id: "cipkova-rolka",
    label: "Čipková rolka",
    category: "Obalový materiál",
  },
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
  druh?: string;
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
  const druhRaw = searchParams.druh;
  const farbaRaw = searchParams.farba;

  const sub =
    typeof subRaw === "string" && subRaw.length > 0 ? subRaw : undefined;
  const druh =
    typeof druhRaw === "string" && druhRaw.length > 0 ? druhRaw : undefined;

  const farba = normalizeMultiParam(farbaRaw).filter((id) =>
    filterColors.some((color) => color.id === id),
  );

  return {
    sub,
    druh,
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
  if (filters.druh) params.set("druh", filters.druh);
  if (filters.farba?.length) params.set("farba", filters.farba.join(","));
  const qs = params.toString();
  return qs ? `/kategorie/${categorySlug}?${qs}` : `/kategorie/${categorySlug}`;
}

/** Keep for future pretty URLs / admin slug helpers */
export function taxonomyValueSlug(label: string) {
  return toSlug(label);
}
