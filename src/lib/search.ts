import type { Product } from "@/lib/products";
import {
  nearestFilterColor,
  parseCustomColorId,
} from "@/lib/products";
import { getProductCatalog } from "@/lib/product-catalog";
import {
  filterColors,
  getPackagingFormatById,
  getSubcategoryById,
} from "@/lib/taxonomy";
import { getAdminDruhById } from "@/lib/admin-categories-store";

export const popularSearches = [
  "Pivónie",
  "Ruže",
  "Eukalyptus",
  "Vence",
  "Stuhy",
  "Dekorácie",
] as const;

/** Lowercase + strip diacritics (ruža / ruza / růže → ruza/ruze). */
export function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** SKU-friendly: ignore spaces/dashes so `PD-J4` ≈ `pdj4`. */
export function normalizeSearchCode(value: string) {
  return normalizeSearchText(value).replace(/[\s\-_./]/g, "");
}

/** Soft stem for SK/CZ word forms: ruže→ruz, pivónií→pivon, … */
function softStem(word: string) {
  const w = normalizeSearchText(word);
  if (w.length <= 3) return w;

  const stripped = w.replace(
    /(ovych|ovymi|ovyma|ovym|oveho|ovej|ovou|ovymi|ovych|ych|ymi|ami|ach|ieh|iom|ii|ie|ia|iu|ou|om|ej|ov|y|e|a|u|i)$/,
    "",
  );

  if (stripped.length >= 3) return stripped;
  return w.slice(0, Math.max(3, w.length - 1));
}

function tokenize(value: string) {
  return normalizeSearchText(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0);
}

/** Related roots so “Ruže” also hits “ruží / ružových”. */
const SEARCH_ALIASES: Record<string, string[]> = {
  ruze: ["ruza", "ruzi", "ruzov", "ruz"],
  ruza: ["ruze", "ruzi", "ruzov", "ruz"],
  pivonie: ["pivonia", "pivonii", "pivon"],
  eukalyptus: ["eukalypt"],
  vence: ["venec", "vencov", "vencove"],
  stuhy: ["stuha", "stuh"],
  dekoracie: ["dekoracia", "dekor"],
  daliie: ["dalia", "dalii"],
  dalie: ["dalia", "dalii"],
  vres: ["vresu", "vresy"],
  paprad: ["paprade", "paprade"],
};

function expandQueryTokens(query: string): string[] {
  const tokens = tokenize(query);
  const expanded = new Set<string>();

  for (const token of tokens) {
    expanded.add(token);
    expanded.add(softStem(token));

    for (const [key, aliases] of Object.entries(SEARCH_ALIASES)) {
      if (
        token === key ||
        softStem(token) === softStem(key) ||
        aliases.some(
          (alias) =>
            token === alias ||
            softStem(token) === softStem(alias) ||
            (token.length >= 4 &&
              (token.startsWith(alias) || alias.startsWith(token))),
        )
      ) {
        expanded.add(key);
        expanded.add(softStem(key));
        for (const alias of aliases) {
          expanded.add(alias);
          expanded.add(softStem(alias));
        }
      }
    }
  }

  return [...expanded].filter((token) => token.length >= 2);
}

/**
 * Tight stem match for product names / druh — avoids “ruže” ≈ “ružový”.
 * Allows ruza/ruze (same stem) and short inflection diffs (≤1 char).
 */
function stemsMatchTight(a: string, b: string) {
  const na = normalizeSearchText(a);
  const nb = normalizeSearchText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  const sa = softStem(na);
  const sb = softStem(nb);
  if (sa === sb) return true;
  if (sa.length < 3 || sb.length < 3) return false;

  const longer = sa.length >= sb.length ? sa : sb;
  const shorter = sa.length >= sb.length ? sb : sa;
  if (!longer.startsWith(shorter)) return false;
  return longer.length - shorter.length <= 1;
}

/** Looser relatedness for category / packaging — still no short-stem-in-adjective. */
function tokensRelatedLoose(a: string, b: string) {
  if (stemsMatchTight(a, b)) return true;
  const na = normalizeSearchText(a);
  const nb = normalizeSearchText(b);
  if (na.length >= 4 && nb.includes(na)) return true;
  if (nb.length >= 4 && na.includes(nb)) return true;
  return false;
}

function getDruhHaystack(product: Product): string[] {
  if (!product.druhId) return [];
  const id = product.druhId;
  const parts = [
    id,
    id.replace(/[-_]+/g, " "),
    ...id.split(/[-_]+/),
  ].filter(Boolean);

  const fromStore = getAdminDruhById(product.druhId);
  if (fromStore?.label) {
    parts.push(fromStore.label, ...fromStore.label.split(/\s+/));
  }

  return parts;
}

/**
 * Higher = better. Name / druh / SKU beat color & packaging so
 * “ruže” ranks “Ruža …” above “Eukalyptus ružový”.
 */
