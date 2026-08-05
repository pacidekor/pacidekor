export type BlogCategory =
  | "Inšpirácia"
  | "Tipy"
  | "Sezóna"
  | "Novinky"
  | "Ako na to";

export type BlogBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] };

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  category: BlogCategory;
  author: string;
  publishedAt: string;
  content: BlogBlock[];
};

export type BlogPostWithId = BlogPost & { id: string };

export const blogPosts: BlogPost[] = [
  {
    slug: "jaro-2026-trendy-v-dekoraciach",
    title: "Jarné trendy 2026: čo bude hrať prim v dekoráciách",
    excerpt:
      "Od jemných pastelov po bujné aranžmány - pozrite si, aké farby, materiály a formy budú tento rok dominovať vo výkladoch aj v domácnostiach.",
    coverImage: "/produkty_new/2.jpg",
    category: "Inšpirácia",
    author: "PACIDEKOR",
    publishedAt: "2026-03-12",

    content: [
      {
        type: "paragraph",
        text: "Jar je pre floristov a dekoratérov obdobím, kedy sa všetko rozbehne naplno. Zákazníci hľadajú sviežosť, svetlo a prírodu - a práve to by mal odrážať aj váš sortiment aj výklad.",
      },
      {
        type: "heading",
        text: "Farby, ktoré tento rok uspejú",
      },
      {
        type: "paragraph",
        text: "Namiesto ostrých kontrastov víťazia mäkké tóny: maslová žltá, sage zelená, pudrová ružová a tehlovo-terakotové akcenty. Skombinujte ich s bielou keramikou a prírodnou sušinou - vznikne kompozícia, ktorá pôsobí luxusne, ale nie chladne.",
      },
      {
        type: "list",
        items: [
          "Pastelové pivónie a ranunculus v hustých kyticiach",
          "Zelené listy a eukalyptus ako základ aranžmánov",
          "Keramické vázy v matných odtieňoch namiesto lesku",
          "Ľahké stuhy v prírodných farbách namiesto saténu",
        ],
      },
      {
        type: "heading",
        text: "Formy a materiály",
      },
      {
        type: "paragraph",
        text: "Populárne sú voľnejšie, „záhradné“ aranžmány - menej symetrie, viac pohybu. Umelé kvety s realistickou textúrou a ohybnými stonkami vám umožnia vytvoriť rovnaký dojem ako pri živých kvetoch, len s výhodou dlhej životnosti.",
      },
      {
        type: "paragraph",
        text: "Ak pripravujete sezónny výklad, zamerajte sa na jeden dominantný motív (napríklad biele pivónie) a okolo neho postavte doplnky - stuhy, košíky a svietniky. Menej produktov, ale jasnejší príbeh, predáva lepšie.",
      },
    ],
  },
  {
    slug: "ako-vybrat-umele-kvety-do-vazy",
    title: "Ako vybrať umelé kvety do vázy, aby vyzerali prirodzene",
    excerpt:
      "Realistický vzhľad nie je náhoda. Stačí dodržať pár pravidiel pri výbere výšky, farieb a hustoty - a výsledok bude ako z kvetinárstva.",
    coverImage: "/produkty_new/1.jpg",
    category: "Tipy",
    author: "PACIDEKOR",
    publishedAt: "2026-02-28",

    content: [
      {
        type: "paragraph",
        text: "Umelé kvety majú dnes kvalitu, o ktorej sa pred pár rokmi ani nesnívalo. Aj tak však platí: zlý výber alebo zlá kompozícia okamžite prezradí, že ide o dekoráciu. Tu je jednoduchý návod, ako sa tomu vyhnúť.",
      },
      {
        type: "heading",
        text: "Výška a proporcie",
      },
      {
        type: "paragraph",
        text: "Celková výška kytice by mala byť približne 1,5× výška vázy. Príliš krátke stonky pôsobia lacno, príliš dlhé zase nestabilne. Ohybné stonky sú výhodou - upravíte ich podľa konkrétnej nádoby.",
      },
      {
        type: "heading",
        text: "Mix textúr",
      },
      {
        type: "paragraph",
        text: "Kombinujte veľké kvety (ruže, pivónie) s drobnejšími a zelenými prvkami. Jedna farba v rôznych odtieňoch pôsobí elegantnejšie než dúha. Doplňte 1-2 listy eukalyptu alebo sušiny - priestor okamžite ožije.",
      },
      {
        type: "list",
        items: [
          "Začnite 3-5 hlavnými kvetmi",
          "Doplňte zelené lístie na vyplnenie",
          "Na záver pridajte jemný akcent (stuha, drobný kvet)",
          "Otočte aranžmán a skontrolujte ho zo všetkých strán",
        ],
      },
    ],
  },
  {
    slug: "velkonocne-aranzmany-pre-predajne",
    title: "Veľkonočné aranžmány, ktoré zaujmú vo výklade",
    excerpt:
      "Sezónny výklad nemusí byť preplnený. Ukážeme vám tri koncepty - od minimalistického po bohatý - ktoré fungujú v kvetinárstve aj v darčekovej predajni.",
    coverImage: "/kategorie/dekoracie.webp",
    category: "Sezóna",
    author: "PACIDEKOR",
    publishedAt: "2026-02-18",

    content: [
      {
        type: "paragraph",
        text: "Veľká noc je pre dekorácie jedným z najsilnejších období roka. Zákazníci hľadajú darčeky, výzdobu stola aj niečo „na výklad“. Kľúčom je jasný vizuálny príbeh - nie čo najviac produktov naraz.",
      },
      {
        type: "heading",
        text: "Tri koncepty výkladu",
      },
      {
        type: "list",
        items: [
          "Minimal: biele kvety, prírodná sušina, jedna keramická misa",
          "Rustikál: košíky, stuhy v ľanovej farbe, jarné umelé kvety",
          "Farebný accent: sage zelená + jemná žltá, svietniky a stuhy",
        ],
      },
      {
        type: "heading",
        text: "Čo mať vždy na sklade",
      },
      {
        type: "paragraph",
        text: "Venčekové základy, stuhy a drobné dekorácie sa predávajú rýchlo a majú dobrú maržu. Pripravené hotové aranžmány šetria čas zákazníkom - a vám prinášajú vyššiu priemernú hodnotu objednávky.",
      },
      {
        type: "paragraph",
        text: "V PACIDEKORe nájdete veľkoobchodný sortiment, z ktorého zostavíte celý sezónny koncept - od kvetov cez košíky až po obalový materiál.",
      },
    ],
  },
  {
    slug: "susina-v-modernom-interieri",
    title: "Sušina v modernom interiéri: menej prachu, viac štýlu",
    excerpt:
      "Sušené rastliny nie sú len rustikálna klasika. V správnej váze a kompozícii ladia aj s minimalistickým a škandinávskym interiérom.",
    coverImage: "/kategorie/susina.webp",
    category: "Inšpirácia",
    author: "PACIDEKOR",
    publishedAt: "2026-01-30",

    content: [
      {
        type: "paragraph",
        text: "Sušina zažíva comeback - a nie náhodou. Je udržateľná, dlhodobo krásna a pri správnom výbere pôsobí veľmi súčasne. Dôležité je vyhnúť sa preplneným „klasickým“ kyticiam a ísť cestou čistých línií.",
      },
      {
        type: "heading",
        text: "Ako ju skombinovať",
      },
      {
        type: "paragraph",
        text: "Vyberte si jednu dominantnú rastlinu (napríklad pampas alebo lagurus) a doplňte ju maximálne dvoma ďalšími druhmi. Váza by mala byť jednoduchá - matná keramika alebo sklo. Farby držte v neutrálnej palete: piesok, krém, sage, antracit.",
      },
      {
        type: "paragraph",
        text: "Tip pre predajne: pripravte hotové sety „sušina + váza“. Zákazník odchádza s kompletným riešením a vy predáte viac položiek naraz.",
      },
    ],
  },
  {
    slug: "obalovy-material-ktory-predava",
    title: "Obalový materiál, ktorý predáva: 5 tipov na balenie kytíc",
    excerpt:
      "Prvý dojem vzniká ešte pred odovzdaním kytice. Správny papier, stuha a detail dokážu zvýšiť vnímanú hodnotu aj pri bežnom aranžmáne.",
    coverImage: "/kategorie/obalovymaterial.webp",
    category: "Ako na to",
    author: "PACIDEKOR",
    publishedAt: "2026-01-15",

    content: [
      {
        type: "paragraph",
        text: "Krásna kytica v priemernom obale stráca polovicu efektu. Naopak - jednoduchšie aranžmán v prémiovom balení pôsobí draho. Tu je päť praktických tipov, ktoré fungujú vo veľkoobchode aj v maloobchode.",
      },
      {
        type: "list",
        items: [
          "Držte sa max. dvoch farieb papiera + jednej stuhy",
          "Koreň balenia utiahnite pevne, hornú časť nechajte voľnú",
          "Použite kvalitnú stuhu - lacný materiál spoľahlivo prezradí celok",
          "Pridajte malú visačku s logom alebo venovaním",
          "Majte na sklade 2-3 hotové „looky“ podľa sezóny",
        ],
      },
      {
        type: "heading",
        text: "Čo odporúčame mať vždy po ruke",
      },
      {
        type: "paragraph",
        text: "Kraft papier, jemný hodvábny papier v krémovej a sage farbe, saténové aj ľanové stuhy a priehľadné fólie na ochranu pri doprave. S týmto základom zvládnete 90 % bežných objednávok.",
      },
    ],
  },
  {
    slug: "nova-kolekcia-keramiky",
    title: "Nová kolekcia keramiky: vázy, ktoré unesú každý aranžmán",
    excerpt:
      "Predstavujeme keramické nádoby v matných odtieňoch - navrhnuté tak, aby vyzdvihli kvety, nie aby s nimi súťažili.",
    coverImage: "/kategorie/keramika-new.webp",
    category: "Novinky",
    author: "PACIDEKOR",
    publishedAt: "2025-12-08",

    content: [
      {
        type: "paragraph",
        text: "Dobrá váza je tichý hrdina každej kompozície. Preto sme do ponuky zaradili kolekciu matných keramických nádob v odtieňoch, ktoré ladia s našimi umelými kvetmi aj sušinou.",
      },
      {
        type: "heading",
        text: "Prečo matná keramika",
      },
      {
        type: "paragraph",
        text: "Lesklé povrchy odrážajú svetlo a často konkurujú kvetom. Matný povrch drží pozornosť na aranžmáne a pôsobí súčasne a prémiovo - ideálne do výkladov, hotelov aj domácností.",
      },
      {
        type: "paragraph",
        text: "Kolekciu nájdete v kategórii Keramika. Pri väčších odberoch radi pripravíme veľkoobchodnú ponuku na mieru.",
      },
    ],
  },
];

export function getPostBySlug(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}

export function getRelatedPosts(slug: string, limit = 3) {
  const current = getPostBySlug(slug);
  if (!current) return blogPosts.slice(0, limit);

  const sameCategory = blogPosts.filter(
    (post) => post.slug !== slug && post.category === current.category,
  );
  const others = blogPosts.filter(
    (post) => post.slug !== slug && post.category !== current.category,
  );

  return [...sameCategory, ...others].slice(0, limit);
}

export function formatBlogDate(isoDate: string) {
  const date = new Date(`${isoDate}T12:00:00`);
  return new Intl.DateTimeFormat("sk-SK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
