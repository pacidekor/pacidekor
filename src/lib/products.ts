export type ProductDetail = {
  title: string;
  content: string;
};

export type ProductColor = {
  id: string;
  label: string;
  hex: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: string;
  originalPrice?: string;
  discount?: number;
  image: string;
  hoverImage?: string;
  extraImages?: string[];
  category: string;
  colors?: ProductColor[];
  details: ProductDetail[];
};

const flowerDetails = (
  material: string,
  usage: string,
): ProductDetail[] => [
  {
    title: "Materiál",
    content: material,
  },
  {
    title: "Použitie",
    content: usage,
  },
  {
    title: "Doprava",
    content:
      "Objednávky expedujeme do 24 hodín. Doručenie kuriérom obvykle do 1-2 pracovných dní na Slovensku.",
  },
];

export const products: Product[] = [
  {
    id: "1",
    slug: "kytica-cerveny-ruzi",
    name: "Kytica červených ruží",
    description:
      "Hutná kytica realistických umelých červených ruží s tmavozelenými listami. Bohatý objem a sýta farba - ideálna do vázy, výkladu aj svadobných dekorácií.",
    price: "18,90 €",
    image: "/produkty_new/1.jpg",
    hoverImage: "/produkty_new/1_2.jpg",
    extraImages: ["/produkty_new/1_3.jpg"],
    category: "Umelé kvety",
    details: flowerDetails(
      "Okvetné lístky z kvalitného textilu a plastu, stonky s ohybným drôtom pre jednoduché tvarovanie.",
      "Vhodná do váz, výkladov, svadobných aranžmánov aj celoročných dekorácií.",
    ),
  },
  {
    id: "2",
    slug: "kytica-bielych-pivonii",
    name: "Kytica bielych pivónií",
    description:
      "Romantická kytica umelých bielych pivónií s bohatými okvetnými lístkami a zeleným lístím. Jemná, luxusná a vždy svieža - ideálna do vázy aj svadobných aranžmánov.",
    price: "21,90 €",
    image: "/produkty_new/2.jpg",
    hoverImage: "/produkty_new/2_2.jpg",
    extraImages: ["/produkty_new/2_3.jpg"],
    category: "Umelé kvety",
    details: flowerDetails(
      "Okvetné lístky z kvalitného textilu a plastu, stonky s ohybným drôtom pre jednoduché tvarovanie.",
      "Vhodná do váz, výkladov, svadobných aranžmánov aj celoročných dekorácií.",
    ),
  },
  {
    id: "3",
    slug: "kytica-staroruzovych-ruzi",
    name: "Kytica staroružových ruží",
    description:
      "Jemná kytica drobných umelých ruží v staroružovom odtieni s bobuľkami a zelenými listami. Vintage charakter, ktorý ladí do vázy aj romantických aranžmánov.",
    price: "16,90 €",
    image: "/produkty_new/3.jpg",
    hoverImage: "/produkty_new/3_2.jpg",
    extraImages: ["/produkty_new/3_3.jpg"],
    category: "Umelé kvety",
    details: flowerDetails(
      "Okvetné lístky z kvalitného textilu a plastu, stonky s ohybným drôtom pre jednoduché tvarovanie.",
      "Vhodná do váz, výkladov, svadobných aranžmánov aj celoročných dekorácií.",
    ),
  },
  {
    id: "4",
    slug: "umely-vres-fialovy",
    name: "Umelý vres fialový",
    description:
      "Previsnutá vetvička umelého fialového vresu s drobnými kvetmi a jemným lístím. Ideálna výplň do aranžmánov, vencov aj do vázy - romantický, prírodný vzhľad bez údržby.",
    price: "9,90 €",
    image: "/produkty_new/4.jpg",
    hoverImage: "/produkty_new/4_2.jpg",
    extraImages: ["/produkty_new/4_3.jpg"],
    category: "Umelé kvety",
    details: flowerDetails(
      "Drobné kvety a ihličkovité lístie z odolného plastu, ohybná stonka pre jednoduché tvarovanie.",
      "Výplň do kytic, vencov, výkladov a celoročných dekorácií.",
    ),
  },
  {
    id: "5",
    slug: "kytica-zelene-s-bielymi-kvietkami",
    name: "Kytica zelene s bielymi kvietkami",
    description:
      "Svieža umelá kytica zelene so sukulentmi, eukalyptom a drobnými bielymi kvietkami. Moderný, prírodný vzhľad - ideálna do vázy aj ako výplň do aranžmánov.",
    price: "14,90 €",
    image: "/produkty_new/5.jpg",
    hoverImage: "/produkty_new/5_2.jpg",
    extraImages: ["/produkty_new/5_3.jpg"],
    category: "Umelé kvety",
    details: flowerDetails(
      "Listy a kvety z kvalitného plastu a textilu, stonky s ohybným drôtom pre jednoduché tvarovanie.",
      "Vhodná do váz, výkladov, stolových dekorácií a moderných zelených aranžmánov.",
    ),
  },
  {
    id: "6",
    slug: "kytica-staroruzovych-pivonii",
    name: "Kytica staroružových pivónií",
    description:
      "Bohatá kytica umelých pivónií v staroružovom odtieni s plnými okvetnými lístkami. Romantická a luxusná - ideálna do vázy aj svadobných dekorácií.",
    price: "17,90 €",
    originalPrice: "24,90 €",
    discount: 28,
    image: "/akcie_new/1.jpg",
    hoverImage: "/akcie_new/1_2.jpg",
    extraImages: ["/akcie_new/1_3.jpg"],
    category: "Umelé kvety",
    details: flowerDetails(
      "Okvetné lístky z kvalitného textilu a plastu, stonky s ohybným drôtom pre jednoduché tvarovanie.",
      "Vhodná do váz, výkladov, svadobných aranžmánov aj celoročných dekorácií.",
    ),
  },
  {
    id: "7",
    slug: "umely-eukalyptus-vetvicka",
    name: "Umelý eukalyptus",
    description:
      "Zväzok umelého eukalyptu s okrúhlymi listami v sivozelenom odtieni. Prirodzený vzhľad - ideálna výplň do aranžmánov, vencov aj samostatne do vázy.",
    price: "7,90 €",
    originalPrice: "11,90 €",
    discount: 34,
    image: "/akcie_new/2.jpg",
    hoverImage: "/akcie_new/2_2.jpg",
    extraImages: ["/akcie_new/2_3.jpg"],
    category: "Umelé kvety",
    details: flowerDetails(
      "Listy z odolného plastu s realistickou kresbou, ohybné stonky pre jednoduché tvarovanie.",
      "Výplň do kytic, vencov, výkladov a moderných zelených aranžmánov.",
    ),
  },
  {
    id: "8",
    slug: "umela-paprad",
    name: "Umelá papraď",
    description:
      "Svieža umelá papraď s jemnými perovitými listami a realistickými závitkami. Bohatá zelená výplň do aranžmánov, vencov aj samostatne do vázy.",
    price: "6,90 €",
    originalPrice: "9,90 €",
    discount: 30,
    image: "/akcie_new/3.jpg",
    hoverImage: "/akcie_new/3_2.jpg",
    extraImages: ["/akcie_new/3_3.jpg"],
    category: "Umelé kvety",
    details: flowerDetails(
      "Listy z odolného plastu s realistickou kresbou, ohybné stonky pre jednoduché tvarovanie.",
      "Výplň do kytic, vencov, výkladov a zelených aranžmánov.",
    ),
  },
  {
    id: "9",
    slug: "kytica-bordovych-dalii",
    name: "Kytica bordových dálií",
    description:
      "Hutná kytica umelých bordových dálií s jemnými doplnkovými kvietkami a zeleným lístím. Bohatý objem a sýta farba - ideálna do vázy aj formálnych aranžmánov.",
    price: "15,90 €",
    originalPrice: "22,90 €",
    discount: 31,
    image: "/akcie_new/4.jpg",
    hoverImage: "/akcie_new/4_2.jpg",
    extraImages: ["/akcie_new/4_3.jpg"],
    category: "Umelé kvety",
    details: flowerDetails(
      "Okvetné lístky z kvalitného textilu a plastu, stonky s ohybným drôtom pre jednoduché tvarovanie.",
      "Vhodná do váz, výkladov, svadobných aranžmánov aj celoročných dekorácií.",
    ),
  },
  {
    id: "10",
    slug: "kytica-ruzovych-pivonii",
    name: "Kytica ružových pivónií",
    description:
      "Romantická kytica umelých pivónií v jemných ružových a broskyňových odtieňoch. Bohaté kvety s doplnkovými kvietkami - ideálna do vázy aj svadobných dekorácií.",
    price: "18,90 €",
    originalPrice: "26,90 €",
    discount: 30,
    image: "/akcie_new/5.jpg",
    hoverImage: "/akcie_new/5_2.jpg",
    extraImages: ["/akcie_new/5_3.jpg"],
    category: "Umelé kvety",
    details: flowerDetails(
      "Okvetné lístky z kvalitného textilu a plastu, stonky s ohybným drôtom pre jednoduché tvarovanie.",
      "Vhodná do váz, výkladov, svadobných aranžmánov aj celoročných dekorácií.",
    ),
  },
];

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}

