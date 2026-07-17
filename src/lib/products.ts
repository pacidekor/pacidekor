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
    slug: "umela-ruza-bozska",
    name: "Umelá ruža božská",
    description:
      "Realistická umelá ruža s jemnými okvetnými lístkami. Ideálna do vázy, aranžmánov aj svadobných dekorácií - vždy krásna, bez údržby.",
    price: "4,90 €",
    image: "/produkty/produkt1.webp",
    category: "Umelé kvety",
    details: flowerDetails(
      "Okvetné lístky z kvalitného textilu a plastu, stonka s ohybným drôtom pre jednoduché tvarovanie.",
      "Vhodná do váz, vencov, svadobných kytic aj celoročných dekorácií.",
    ),
  },
  {
    id: "2",
    slug: "umela-pivonia-biela",
    name: "Umelá pivónia biela",
    description:
      "Bujná biela pivónia s bohatým kvetom. Dodá aranžmánu jemnosť a romantický charakter - perfektná do svadieb aj domova.",
    price: "6,50 €",
    image: "/produkty/produkt2.webp",
    category: "Umelé kvety",
    details: flowerDetails(
      "Textilné okvetné lístky s jemnou textúrou, stonka s ohybným drôtom.",
      "Skvelá do svadobných aranžmánov, stolových dekorácií a sezónnych výzdob.",
    ),
  },
  {
    id: "3",
    slug: "umely-eukalyptus",
    name: "Umelý eukalyptus",
    description:
      "Zelený eukalyptus na vyplnenie aranžmánov a vencov. Prirodzený vzhľad, ktorý ladí s kvetmi aj sušinou.",
    price: "3,20 €",
    image: "/produkty/produkt3.webp",
    category: "Umelé kvety",
    details: flowerDetails(
      "Listy z odolného plastu s realistickou kresbou, ohybná stonka.",
      "Výplň do kytic, vencov a moderných zelených aranžmánov.",
    ),
  },
  {
    id: "4",
    slug: "umela-hortenzia",
    name: "Umelá hortenzia",
    description:
      "Veľká umelá hortenzia s plným kvetom. Dominanta každej kytice - bohatý objem a dlhodobá krása.",
    price: "8,90 €",
    image: "/produkty/produkt4.webp",
    category: "Umelé kvety",
    details: flowerDetails(
      "Kombinácia textilu a plastu pre realistický vzhľad a trvanlivosť.",
      "Hlavný kvet do veľkých aranžmánov, váz a svadobných dekorácií.",
    ),
  },
  {
    id: "5",
    slug: "umela-orchidea",
    name: "Umelá orchidea",
    description:
      "Elegantná umelá orchidea pre moderný interiér. Sofistikovaný vzhľad bez starostlivosti o živú rastlinu.",
    price: "7,40 €",
    image: "/produkty/produkt5.webp",
    category: "Umelé kvety",
    details: flowerDetails(
      "Okvetné lístky z kvalitného plastu, stonka s ohybným drôtom.",
      "Vhodná do váz, hotelových a kancelárskych priestorov aj domácností.",
    ),
  },
  {
    id: "6",
    slug: "umela-ruza-cervena",
    name: "Umelá ruža červená",
    description:
      "Klasická červená umelá ruža s realistickým detailom. Nadčasová voľba do romantických aj formálnych aranžmánov.",
    price: "4,90 €",
    originalPrice: "6,90 €",
    discount: 29,
    image: "/produkty/akcie/akcia1.webp",
    category: "Umelé kvety",
    details: flowerDetails(
      "Textilné okvetné lístky, stonka s ohybným drôtom.",
      "Ideálna do kytic, vencov a celoročných dekorácií.",
    ),
  },
  {
    id: "7",
    slug: "umely-tulipan-kremovy",
    name: "Umelý tulipán krémový",
    description:
      "Jemný krémový tulipán - jar v každom aranžmáne. Jednoduchý, elegantný tvar, ktorý nikdy nevyjde z módy.",
    price: "3,60 €",
    originalPrice: "5,40 €",
    discount: 33,
    image: "/produkty/akcie/akcia2.webp",
    category: "Umelé kvety",
    details: flowerDetails(
      "Kvalitný plast a textil, ohybná stonka na tvarovanie.",
      "Jarné aranžmány, stolové dekorácie a sezónne výzdoby.",
    ),
  },
  {
    id: "8",
    slug: "umela-slnecnica-zlta",
    name: "Umelá slnečnica žltá",
    description:
      "Veselá žltá slnečnica, ktorá rozjasní každý priestor. Silný vizuálny akcent do letných a jesenných dekorácií.",
    price: "4,80 €",
    originalPrice: "7,20 €",
    discount: 33,
    image: "/produkty/akcie/akcia3.webp",
    category: "Umelé kvety",
    details: flowerDetails(
      "Odolný plast s realistickou textúrou, pevná stonka.",
      "Letné a jesenné aranžmány, farmárske a rustikálne dekorácie.",
    ),
  },
  {
    id: "9",
    slug: "satenova-stuha-bordo-5cm",
    name: "Saténová stuha 5 cm",
    description:
      "Lesklá saténová stuha šírky 5 cm na balenie darčekov, mašle a aranžérske práce. Vyberte si farbu podľa vášho projektu.",
    price: "2,50 €",
    originalPrice: "3,90 €",
    discount: 36,
    image: "/produkty/akcie/akcia4.webp",
    category: "Stuhy",
    colors: [
      { id: "bordo", label: "Bordó", hex: "#6B2D3C" },
      { id: "zlata", label: "Zlatá", hex: "#C4A35A" },
      { id: "kremova", label: "Krémová", hex: "#E8DCC8" },
      { id: "zelena", label: "Olivová", hex: "#75825B" },
      { id: "cierna", label: "Čierna", hex: "#2f2924" },
    ],
    details: [
      {
        title: "Materiál",
        content:
          "Saténová stuha so saténovým leskom, šírka 5 cm. Pevná, dobre sa viaže a drží tvar mašle.",
      },
      {
        title: "Použitie",
        content:
          "Balenie darčekov, svadobné mašle, aranžmány, vencové dekorácie a sezónne výzdoby.",
      },
      {
        title: "Doprava",
        content:
          "Objednávky expedujeme do 24 hodín. Doručenie kuriérom obvykle do 1-2 pracovných dní na Slovensku.",
      },
    ],
  },
  {
    id: "10",
    slug: "darkovy-papier-kraft-10ks",
    name: "Dárkový papier kraft 10 ks",
    description:
      "Balenie 10 hárkov kraftového darčekového papiera. Prirodzený vzhľad, ideálny na balenie aj kreatívne projekty.",
    price: "5,90 €",
    originalPrice: "8,50 €",
    discount: 31,
    image: "/produkty/akcie/akcia5.webp",
    category: "Obalový materiál",
    details: [
      {
        title: "Materiál",
        content:
          "Kvalitný kraftový papier v prírodnom odtieni. Balenie obsahuje 10 hárkov.",
      },
      {
        title: "Použitie",
        content:
          "Balenie darčekov, floristické balenie kytic a DIY projekty.",
      },
      {
        title: "Doprava",
        content:
          "Objednávky expedujeme do 24 hodín. Doručenie kuriérom obvykle do 1-2 pracovných dní na Slovensku.",
      },
    ],
  },
];

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
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
  "umela-ruza-bozska",
  "umela-pivonia-biela",
  "umely-eukalyptus",
  "umela-hortenzia",
  "umela-orchidea",
] as const;

export const akciaSlugs = [
  "umela-ruza-cervena",
  "umely-tulipan-kremovy",
  "umela-slnecnica-zlta",
  "satenova-stuha-bordo-5cm",
  "darkovy-papier-kraft-10ks",
] as const;

export function getProductsBySlugs(slugs: readonly string[]) {
  return slugs
    .map((slug) => getProductBySlug(slug))
    .filter((product): product is Product => Boolean(product));
}

export function getProductsByCategory(category: string) {
  return products.filter((product) => product.category === category);
}
