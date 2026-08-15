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
  /** Dostupné farby produktu (popisky). */
  availableColors?: string[];
};

export type ChatLink = {
  label: string;
  href: string;
};

export type ChatProductSearchResult = {
  products: ChatProductCard[];
  /** Počet produktov, ktoré sedeli na filter (podľa includeOutOfStock). */
  totalMatching: number;
  onSaleOnly: boolean;
  /** Pri akciách: všetky zľavnené bez ohľadu na sklad. */
  onSaleTotal?: number;
  onSaleInStock?: number;
  onSaleOutOfStock?: number;
  /** true = výsledok obsahuje aj vypredané (alebo len vypredané). */
  includedOutOfStock?: boolean;
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
  /** Zahrnúť aj vypredané (kontrola skladu / farby). */
  includeOutOfStock?: boolean;
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
  "teraz",
  "aktualne",
  "akcia",
  "akcie",
  "akcii",
  "akcne",
  "akcny",
  "akcna",
  "zlava",
  "zlavy",
  "zlavnene",
  "vypredaj",
  "sale",
  "ponuke",
  "ponuka",
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

function colorLabelsForProduct(product: Product): string[] {
  const ids =
    product.colors?.map((color) => color.id) ??
    product.attributes?.colors ??
    [];
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    const fromProduct = product.colors?.find((color) => color.id === id)?.label;
    const fromFilter = filterColors.find((color) => color.id === id)?.label;
    const label = fromProduct || fromFilter || id;
    const key = normalize(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
  }
  return labels;
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
    availableColors: colorLabelsForProduct(product),
  };
}

export async function searchProductsForChat(
  input: ChatProductSearchInput,
): Promise<ChatProductSearchResult> {
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
  const saleIntent = /(?:^|[^a-z])(?:akci|zlav|vypredaj|sale)(?:[^a-z]|$)/.test(
    ` ${query} `,
  );
  const onSaleOnly =
    Boolean(input.onSaleOnly) || minDiscount > 0 || saleIntent;
  const includeOutOfStock = Boolean(input.includeOutOfStock);
  const limit = Math.min(6, Math.max(1, Math.round(input.limit ?? 3)));
  const requireAny = normalizeList(input.requireAny);
  const exclude = normalizeList(input.exclude);

  const matched = priced
    .map((product) => {
      const stocked = product.inStock !== false;
      if (!includeOutOfStock && !stocked) {
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
        // (pri akciách stačí zľava — query typu „čo máte v akcii“ nemusí sedieť na názov)
        if (score === 0 && !colorId && requireAny.length === 0) {
          if (onSaleOnly) score += product.discount ?? 1;
          else return null;
        }
        if (colorId) score += 4;
      }

      if (product.discount) score += Math.min(5, product.discount / 10);
      if (stocked) score += 2;

      return { product, score };
    })
    .filter((item): item is { product: Product; score: number } => item !== null)
    .sort(
      (a, b) =>
        b.score - a.score || (b.product.discount ?? 0) - (a.product.discount ?? 0),
    );

  let finalMatched = matched;
  let usedOutOfStock = includeOutOfStock;

  // Ak nič skladom, skús vypredané + prípadne podobné skladom bez farby.
  if (
    finalMatched.length === 0 &&
    !includeOutOfStock &&
    (Boolean(colorId) || requireAny.length > 0 || tokens.length > 0)
  ) {
    const oosResult = await searchProductsForChat({
      ...input,
      includeOutOfStock: true,
      limit,
    });

    const altCards: ChatProductCard[] = [];
    if (colorId) {
      const altResult = await searchProductsForChat({
        ...input,
        color: undefined,
        includeOutOfStock: false,
        limit: Math.min(2, limit),
      });
      altCards.push(...altResult.products);
    }

    const merged: ChatProductCard[] = [];
    const seen = new Set<string>();
    for (const card of [...oosResult.products, ...altCards]) {
      if (seen.has(card.id)) continue;
      seen.add(card.id);
      merged.push(card);
      if (merged.length >= limit) break;
    }

    if (merged.length > 0) {
      return {
        products: merged,
        totalMatching: merged.length,
        onSaleOnly,
        includedOutOfStock: oosResult.products.some((p) => !p.inStock),
        ...(onSaleOnly
          ? {
              onSaleTotal: priced.filter((p) => p.discount && p.discount > 0)
                .length,
              onSaleInStock: priced.filter(
                (p) =>
                  p.discount &&
                  p.discount > 0 &&
                  p.inStock !== false,
              ).length,
              onSaleOutOfStock: priced.filter(
                (p) => p.discount && p.discount > 0 && p.inStock === false,
              ).length,
            }
          : {}),
      };
    }
  }

  const onSaleProducts = onSaleOnly
    ? priced.filter((product) => product.discount && product.discount > 0)
    : [];
  const onSaleInStock = onSaleProducts.filter(
    (product) => product.inStock !== false,
  ).length;
  const onSaleOutOfStock = onSaleProducts.length - onSaleInStock;

  return {
    products: finalMatched
      .slice(0, limit)
      .map((item) => toCard(item.product, colorId)),
    totalMatching: finalMatched.length,
    onSaleOnly,
    includedOutOfStock: usedOutOfStock,
    ...(onSaleOnly
      ? {
          onSaleTotal: onSaleProducts.length,
          onSaleInStock,
          onSaleOutOfStock,
        }
      : {}),
  };
}