export function scoreProductSearch(query: string, product: Product): number {
  const q = normalizeSearchText(query);
  if (!q) return 0;

  const name = normalizeSearchText(product.name);
  const nameTokens = tokenize(product.name);
  const queryTokens = tokenize(query);
  const expanded = expandQueryTokens(query);
  const sku = normalizeSearchText(product.sku ?? "");
  const skuCode = normalizeSearchCode(product.sku ?? "");
  const qCode = normalizeSearchCode(query);

  let score = 0;

  if (name === q) return 1000;
  if (sku && (sku === q || (qCode.length >= 2 && skuCode === qCode))) {
    return 980;
  }

  if (name.startsWith(q)) score = Math.max(score, 940);

  const firstToken = nameTokens[0] ?? "";
  for (const qt of expanded) {
    if (stemsMatchTight(qt, firstToken)) {
      score = Math.max(score, 920);
      break;
    }
  }

  const druhParts = getDruhHaystack(product);
  if (druhParts.length > 0) {
    for (const qt of expanded) {
      if (druhParts.some((part) => stemsMatchTight(qt, part))) {
        score = Math.max(score, 910);
        break;
      }
    }
  }

  for (const qt of expanded) {
    if (nameTokens.some((token) => stemsMatchTight(qt, token))) {
      score = Math.max(score, 860);
      break;
    }
  }

  if (name.includes(q) && q.length >= 3) {
    score = Math.max(score, 720);
  }

  if (sku) {
    if (sku.startsWith(q) || (qCode.length >= 2 && skuCode.startsWith(qCode))) {
      score = Math.max(score, 880);
    } else if (
      sku.includes(q) ||
      (qCode.length >= 2 && skuCode.includes(qCode))
    ) {
      score = Math.max(score, 800);
    }
  }

  const category = normalizeSearchText(product.category);
  for (const qt of expanded) {
    if (tokensRelatedLoose(qt, category)) {
      score = Math.max(score, 420);
      break;
    }
  }

  const sub = getSubcategoryById(product.subcategoryId);
  if (sub) {
    const subNorm = normalizeSearchText(sub.label);
    const subId = normalizeSearchText(sub.id);
    for (const qt of expanded) {
      if (tokensRelatedLoose(qt, subNorm) || tokensRelatedLoose(qt, subId)) {
        score = Math.max(score, 480);
        break;
      }
    }
  }

  // Color / packaging: weak signal only — never outranks name/druh hits.
  // Use raw query tokens (not ultra-short stems) to avoid ruže → ružový.
  const colorIds = product.attributes?.colors ?? [];
  for (const qt of queryTokens) {
    if (qt.length < 4) continue;
    const colorHit = colorIds.some((colorId) => {
      const custom = parseCustomColorId(colorId);
      if (custom) {
        const label = normalizeSearchText(custom.label);
        return (
          stemsMatchTight(qt, label) ||
          (label.length >= 4 && label.startsWith(qt))
        );
      }
      const color = filterColors.find((item) => item.id === colorId);
      if (!color) return stemsMatchTight(qt, colorId);
      return (
        stemsMatchTight(qt, color.id) ||
        stemsMatchTight(qt, color.label) ||
        (normalizeSearchText(color.label).length >= 4 &&
          normalizeSearchText(color.label).startsWith(qt))
      );
    });
    if (colorHit) {
      score = Math.max(score, 180);
      break;
    }
  }

  const packaging = product.attributes?.packaging ?? [];
  for (const qt of queryTokens) {
    if (qt.length < 3) continue;
    const packHit = packaging.some((option) => {
      const format = getPackagingFormatById(option.id);
      const customLabel = option.label?.trim();
      if (customLabel && tokensRelatedLoose(qt, customLabel)) return true;
      if (!format) return tokensRelatedLoose(qt, option.id);
      return (
        tokensRelatedLoose(qt, format.id) ||
        tokensRelatedLoose(qt, format.label)
      );
    });
    if (packHit) {
      score = Math.max(score, 160);
      break;
    }
  }

  // Nearest-filter color label (custom hex) — same weak tier
  if (score < 200) {
    for (const qt of queryTokens) {
      if (qt.length < 4) continue;
      const nearHit = colorIds.some((colorId) => {
        const custom = parseCustomColorId(colorId);
        if (!custom) return false;
        const near = nearestFilterColor(custom.hex).color.label;
        return stemsMatchTight(qt, near);
      });
      if (nearHit) {
        score = Math.max(score, 170);
        break;
      }
    }
  }

  return score;
}

export function productMatchesSearchQuery(
  product: Product,
  query: string,
): boolean {
  const q = query.trim();
  if (!q) return true;
  return scoreProductSearch(q, product) > 0;
}

/** Filter + rank any product list (admin pickers, šablóny, …). */
export function filterProductsBySearchQuery(
  products: Product[],
  query: string,
): Product[] {
  const q = query.trim();
  if (!q) return products;

  return products
    .map((product) => ({
      product,
      score: scoreProductSearch(q, product),
    }))
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.product.name.localeCompare(b.product.name, "sk"),
    )
    .map((item) => item.product);
}

/** Ranked product suggestions for the storefront search bar. */
export function searchProducts(query: string, limit = 8): Product[] {
  const q = normalizeSearchText(query);
  if (!q) return [];

  return filterProductsBySearchQuery(getProductCatalog(), query).slice(0, limit);
}
