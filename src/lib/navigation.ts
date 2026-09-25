export const categories = [
  "Umelé kvety",
  "Sušina",
  "Stuhy",
  "Aranž. materiál",
  "Obalový materiál",
  "Keramika",
  "Vencové základy",
  "Košíky",
  "Svietniky",
  "Flowerboxy",
] as const;

export type CategoryLabel = (typeof categories)[number];

export type Category = {
  label: CategoryLabel;
  slug: string;
  image: string;
  description: string;
};

export function toSlug(label: string) {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Stable slugs that must not change when the display label is tweaked. */
const categorySlugOverrides: Partial<Record<CategoryLabel, string>> = {
  "Aranž. materiál": "aranz-material",
};

/** Older public URLs that should still resolve after renames. */
const categorySlugAliases: Record<string, CategoryLabel> = {
  aranzerstvo: "Aranž. materiál",
};

/** Public category URL — prefer stable DB id when available. */
export function categoryHref(labelOrId: string) {
  const aliased = categorySlugAliases[labelOrId];
  if (aliased) {
    const override =
      categorySlugOverrides[aliased] ?? toSlug(aliased);
    return `/kategorie/${override}`;
  }
  const override =
    categorySlugOverrides[labelOrId as CategoryLabel] ?? toSlug(labelOrId);
  return `/kategorie/${override}`;
}

export function categoryHrefById(id: string) {
  return `/kategorie/${id}`;
}

const categoryImages: Record<CategoryLabel, string> = {
  "Umelé kvety": "/kategorie/umelekvety.webp",
  Sušina: "/kategorie/susina.webp",
  Stuhy: "/kategorie/stuhy.webp",
  "Aranž. materiál": "/kategorie/aranzerskymaterial.webp",
  "Obalový materiál": "/kategorie/obalovymaterial.webp",
  Keramika: "/kategorie/keramika-new.webp",
  "Vencové základy": "/kategorie/vencovezaklady.webp",
  Košíky: "/kategorie/kosiky.webp",
  Svietniky: "/kategorie/svietniky.webp",
  Flowerboxy: "/kategorie/dekoracie.webp",
};

const categoryDescriptions: Record<CategoryLabel, string> = {
  "Umelé kvety":
    "Realistické umelé kvety do váz, aranžmánov a celoročných dekorácií.",
  Sušina: "Prírodná sušina a stabilizované rastliny pre rustikálne aj moderné aranžmány.",
  Stuhy: "Saténové, organzové a dekoračné stuhy na balenie, mašle a floristiku.",
  "Aranž. materiál":
    "Aranžérsky materiál a pomôcky pre profesionálnu aj domácu tvorbu.",
  "Obalový materiál":
    "Papier, fólie a obaly na kytice, darčeky a sezónne balenie.",
  Keramika: "Keramické vázy, misky a nádoby, ktoré dotvoria každý aranžmán.",
  "Vencové základy":
    "Základy a polotovary na vence - pripravené na vašu dekoráciu.",
  Košíky: "Prútené a dekoračné košíky na aranžmány, dary aj sezónnu výzdobu.",
  Svietniky: "Svietniky a stojany na sviečky pre atmosféru každého priestoru.",
  Flowerboxy:
    "Darčekové a kvetinové boxy – okrúhle, srdcové, tašky a ďalšie tvary na aranžmány.",
};

export const categoryList: Category[] = categories.map((label) => ({
  label,
  slug: categorySlugOverrides[label] ?? toSlug(label),
  image: categoryImages[label],
  description: categoryDescriptions[label],
}));

export function getCategoryBySlug(slug: string) {
  const aliased = categorySlugAliases[slug];
  if (aliased) {
    return categoryList.find((category) => category.label === aliased);
  }
  return categoryList.find((category) => category.slug === slug);
}

export const navItems = [
  { label: "Novinky", href: "/novinky" },
  { label: "Akcia", href: "/akcia" },
  { label: "Bestsellery", href: "/bestsellery" },
  { label: "Výpredaj", href: "/vypredaj" },
  { label: "Blog", href: "/blog" },
  { label: "O nás", href: "/o-nas" },
  { label: "Kontakt", href: "/kontakt" },
] as const;

export const footerShopLinks = [
  { label: "Novinky", href: "/novinky" },
  { label: "Akcia", href: "/akcia" },
  { label: "Výpredaj", href: "/vypredaj" },
  { label: "Blog", href: "/blog" },
  { label: "O nás", href: "/o-nas" },
] as const;

export const footerLinkItems = [
  { label: "Obchodné podmienky", href: "/obchodne-podmienky" },
  {
    label: "Zásady spracúvania osobných údajov",
    href: "/ochrana-udajov",
  },
  { label: "Nastavenia Cookies", href: "/cookies" },
  { label: "Odstúpenie od zmluvy", href: "/odstupenie-od-zmluvy" },
] as const;