export function getProductGallery(product: Product): string[] {
  return [
    product.image,
    ...(product.hoverImage ? [product.hoverImage] : []),
    ...(product.extraImages ?? []),
  ];
}

export function getRelatedProducts(slug: string, count = 4) {
  const others = products.filter((product) => product.slug !== slug);
  const start = products.findIndex((product) => product.slug === slug);
  const offset = start >= 0 ? start % others.length : 0;
  const related: Product[] = [];

  for (let i = 0; i < Math.min(count, others.length); i++) {
    related.push(others[(offset + i) % others.length]);
  }

  return related;
}

export function productHref(slug: string) {
  return `/produkt/${slug}`;
}

export const novinkySlugs = [
  "kytica-cerveny-ruzi",
  "kytica-bielych-pivonii",
  "kytica-staroruzovych-ruzi",
  "umely-vres-fialovy",
  "kytica-zelene-s-bielymi-kvietkami",
] as const;

export const akciaSlugs = [
  "kytica-staroruzovych-pivonii",
  "umely-eukalyptus-vetvicka",
  "umela-paprad",
  "kytica-bordovych-dalii",
  "kytica-ruzovych-pivonii",
] as const;

export function getProductsBySlugs(slugs: readonly string[]) {
  return slugs
    .map((slug) => getProductBySlug(slug))
    .filter((product): product is Product => Boolean(product));
}

export function getProductsByCategory(category: string) {
  return products.filter((product) => product.category === category);
}
