import "server-only";

import { applyDiscountsToProducts } from "@/lib/discounts";
import { listDiscounts } from "@/lib/discounts-server";
import { listProducts } from "@/lib/products-server";
import {
  getColorPreviewImages,
  productHref,
  productColorMatchesFilter,
  resolveProductColorForFilters,
  type Product,
} from "@/lib/products";
import { filterColors } from "@/lib/taxonomy";

export type ChatProductCard = {
  id: string;
  slug: string;
  name: string;
  price: string;
  originalPrice?: string;
  discount?: number;
  image: string;
  category: string;
  href: string;
  colorId?: string;
  inStock: boolean;
};

export type ChatProductSearchInput = {
  query?: string;
  category?: string;
  color?: string;
  onSaleOnly?: boolean;
  minDiscountPercent?: number;
  /** Exact number of products to return (1–6). */
  limit?: number;
  /** Product must match at least one of these terms (e.g. ruža, georgína). */
  requireAny?: string[];
  /** Drop products whose name/description contains any of these (e.g. narcis). */
  exclude?: string[];
};

const QUERY_STOPWORDS = new Set([
  "a",
  "aj",
  "ako",
  "ale",
  "alebo",
  "byt",
  "co",
  "do",
  "hodi",
  "hodia",
  "ja",
  "jednu",
  "jednu",
  "jeden",
  "jedna",
  "jedno",
  "k",
  "ktore",
  "ktora",
  "ktory",
  "ma",
  "mam",
  "mi",
  "mna",
  "my",
  "na",
  "naj",
  "nechcem",
  "nie",
  "o",
  "od",
  "po",
  "podla",
  "porad",
  "poradte",
  "pre",
  "pri",
  "prosim",
  "sa",
  "si",
  "so",
  "som",
  "su",
  "ta",
  "tak",
  "taky",
  "tato",
  "to",
  "tu",
  "ty",
  "u",
  "v",
  "vas",
  "vam",
  "viac",
  "vy",
  "za",
  "ze",
  "zelam",
  "chcem",
  "najdite",
  "najdi",
  "dajte",
  "daj",
  "ukazte",
  "ukaz",
  "vyberte",
  "vyber",
  "prosim",
  "byt",
  "byt",
]);

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeList(values?: string[]) {
  if (!values?.length) return [] as string[];
  return values
    .map((value) => normalize(value))
    .filter((value) => value.length >= 2);
}

export function resolveColorId(color?: string) {
  if (!color?.trim()) return undefined;
  const n = normalize(color);
  const match = filterColors.find(
    (item) =>
      normalize(item.id) === n ||
      normalize(item.label) === n ||
      normalize(item.label).includes(n) ||
      n.includes(normalize(item.id)) ||
      n.includes(normalize(item.label)),
  );
  return match?.id;
}

function detectColorFromQuery(query?: string) {
  if (!query?.trim()) return undefined;
  const n = normalize(query);
  const sorted = [...filterColors].sort(
    (a, b) => b.label.length - a.label.length,
  );
  for (const item of sorted) {
    const label = normalize(item.label);
    const id = normalize(item.id);
    if (n.includes(label) || n.includes(id)) return item.id;
  }
  return undefined;
}

function productHaystack(product: Product) {
  return normalize(
    [
      product.name,
      product.description,
      product.category,
      product.sku ?? "",
      ...(product.attributes?.colors ?? []),
    ].join(" "),
  );
}

function containsTerm(hay: string, term: string) {
  if (!term) return false;
  if (hay.includes(term)) return true;
  // stem-ish: narcis ↔ narcisom / narcisy
  if (term.length >= 4) {
    const stem = term.slice(0, Math.max(4, term.length - 1));
    return hay.includes(stem);
  }
  return false;
}

function toCard(product: Product, preferredColorId?: string): ChatProductCard {
  const colorId =
    resolveProductColorForFilters(
      product,
      preferredColorId ? [preferredColorId] : undefined,
    ) ?? undefined;

  const preview = colorId
    ? getColorPreviewImages(product, colorId)
    : { image: product.image };

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    price: product.price,
    originalPrice: product.originalPrice,
    discount: product.discount,
    image: preview.image,
    category: product.category,
    href: productHref(product.slug, { colorId }),
    colorId,
    inStock: product.inStock !== false,
  };
}

export async function searchProductsForChat(
  input: ChatProductSearchInput,
): Promise<ChatProductCard[]> {
  const [products, discounts] = await Promise.all([
    listProducts(),
    listDiscounts(),
  ]);
  const priced = applyDiscountsToProducts(products, discounts);
  const query = normalize(input.query ?? "");
  const tokens = query
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2 && !QUERY_STOPWORDS.has(token));
  const colorId =
    resolveColorId(input.color) ?? detectColorFromQuery(input.query);
  const category = input.category?.trim();
  const minDiscount = input.minDiscountPercent ?? 0;
  const onSaleOnly = Boolean(input.onSaleOnly) || minDiscount > 0;
  const limit = Math.min(6, Math.max(1, Math.round(input.limit ?? 3)));
  const requireAny = normalizeList(input.requireAny);
  const exclude = normalizeList(input.exclude);

  const scored = priced
    .map((product) => {
      if (product.inStock === false) {
        return null;
      }

      if (category && normalize(product.category) !== normalize(category)) {
        return null;
      }

      const hay = productHaystack(product);

      if (exclude.some((term) => containsTerm(hay, term))) {
        return null;
      }

      if (requireAny.length > 0) {
        const matchedRequired = requireAny.some((term) =>
          containsTerm(hay, term),
        );
        if (!matchedRequired) return null;
      }

      if (colorId) {
        const ids = product.attributes?.colors ?? [];
        const matches = ids.some((id) => productColorMatchesFilter(id, colorId));
        if (!matches) return null;
      }

      if (onSaleOnly && !(product.discount && product.discount > 0)) {
        return null;
      }

      if (minDiscount > 0 && (product.discount ?? 0) < minDiscount) {
        return null;
      }

      let score = 0;

      if (requireAny.length > 0) {
        for (const term of requireAny) {
          if (normalize(product.name).includes(term)) score += 12;
          else if (containsTerm(hay, term)) score += 6;
        }
      }

      if (tokens.length === 0) {
        score += colorId ? 5 : (product.discount ?? 1);
      } else {
        for (const token of tokens) {
          if (hay.includes(token)) score += 3;
          else if (hay.split(/\s+/).some((w) => w.startsWith(token))) score += 1;
        }
        // Bez farebného / require filtra musí byť aspoň nejaký textový hit
        if (score === 0 && !colorId && requireAny.length === 0) return null;
        if (colorId) score += 4;
      }

      if (product.discount) score += Math.min(5, product.discount / 10);

      return { product, score };
    })
    .filter((item): item is { product: Product; score: number } => item !== null)
    .sort(
      (a, b) =>
        b.score - a.score || (b.product.discount ?? 0) - (a.product.discount ?? 0),
    )
    .slice(0, limit)
    .map((item) => toCard(item.product, colorId));

  return scored;
}

export async function getProductsByIds(
  ids: string[],
  preferredColorId?: string,
): Promise<ChatProductCard[]> {
  if (ids.length === 0) return [];
  const [products, discounts] = await Promise.all([
    listProducts(),
    listDiscounts(),
  ]);
  const priced = applyDiscountsToProducts(products, discounts);
  const map = new Map(priced.map((product) => [product.id, product]));
  return ids
    .map((id) => map.get(id))
    .filter((product): product is Product => Boolean(product))
    .filter((product) => product.inStock !== false)
    .map((product) => toCard(product, preferredColorId));
}
