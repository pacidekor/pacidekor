import { products, type Product } from "@/lib/products";

export const popularSearches = [
  "Pivónie",
  "Ruže",
  "Eukalyptus",
  "Vence",
  "Stuhy",
  "Dekorácie",
] as const;

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Soft stem for SK/CZ word forms: ruže→ruz, pivónií→pivon, … */
function softStem(word: string) {
  const w = normalizeSearch(word);
  if (w.length <= 3) return w;

  const stripped = w.replace(
    /(ovych|ovymi|ovyma|ovym|oveho|ovej|ovou|ovymi|ovych|ych|ymi|ami|ach|ieh|iom|ii|ie|ia|iu|ou|om|ej|ov|y|e|a|u|i)$/,
    "",
  );

  if (stripped.length >= 3) return stripped;
  return w.slice(0, Math.max(3, w.length - 1));
}

function tokenize(value: string) {
  return normalizeSearch(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0);
}

/** Related roots so “Ruže” also hits “ruží / ružových”. */
const SEARCH_ALIASES: Record<string, string[]> = {
  ruze: ["ruza", "ruzi", "ruzov", "ruz"],
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
            token.startsWith(alias) ||
            alias.startsWith(token) ||
            softStem(token) === softStem(alias),
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

function tokensRelated(a: string, b: string) {
  if (a === b) return true;
  if (a.length >= 3 && b.includes(a)) return true;
  if (b.length >= 3 && a.includes(b)) return true;

  const stemA = softStem(a);
  const stemB = softStem(b);
  if (stemA.length >= 3 && stemB.length >= 3) {
    if (stemA === stemB) return true;
    if (stemA.startsWith(stemB) || stemB.startsWith(stemA)) return true;
  }

  const minLen = Math.min(a.length, b.length);
  if (minLen < 3) return false;

  let shared = 0;
  while (shared < minLen && a[shared] === b[shared]) shared += 1;
  return shared >= 3 && shared >= minLen - 1;
}

function scoreProduct(query: string, product: Product) {
  const q = normalizeSearch(query);
  if (!q) return 0;

  const name = normalizeSearch(product.name);
  const category = normalizeSearch(product.category);
  const nameTokens = tokenize(product.name);
  const queryTokens = expandQueryTokens(query);

  if (name === q) return 100;
  if (name.startsWith(q)) return 90;
  if (name.includes(q)) return 75;

  let matched = 0;
  for (const qToken of queryTokens) {
    if (nameTokens.some((token) => tokensRelated(qToken, token))) {
      matched += 1;
      continue;
    }
    if (category && tokensRelated(qToken, category)) {
      matched += 0.5;
    }
  }

  if (matched <= 0) return 0;

  const coverage = matched / Math.max(1, tokenize(query).length);
  return Math.round(35 + coverage * 40);
}

/** Ranked product suggestions for the search bar. */
export function searchProducts(query: string, limit = 8): Product[] {
  const q = normalizeSearch(query);
  if (!q) return [];

  return products
    .map((product) => ({ product, score: scoreProduct(query, product) }))
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.product.name.localeCompare(b.product.name, "sk"),
    )
    .slice(0, limit)
    .map((item) => item.product);
}
