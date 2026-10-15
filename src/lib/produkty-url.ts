export type StorefrontCollection =
  | "novinky"
  | "bestsellery"
  | "vypredaj"
  | "akcia";

export type ProduktyFilters = {
  category?: string;
  colors: string[];
};

export function parseProduktySearchParams(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>,
): ProduktyFilters {
  const get = (key: string) => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key) ?? undefined;
    }
    const raw = searchParams[key];
    if (Array.isArray(raw)) return raw[0];
    return raw;
  };

  const category = get("kategoria")?.trim() || undefined;
  const colors = (get("farba") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return { category, colors };
}

export function buildProduktyHref(filters: ProduktyFilters) {
  const params = new URLSearchParams();
  if (filters.category) params.set("kategoria", filters.category);
  if (filters.colors.length > 0) {
    params.set("farba", filters.colors.slice().sort().join(","));
  }
  const qs = params.toString();
  return qs ? `/produkty?${qs}` : "/produkty";
}

export function produktyFiltersKey(filters: ProduktyFilters) {
  return `${filters.category ?? ""}|${filters.colors.slice().sort().join(",")}`;
}