export async function getCatalogStatsForChat() {
  const [products, discounts] = await Promise.all([
    listProducts(),
    listDiscounts(),
  ]);
  const priced = applyDiscountsToProducts(products, discounts);

  let inStock = 0;
  let outOfStock = 0;
  let onSaleTotal = 0;
  let onSaleInStock = 0;
  let onSaleOutOfStock = 0;

  const byCategory = new Map<
    string,
    { total: number; inStock: number; outOfStock: number }
  >();

  for (const product of priced) {
    const stocked = product.inStock !== false;
    if (stocked) inStock += 1;
    else outOfStock += 1;

    const onSale = Boolean(product.discount && product.discount > 0);
    if (onSale) {
      onSaleTotal += 1;
      if (stocked) onSaleInStock += 1;
      else onSaleOutOfStock += 1;
    }

    const categoryName = product.category?.trim() || "Ostatné";
    const row = byCategory.get(categoryName) ?? {
      total: 0,
      inStock: 0,
      outOfStock: 0,
    };
    row.total += 1;
    if (stocked) row.inStock += 1;
    else row.outOfStock += 1;
    byCategory.set(categoryName, row);
  }

  return {
    total: priced.length,
    inStock,
    outOfStock,
    onSale: {
      total: onSaleTotal,
      inStock: onSaleInStock,
      outOfStock: onSaleOutOfStock,
    },
    byCategory: [...byCategory.entries()]
      .map(([categoryName, counts]) => ({
        category: categoryName,
        ...counts,
      }))
      .sort(
        (a, b) =>
          b.total - a.total || a.category.localeCompare(b.category, "sk"),
      ),
    reply_hint:
      "Použite tieto čísla. total = všetky produkty bez ohľadu na sklad. inStock / outOfStock = skladom / vypredané. onSale.total zahŕňa aj vypredané akcie; onSale.inStock len predajné. Ak sa pýtajú len na počet, stačí 1–3 vety, bez ** a odrážok.",
  };
}

function parsePriceNumber(price: string | undefined) {
  if (!price) return null;
  const n = Number(price.replace(/[^\d,.-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Nájde 2 produkty podľa názvu/dopytu a pripraví fakty na porovnanie. */
export async function compareProductsForChat(
  productA: string,
  productB: string,
): Promise<{
  products: ChatProductCard[];
  comparison: Record<string, unknown>;
}> {
  const [aResult, bResult] = await Promise.all([
    searchProductsForChat({
      query: productA,
      limit: 1,
      includeOutOfStock: true,
    }),
    searchProductsForChat({
      query: productB,
      limit: 1,
      includeOutOfStock: true,
    }),
  ]);

  const a = aResult.products[0];
  const b = bResult.products[0];
  const products = [a, b].filter(Boolean) as ChatProductCard[];

  if (!a || !b) {
    return {
      products,
      comparison: {
        foundA: Boolean(a),
        foundB: Boolean(b),
        ui_note:
          "Jeden alebo oba produkty sa nenašli. Povedzte to úprimne a navrhnite upraviť názvy; nevymýšľajte porovnanie.",
      },
    };
  }

  if (a.id === b.id) {
    return {
      products: [a],
      comparison: {
        sameProduct: true,
        ui_note:
          "Oba dopyty sedeli na ten istý produkt. Požiadajte o iný druhý produkt na porovnanie.",
      },
    };
  }

  const priceA = parsePriceNumber(a.price);
  const priceB = parsePriceNumber(b.price);
  let priceDiffEur: number | null = null;
  let cheaper: "A" | "B" | "equal" | null = null;
  if (priceA != null && priceB != null) {
    priceDiffEur = Math.round(Math.abs(priceA - priceB) * 100) / 100;
    cheaper =
      priceA < priceB ? "A" : priceB < priceA ? "B" : "equal";
  }

  return {
    products: [a, b],
    comparison: {
      a: {
        id: a.id,
        name: a.name,
        category: a.category,
        price: a.price,
        discount: a.discount ?? null,
        inStock: a.inStock,
        colors: a.availableColors ?? [],
      },
      b: {
        id: b.id,
        name: b.name,
        category: b.category,
        price: b.price,
        discount: b.discount ?? null,
        inStock: b.inStock,
        colors: b.availableColors ?? [],
      },
      sameCategory: a.category === b.category,
      cheaper,
      priceDiffEur,
      ui_note:
        "Karty oboch produktov sa zobrazia automaticky. Napíšte 2–4 krátke vety: v čom sa líšia (cena, kategória, farby, sklad). Nevypisujte zoznamy s **.",
    },
  };
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
