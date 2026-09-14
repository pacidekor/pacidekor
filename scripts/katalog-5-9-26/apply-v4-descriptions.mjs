/**
 * v4: content-first description rewrite + merge status downgrade + 144 neutral name.
 * Does not change photos, Farby ranges, IDs, or perform merges.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("katalog_raw/noveprodukty5.9.26-ready-v4");
const OUT = path.resolve("scripts/katalog-5-9-26/v4-reports");
fs.mkdirSync(OUT, { recursive: true });

const EM = /[\u2013\u2014\u2015\u2212]/g;
const BAD_DESC =
  /(biela|biel[aéy]|červen|ružov|fialov|zelen[aáey]|krémov|oranž|žlt|modr|hned|siv[aáey]|vínov|bordov|staroruž|losos|čier|marhuľ|hrdzav|zlat|čír|tmav[aáoý]|svetl[aáoý]|päť|štyri|šesť|sedem|osem|deväť|desať|\d+\s*ks|balenie po|\bstoniek\b|\bkvetov\b|\bhláv\b|\bkusov\b|niekoľko|rôznych farb|farebn[éeý] variant)/i;

const MECHANICAL =
  /Dekoratívny produkt\s*\(|Dekoratívny prírodný prvok\s*\(|Dekoratívny dekoračný|Dekoratívny echinacea|Dekoratívny artičoka|Dekoratívny umelá|vhodný do vázy alebo aranžmánu\. Jednoduchý doplnok|do floristických aranžmánov\. Hodí sa do vencov, väzieb/;

function noEm(s) {
  return String(s || "")
    .replace(EM, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function parseInfo(text) {
  const data = {};
  for (const line of text.replace(/\r\n/g, "\n").trim().split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    data[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return data;
}

function writeInfo(dir, fields) {
  const lines = [
    `Názov: ${noEm(fields.name)}`,
    `Popis: ${noEm(fields.description)}`,
    `Farby: ${fields.farby}`,
    `Druh: ${noEm(fields.druh)}`,
    `Kategória: ${noEm(fields.category)}`,
    `Subkategória: ${noEm(fields.subcategory)}`,
    `Zdrojová zložka: ${fields.sourceFolder}`,
  ];
  fs.writeFileSync(path.join(dir, "info.txt"), lines.join("\n") + "\n", "utf8");
}

/** Hand-written descriptions by ID. Only products that need rewrite or keep-good. */
const DESC = {
  // stem / bouquets
  1: "Umelá echinacea na stopke s výrazným stredom a okolitými lupienkami. Hodí sa do vázy alebo do floristických aranžmánov.",
  2: "Dekoratívna artičoka na stopke s šupinatým povrchom hlavy. Hodí sa do vázy a do moderných aranžmánov.",
  3: "Dekoratívne proso so súkvetím na tenkých stonkách. Hodí sa ako výplň do vencov a suchých väzieb.",
  4: "Hotová umelá kytica klinčekov pripravená do vázy. Hodí sa ako stolová dekorácia bez ďalšej úpravy.",
  5: "Hotová umelá kytica dálie pripravená do vázy. Hodí sa ako stolová dekorácia bez ďalšej úpravy.",
  6: "Umelý hyacint na stopke s hustým súkvetím. Hodí sa do vázy alebo do sezónnych aranžmánov.",
  7: "Umelý iskerník na stopke s plným okvetím. Hodí sa do vázy alebo do floristických aranžmánov.",
  8: "Umelá artičoka na stopke s detailne tvarovanou hlavou. Hodí sa do vázy a do moderných aranžmánov.",
  9: "Umelá alstroméria na stopke s charakteristickými škvrnitými lupienkami. Hodí sa do vázy alebo do kytíc.",
  10: "Umelá fiala na stopke s hustým súkvetím. Hodí sa do vázy alebo do floristických aranžmánov.",
  119: "Dekoratívna artičoka na stopke s šupinatým povrchom hlavy. Hodí sa do vázy a do moderných aranžmánov.",
  120: "Dekoratívny bodliak na stopke s ostnatou hlavou. Hodí sa do vázy a do rustikálnych aranžmánov.",
  134: "Dekoratívna artičoka na stopke s šupinatým povrchom hlavy. Hodí sa do vázy a do moderných aranžmánov.",
  108: "Dekoračný púčik na stopke vhodný do vázy alebo aranžmánu. Doplnok na jemné floristické väzby.",

  // flower heads - keep/improve natural sentences
  11: "Samostatná hlava umelej ruže na výrobu vencov a aranžmánov. Komponent bez stonky.",
  12: "Plná hlava klinčeka s hustými, nariasenými lupienkami. Hodí sa do vencov a floristických aranžmánov.",
  13: "Hlava umelej ruže so zvlnenými okrajmi lupienkov. Hodí sa na výrobu vencov a floristických aranžmánov.",
  14: "Hlava umelej ruže so zvlnenými okrajmi lupienkov. Hodí sa na výrobu vencov a floristických aranžmánov.",
  15: "Veľká otvorená hlava iskerníka s hustými vrstvami lupienkov. Hodí sa do vencov a floristických aranžmánov.",
  17: "Hlava hortenzie z hustého riaseného trsu. Hodí sa do vencov a objemných aranžmánov.",
  18: "Hlava hortenzie z hustého riaseného trsu. Hodí sa do vencov a objemných aranžmánov.",
  19: "Hlava pivónie s hustými, krátkymi vrstvami lupienkov. Hodí sa do vencov a floristických aranžmánov.",
  20: "Guľovitá hlava pomponu s hustým okvetím. Hodí sa do vencov a drobných aranžmánov.",
  21: "Hlava ruže s pravidelným spirálovým závitom. Hodí sa do vencov a floristických aranžmánov.",
  22: "Hlava ľalie s úzkymi vlnitými lupienkami. Hodí sa do vencov a smútočných aj sviatočných aranžmánov.",
  23: "Hlava dálie s úzkymi špicatými lupienkami. Hodí sa do vencov a výrazných aranžmánov.",
  24: "Samostatná hlava umelej ruže na výrobu vencov a aranžmánov. Komponent bez stonky.",
  25: "Hlava ruže s roztvorenými vonkajšími lupienkami. Hodí sa do vencov a floristických aranžmánov.",
  26: "Hlava hortenzie z hustého riaseného trsu. Hodí sa do vencov a objemných aranžmánov.",
  27: "Hlava pivónie so zvlnenými lupienkami. Hodí sa do vencov a floristických aranžmánov.",
  28: "Hlava ruže s lupienkami prehnutými dovnútra. Hodí sa do vencov a floristických aranžmánov.",
  29: "Hlava pivónie v pootvorenom pohárovom tvare. Hodí sa na výrobu vencov a floristických aranžmánov.",
  30: "Hlava pivónie s tenkými, načuchranými lupienkami. Hodí sa do vencov a floristických aranžmánov.",
  31: "Hlava artičoky s šupinatým povrchom. Hodí sa do vencov a moderných aranžmánov.",
  32: "Hlava ruže s lupienkami prehnutými dovnútra. Hodí sa do vencov a floristických aranžmánov.",
  33: "Takmer zatvorená hlava pivónie so širokými lupienkami. Hodí sa do vencov a floristických aranžmánov.",
  34: "Kompaktná hlava ruže so zvrásnenými lupienkami. Hodí sa do vencov a floristických aranžmánov.",
  35: "Kompaktná hlava ruže so zvrásnenými lupienkami. Hodí sa do vencov a floristických aranžmánov.",
  36: "Otvorená hlava ruže so zahnutými okrajmi lupienkov. Hodí sa do vencov a floristických aranžmánov.",
  37: "Hlava pivónie s guľovitým tvarom a pravidelnými lupienkami. Hodí sa do vencov a floristických aranžmánov.",
  38: "Otvorená hlava ruže so zahnutými okrajmi lupienkov. Hodí sa do vencov a floristických aranžmánov.",
  39: "Hlava pivónie s prehĺbeným, misovitým stredom. Hodí sa do vencov a floristických aranžmánov.",
  40: "Hlava pivónie so širokými lupienkami a voľnejšou stavbou. Hodí sa do vencov a floristických aranžmánov.",
  41: "Dekoratívna hlava chryzantémy s guľovitým tvarom a husto usporiadanými lupienkami. Hodí sa na tvorbu vencov a kvetinových aranžmánov.",
  42: "Hlava magnólie so širokými okvetnými lístkami. Hodí sa do vencov a elegantných aranžmánov.",
  43: "Guľovitá hlava ruže s uzatvoreným stredom. Hodí sa do vencov a floristických aranžmánov.",
  44: "Hlava kaly s lievikovitým tvarom. Hodí sa do vencov a smútočných aj svadobných aranžmánov.",
  45: "Hlava kaly s lievikovitým tvarom a kontrastným stredom. Hodí sa do vencov a floristických aranžmánov.",
  46: "Guľovitá hlava ruže s uzatvoreným stredom. Hodí sa do vencov a floristických aranžmánov.",
  47: "Samostatná hlava umelej ruže na výrobu vencov a aranžmánov. Komponent bez stonky.",
  48: "Hlava ľalie so širokými plochými lupienkami. Hodí sa do vencov a floristických aranžmánov.",
  49: "Otvorená hlava magnólie s výrazným žilkovaním lupienkov. Hodí sa do vencov a elegantných aranžmánov.",
  50: "Plochšia hlava klinčeka s menej nabitým profilom. Hodí sa do vencov a floristických aranžmánov.",
  51: "Pootvorená hlava ruže s lupienkami ešte pritiahnutými k stredu. Hodí sa do vencov a floristických aranžmánov.",
  52: "Hlava orchidey s typickým tvarom okvetia. Hodí sa do vencov a elegantných aranžmánov.",
  53: "Hlava ruže so zvlnenými, voľnejšími lupienkami. Hodí sa do vencov a floristických aranžmánov.",
  54: "Hlava gerbery s radiálne usporiadanými lupienkami. Hodí sa do vencov a stolových aranžmánov.",
  55: "Dekoratívna hlava chryzantémy s dlhými úzkymi lupienkami a otvoreným tvarom. Vynikne vo vencoch a výrazných kvetinových dekoráciách.",
  56: "Hlava dálie so špicatými vrstvenými lupienkami. Hodí sa do vencov a výrazných kvetinových dekorácií.",
  57: "Kompaktná hlava iskerníka s hustým okvetím. Hodí sa do vencov a drobných aranžmánov.",
  58: "Samostatná hlava pivónie na výrobu vencov a aranžmánov. Komponent bez stonky.",
  59: "Samostatná hlava umelej ruže na výrobu vencov a aranžmánov. Komponent bez stonky.",
  60: "Samostatná hlava umelej ruže na výrobu vencov a aranžmánov. Komponent bez stonky.",
  61: "Hlava ruže s výraznými kališnými lístkami pri základni. Hodí sa do vencov a floristických aranžmánov.",
  62: "Samostatná hlava umelej ruže na výrobu vencov a aranžmánov. Komponent bez stonky.",
  63: "Samostatná hlava pivónie na výrobu vencov a aranžmánov. Komponent bez stonky.",
  64: "Samostatná hlava umelej ruže na výrobu vencov a aranžmánov. Komponent bez stonky.",
  65: "Hlava dálie so špicatými lupienkami a otvoreným stredom. Hodí sa do vencov a aranžmánov.",
  66: "Dekoratívna hlava dálie s guľovitým tvarom a okrúhlymi, dovnútra zahnutými lupienkami. Hodí sa na výrobu vencov a bohatých aranžmánov.",
  67: "Hlava pivónie s guľovitým hustým stredom. Hodí sa do vencov a floristických aranžmánov.",
  69: "Hlava antúrie s charakteristickým srdcovitým tvarom. Hodí sa do vencov a moderných aranžmánov.",
  70: "Hlava pivónie s guľovitým hustým stredom. Hodí sa do vencov a floristických aranžmánov.",
  71: "Plochá, výrazne roztvorená hlava ruže. Hodí sa do vencov a floristických aranžmánov.",
  72: "Hlava hortenzie z hustého trsu. Hodí sa do vencov a objemných aranžmánov.",
  73: "Dekoratívna hlava hortenzie doplnená ozdobnými vetvičkami. Hodí sa do vencov a floristických aranžmánov.",
  74: "Dekoratívna hlava hortenzie s textúrovanými lupienkami. Hodí sa do vencov a kvetinových aranžmánov.",
  75: "Hlava hortenzie z hustého trsu. Hodí sa do vencov a objemných aranžmánov.",
  76: "Hlava hortenzie z hustého trsu. Hodí sa do vencov a objemných aranžmánov.",
  82: "Plochá hlava kvetu s ostrými lupienkami a kontrastným stredom. Hodí sa do vencov a aranžmánov.",
  86: "Hlava sasanky s otvoreným okvetím. Hodí sa do vencov a jemných aranžmánov.",
  105: "Zaoblená hlava kvetu s vrstvenými lupienkami. Hodí sa do vencov a aranžmánov.",
  115: "Nízka hlava klinčeka s hustým okvetím. Hodí sa do vencov a floristických aranžmánov.",

  // wood / natural
  77: "Lotosový plod s matným povrchom. Hodí sa do vencov, mís a sezónnych aranžmánov.",
  78: "Sušený hviezdicový plod s rozvetvenými cípkami. Hodí sa do vencov a prírodných aranžmánov.",
  79: "Sušené drobné šištičky s hrboľatým povrchom. Hodia sa do vencov, mís a sezónnych dekorácií.",
  80: "Menší sušený kalich Bell Cup. Hodí sa do vencov a prírodných aranžmánov.",
  81: "Ploché kotúčovité drevené špirálky. Hodia sa do vencov a rustikálnych aranžmánov.",
  83: "Drevená ružička s kontrastným jadrom a okrajom lupienkov. Hodí sa do vencov a rustikálnych aranžmánov.",
  84: "Drevená ružička s jednoliatym povrchom a vrstvenými lupienkami. Hodí sa na lepenie do vencov a prírodných aranžmánov.",
  85: "Spirálovito vrstvená drevená hlava kvetu. Hodí sa na lepenie do vencov a prírodných dekorácií.",
  88: "Sušený badián s hviezdicovitým tvarom. Hodí sa do vencov, mís a sezónnych aranžmánov.",
  89: "Hviezdicový plod s otvorenými cípkami. Hodí sa do vencov a prírodných aranžmánov.",
  90: "Prírodný veniec pripravený ako základ alebo hotová dekorácia. Hodí sa na dvere, stenu alebo stolové aranžmány.",
  91: "Lotosový plod s otvorenými komorami. Hodí sa do vencov, mís a sezónnych aranžmánov.",
  92: "Dekoračný mach na výplň a podklad aranžmánov. Hodí sa do vencov, mís a terárií.",
  93: "Sušený kalich Bell Cup. Hodí sa do vencov a prírodných aranžmánov.",
  94: "Kúsky lotosového plodu na lepenie a výplň. Hodia sa do vencov a prírodných dekorácií.",
  95: "Sušené lodičkové plody. Hodia sa do vencov, mís a sezónnych aranžmánov.",
  96: "Plochá cédrová ružička zo šupiniek. Hodí sa na lepenie do vencov a sezónnych dekorácií.",
  98: "Hviezdicový plod s predĺženými cípkami. Hodí sa do vencov a prírodných aranžmánov.",
  99: "Kužeľovitá cédrová ružička zo šupiniek. Hodí sa na lepenie do vencov a sezónnych dekorácií.",
  100: "Dekoračná guľôčka do výplne a aranžmánov. Hodí sa do mís, vencov a sezónnych dekorácií.",
  101: "Dekoračné šišky do prírodných aranžmánov. Hodia sa do vencov, mís a sezónnych dekorácií.",
  102: "Dekoračný muškátový oriešok. Hodí sa do vencov, mís a sezónnych aranžmánov.",
  103: "Sušený kalichovitý plod. Hodí sa do vencov a prírodných aranžmánov.",
  104: "Bobuľová vetvička s lesklým povrchom. Hodí sa do vencov a sezónnych aranžmánov.",
  106: "Lotosový plod do prírodných aranžmánov. Hodí sa do vencov, mís a sezónnych dekorácií.",
  107: "Dekoračná vetvička so sušeným vzhľadom. Hodí sa do vencov a rustikálnych aranžmánov.",
  109: "Sušený puk na drôtiku na zápich do aranžmánov. Hodí sa do vencov a stolových väzieb.",
  110: "Jutové vrecúško na drobné darčeky alebo výplň aranžmánov. Hodí sa na balenie a rustikálne dekorácie.",
  111: "Otvorený hviezdicový plod. Hodí sa do vencov a prírodných aranžmánov.",
  112: "Prútená guľa ako samostatná dekorácia alebo podklad. Hodí sa do mís a sezónnych aranžmánov.",
  113: "Sušený kalich Bell Cup. Hodí sa do vencov a prírodných aranžmánov.",
  114: "Dekoračný kalíšok na lepenie do aranžmánov. Hodí sa do vencov a stolových dekorácií.",
  117: "Dekoračná pichľavá guľôčka. Hodí sa do vencov, mís a sezónnych aranžmánov.",
  118: "Sušený plod do prírodných aranžmánov. Hodí sa do vencov, mís a sezónnych dekorácií.",
  121: "Dekoračná tekvička do sezónnych aranžmánov. Hodí sa do mís, vencov a jesenných dekorácií.",
  122: "Dekoratívna tekvica do sezónnych aranžmánov. Hodí sa do mís, vencov a jesenných dekorácií.",
  123: "Bobuľová vetvička s matným povrchom. Hodí sa do vencov a sezónnych aranžmánov.",
  124: "Kokosové vlákno na výplň a viazanie. Hodí sa do vencov a rustikálnych aranžmánov.",
  125: "Umelý mach na výplň aranžmánov. Hodí sa do vencov, mís a terárií.",
  126: "Sisalové vlákno na viazanie a výplň. Hodí sa do rustikálnych aranžmánov a balenia.",
  127: "Predĺžené drevené špirálky z tenkých pásikov. Hodia sa do vencov, mís a suchých väzieb.",
  128: "Drobné dekoračné kvietky na lepenie. Hodia sa do vencov a detailných aranžmánov.",
  129: "Dekoratívne kalichy s dierovanou textúrou. Hodia sa do vencov a prírodných aranžmánov.",
  130: "Dekoratívna škorica do sezónnych aranžmánov. Hodí sa do vencov, mís a vonných dekorácií.",
  131: "Sušené škrupiny do prírodných aranžmánov. Hodia sa do mís, vencov a sezónnych dekorácií.",
  132: "Dekoratívne kalichy s hladkým povrchom. Hodia sa do vencov a prírodných aranžmánov.",
  133: "Dekoratívne šišky do prírodných aranžmánov. Hodia sa do vencov, mís a sezónnych dekorácií.",
  135: "Palmový list v tvare vejára. Hodí sa do veľkých aranžmánov a samostatných dekorácií.",
  136: "Dekoračné tobolky do prírodných aranžmánov. Hodia sa do vencov, mís a sezónnych dekorácií.",
  137: "Dekoračné plody do prírodných aranžmánov. Hodia sa do vencov, mís a sezónnych dekorácií.",
  138: "Drevené zvitky do rustikálnych aranžmánov. Hodia sa do vencov, mís a sezónnych dekorácií.",
  139: "Sušené plody do prírodných aranžmánov. Hodia sa do vencov, mís a sezónnych dekorácií.",
  140: "Hviezdicovitá dekoračná hlava. Hodí sa do vencov a stolových aranžmánov.",
  141: "Dekoratívny sukulent do moderných aranžmánov. Hodí sa do mís, vencov a terárií.",
  142: "Dekoratívna hlava na lepenie do aranžmánov. Hodí sa do vencov a stolových dekorácií.",
  143: "Cédrová ruža zo šupiniek šišky. Hodí sa na lepenie do vencov a sezónnych aranžmánov.",
  144: "Dekoratívna ružička s vrstvenými šupinami. Hodí sa na lepenie do vencov a sezónnych aranžmánov.",
  145: "Hlava slamienky s papierovým vzhľadom okvetia. Hodí sa do vencov a suchých aranžmánov.",

  // ribbons / florist tools
  146: "Saténová stuha s hladkým povrchom. Hodí sa na viazanie kytíc a darčekové balenia.",
  147: "Dekoračný sprej Florist Deco Spray na úpravu sušených aj umelých dekorácií a doplnkov. Hodí sa na dokončenie floristických aranžmánov.",
  148: "Tenký floristický drôt na upevnenie a tvarovanie pri aranžovaní. Uľahčuje viazanie kytíc a stavbu vencov.",
  149: "Dekoratívna stuha alebo páska na viazanie a zdobenie. Hodí sa na kytice a darčekové balenia.",
  150: "Dekoratívna stuha na viazanie kytíc a balenie. Jednoduchý doplnok pre floristiku.",
  151: "Saténová stuha s hladkým povrchom. Hodí sa na viazanie kytíc a darčekové balenia.",
  152: "Široká dekoračná stuha na výrazné viazanie. Hodí sa na kytice a darčekové balenia.",
  153: "Stuha s margarétkovým vzorom. Hodí sa na zdobenie kytíc a darčekov.",
  154: "Dekoračná stuha na viazanie kytíc a balenie. Jednoduchý doplnok pre floristiku.",
  155: "Dekoratívna stuha s kvetinovým vzorom a čipkovaným lemom. Hodí sa na zdobenie kytíc, darčekových balení a dekorácií.",
  156: "Saténová stuha s kvetinovým vzorom. Hodí sa na balenie darčekov a zdobenie kytíc.",
  157: "Saténová stuha s hladkým povrchom. Hodí sa na viazanie kytíc a darčekové balenia.",
  158: "Saténová stuha s hladkým povrchom. Hodí sa na viazanie kytíc a darčekové balenia.",
  159: "Plastová stonka ako základ pre umelé kvety. Hodí sa na zostavenie aranžmánov.",
  160: "Valcové floristické ampulky slúžia ako zásobník vody pri aranžovaní. Udržia čerstvý materiál vo vencoch a väzbách.",
  161: "Floristická skúmavka so zápichom slúži ako zásobník vody. Hodí sa do vencov a aranžmánov s čerstvým materiálom.",
  163: "Kuželovité floristické ampulky slúžia ako zásobník vody pri aranžovaní. Udržia čerstvý materiál vo vencoch a väzbách.",
  164: "Saténová stuha s hladkým povrchom. Hodí sa na viazanie kytíc a darčekové balenia.",
  165: "Dekoračná stuha s textúrovaným povrchom. Hodí sa na viazanie kytíc a darčekové balenia.",
  166: "Dekoratívna jutová páska na rustikálne viazanie. Hodí sa na kytice a balenie.",
  167: "Umelé lýko na viazanie a balenie. Hodí sa na kytice, darčekové balenia a floristické väzby.",
  168: "Polypropylénový špagát na viazanie kytíc a balenie. Drží uzol pri floristickej práci.",
  169: "Dekoratívna pavučinová sieťka na balenie a aranžovanie. Hodí sa do kytíc a darčekových balení.",
  170: "Jutový copík na rustikálne viazanie. Hodí sa na kytice a prírodné dekorácie.",
  171: "Dekoratívna krútená šnúra na viazanie a zdobenie. Hodí sa na kytice a darčekové balenia.",
  172: "Papierové lyko na viazanie a balenie. Hodí sa na kytice a floristické väzby.",
  173: "Károvaná stuha na rustikálne viazanie. Hodí sa na balenie darčekov a kytice.",
  174: "Károvaná textilná stuha na viazanie a zdobenie. Hodí sa na kytice a darčekové balenia.",
  175: "Dekoratívna stuha s ozdobnými linkami na okraji. Hodí sa na viazanie kytíc a darčekové balenia.",
  176: "Károvaná stuha s tkanou textúrou. Hodí sa na balenie darčekov a rustikálne aranžmány.",
  177: "Dekoratívna stuha s ornamentálnym okrajom. Hodí sa na balenie darčekov a floristické aranžmány.",
  178: "Saténová stuha s hladkým povrchom. Hodí sa na viazanie kytíc a darčekové balenia.",
  179: "Saténová stuha s hladkým povrchom. Hodí sa na viazanie kytíc a darčekové balenia.",
};

// 144 name/druh override (neutral until confirmed)
const OVERRIDES = {
  144: {
    name: "Dekoratívna ružička",
    druh: "Dekoratívna ružička",
    // keep category/sub as Prírodniny but mark uncertain in reports
  },
};

const changes = [];
const questions = [];

for (const ent of fs.readdirSync(ROOT, { withFileTypes: true })) {
  if (!ent.isDirectory() || !/^\d+$/.test(ent.name)) continue;
  const id = ent.name;
  const dir = path.join(ROOT, id);
  const info = parseInfo(fs.readFileSync(path.join(dir, "info.txt"), "utf8"));

  const before = {
    name: info["Názov"],
    description: info["Popis"],
    druh: info["Druh"],
    category: info["Kategória"],
    subcategory: info["Subkategória"],
  };

  let name = before.name;
  let druh = before.druh;
  let category = before.category;
  let subcategory = before.subcategory;
  let description = before.description;

  if (OVERRIDES[id]) {
    if (OVERRIDES[id].name) name = OVERRIDES[id].name;
    if (OVERRIDES[id].druh) druh = OVERRIDES[id].druh;
  }

  if (DESC[id]) {
    description = DESC[id];
  } else if (MECHANICAL.test(description) || /\(.*\)/.test(description)) {
    // fallback: still rewrite awkwardly - shouldn't happen if DESC is complete
    description = `${name}. Hodí sa do floristických aranžmánov a dekorácií.`;
  }

  description = noEm(description);
  name = noEm(name);
  if (BAD_DESC.test(description)) {
    throw new Error(`BAD_DESC hit on ${id}: ${description}`);
  }
  if (MECHANICAL.test(description) || /Dekoratívny produkt\s*\(/.test(description)) {
    throw new Error(`Still mechanical on ${id}: ${description}`);
  }

  writeInfo(dir, {
    name,
    description,
    farby: info["Farby"] ?? "",
    druh,
    category,
    subcategory,
    sourceFolder: info["Zdrojová zložka"],
  });

  if (before.description !== description || before.name !== name || before.druh !== druh) {
    changes.push({
      id,
      originalName: before.name,
      newName: name,
      originalDescription: before.description,
      newDescription: description,
      originalDruh: before.druh,
      newDruh: druh,
      action:
        before.name !== name
          ? "renamed+description"
          : before.description !== description
            ? "description"
            : "druh",
    });
  }
}

// --- merge verification downgrade ---
const merges = [
  {
    id: "68",
    intoId: "66",
    verification: "ok",
    reason:
      "Prezentačný mix guľovitej dálie; jednotlivé kusy na fotkách 68 zodpovedajú stavbe 66. Nie je samostatný predávaný model.",
    evidence: "vizuálna zhoda guľovitej stavby a stredu 66 vs mix 68",
  },
  {
    id: "162",
    intoId: "156",
    verification: "k-overeni",
    reason:
      "Vizuálne rovnaký kvetinový vzor, ale šírka a návin stuhy nie sú doložené. Pred publikovaním potvrdiť rovnakú predajnú jednotku.",
    evidence: "vizuálna zhoda vzoru; chýba meranie šírky/návinu",
  },
  {
    id: "180",
    intoId: "127",
    verification: "ok",
    reason:
      "Rovnaké predĺžené drevené špirálky; rozdiel len farba. Tvar tyčinkovitých špirálok je totožný.",
    evidence: "zhoda predĺženého tvaru 127 a 180",
  },
  {
    id: "116",
    intoId: "83",
    verification: "ok",
    reason:
      "Rovnaká dvojfarebná drevená ružička (kontrast jadra a okraja). 116 je ďalšia farebná prezentácia.",
    evidence: "zhoda dvojfarebnej stavby 83 a 116",
  },
  {
    id: "87",
    intoId: "85",
    verification: "k-overeni",
    reason:
      "Rovnaká spirálovitá drevená hlava, ale predajná jednotka a balenie nie sú doložené. Pred publikovaním potvrdiť.",
    evidence: "zhoda spirálovitej stavby; chýba potvrdenie balenia/SKU",
  },
  {
    id: "97",
    intoId: "85",
    verification: "k-overeni",
    reason:
      "Rovnaká spirálovitá drevená hlava, ale predajná jednotka a balenie nie sú doložené. Pred publikovaním potvrdiť.",
    evidence: "zhoda spirálovitej stavby; chýba potvrdenie balenia/SKU",
  },
  {
    id: "16",
    intoId: "15",
    verification: "ok",
    reason:
      "Rovnaká veľká otvorená hlava iskerníka; rozdiel len farba. Kontrast voči kompaktnej 57.",
    evidence: "zhoda veľkosti a vrstvenia 15 a 16",
  },
];

for (const m of merges) {
  if (m.verification === "k-overeni") {
    questions.push({
      id: `${m.id}->${m.intoId}`,
      photo: `${m.intoId}/1.webp; _archived/${m.id}/1.webp`,
      question: m.reason,
      group: "slouceni-cekajici",
    });
  }
}

questions.push({
  id: "144",
  photo: "144/1.webp",
  question:
    "Je 144 cédrová ruža zo šupiniek šišky (ako 143/96/99), alebo iný výrobok? Zatiaľ pracovný názov Dekoratívna ružička bez tvrdenia o materiáli.",
  group: "material",
});

questions.push({
  id: "kolizia-ruze",
  photo: "11/1.webp, 24/1.webp, 47/1.webp, 59/1.webp, 60/1.webp, 62/1.webp, 64/1.webp",
  question:
    "Produkty 11, 24, 47, 59, 60, 62, 64 majú rovnaký pracovný názov Hlava ruže. Označte spoľahlivý rozlišujúci znak modelu, alebo ktoré sú farebné varianty jedného SKU.",
  group: "nazvy",
});

questions.push({
  id: "kolizia-hortenzie",
  photo: "72/1.webp, 75/1.webp, 76/1.webp",
  question:
    "Produkty 72, 75, 76 majú rovnaký pracovný názov Hlava hortenzie (17/18/26 majú hustý riasený trs). Ide o ten istý model v iných farbách, alebo o iný tvar?",
  group: "nazvy",
});

questions.push({
  id: "kolizia-saten",
  photo: "146/1.webp, 151/1.webp, 157/1.webp, 158/1.webp, 164/1.webp, 178/1.webp, 179/1.webp",
  question:
    "Saténové stuhy 146, 151, 157, 158, 164, 178, 179: uveďte šírku a dĺžku návinu. Bez rozmerov ich nelúčiť ani nerozlišovať odhadom z fotky.",
  group: "nazvy",
});

questions.push({
  id: "156+162",
  photo: "156/1.webp; _archived/162/1.webp",
  question:
    "Majú 156 a 162 rovnakú šírku a návin? Ak áno, farebné zlúčenie ostáva. Ak nie, treba 162 vrátiť ako samostatný produkt.",
  group: "slouceni-cekajici",
});

questions.push({
  id: "85+87+97",
  photo: "85/1.webp; _archived/87/1.webp; _archived/97/1.webp",
  question:
    "Sú 85, 87 a 97 rovnaká predajná jednotka (počet kusov/balenie), alebo len rovnaký tvar v inej prezentácii? Bez potvrdenia nepublikovať ako finálne zlúčenie.",
  group: "slouceni-cekajici",
});

// validation
const active = fs
  .readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && /^\d+$/.test(d.name))
  .map((d) => d.name);

let webp = 0;
const validation = { emdash: [], badDesc: [], mechanical: [], missingWebp: 0 };
for (const id of active) {
  const text = fs.readFileSync(path.join(ROOT, id, "info.txt"), "utf8");
  const info = parseInfo(text);
  if (EM.test(text)) validation.emdash.push(id);
  if (BAD_DESC.test(info["Popis"] || "")) validation.badDesc.push(id);
  if (MECHANICAL.test(info["Popis"] || "") || /Dekoratívny produkt\s*\(/.test(info["Popis"] || "")) {
    validation.mechanical.push(id);
  }
  webp += fs.readdirSync(path.join(ROOT, id)).filter((f) => f.endsWith(".webp")).length;
}

const confirmedMerges = merges.filter((m) => m.verification === "ok");
const pendingMerges = merges.filter((m) => m.verification === "k-overeni");

fs.writeFileSync(path.join(OUT, "prehled-popisu.json"), JSON.stringify(changes, null, 2));
fs.writeFileSync(path.join(OUT, "archivovane-slouceni.json"), JSON.stringify(merges, null, 2));
fs.writeFileSync(
  path.join(OUT, "k-overeni.md"),
  [
    "# Položky k ověření (v4)",
    "",
    "## Skupiny názvů",
    ...questions
      .filter((q) => q.group === "nazvy")
      .map((q) => `- **${q.id}** (foto: ${q.photo}): ${q.question}`),
    "",
    "## Sloučení čekající na potvrzení",
    ...questions
      .filter((q) => q.group === "slouceni-cekajici")
      .map((q) => `- **${q.id}** (foto: ${q.photo}): ${q.question}`),
    "",
    "## Materiál / identifikace",
    ...questions
      .filter((q) => q.group === "material")
      .map((q) => `- **${q.id}** (foto: ${q.photo}): ${q.question}`),
    "",
  ].join("\n"),
);

const souhrn = `# Souhrn úprav katalogu ready-v4

Porovnání vůči: **noveprodukty5.9.26-ready-v3**

## Co se změnilo
- Aktivní produkty: **${active.length}** (beze změny struktury)
- WebP v aktivních: **${webp}** (očekáváno 540)
- Změněné popisy / názvy: **${changes.length}**
- Nová sloučení: **0**
- Obnovené produkty 14, 32, 35, 38, 46, 70: **zachovány**

## Popisy
Odstraněny mechanické konstrukce typu „Dekoratívny produkt (…)" a chybné rody („Dekoratívny echinacea/artičoka").
Každý přepsaný popis je přirozená 1-2 věta o výrobku a použití.
Zachovány dobré texty u klíčových položek (např. 41, 55, 73, 74, 148), pokud splňovaly pravidla.

## Produkt 144
Pracovní název: **Dekoratívna ružička** (bez tvrzení o cedru/šišce). Čeká na potvrzení v k-overeni.md.

## Sloučení (stav podle podkladů)
Potvrzená (**${confirmedMerges.length}**):
${confirmedMerges.map((m) => `- ${m.id} → ${m.intoId}: ${m.reason}`).join("\n")}

K ověření před publikací (**${pendingMerges.length}** přesunů / skupiny):
${pendingMerges.map((m) => `- ${m.id} → ${m.intoId} [${m.verification}]: ${m.reason}`).join("\n")}

Archiv a mapování fotek zůstávají; rozhodnutí lze vrátit.

## Importní výjimky (beze změny logiky)
- 147: prázdné Farby, foto u produktu (\`produkty-bez-farby.json\`)
- 155, 172: společná galerie, ne připravené na bezchybný barevný import

## Validace
- Em dash: ${validation.emdash.length}
- Barvy/počty v Popis: ${validation.badDesc.length}
- Mechanické šablony: ${validation.mechanical.length}

Originál a v3 beze změny. Nic nepublikováno do e-shopu.
`;

fs.writeFileSync(path.join(OUT, "souhrn-uprav.md"), souhrn);
fs.writeFileSync(
  path.join(OUT, "summary.json"),
  JSON.stringify(
    {
      activeProducts: active.length,
      webpActive: webp,
      descriptionChanges: changes.length,
      confirmedMerges: confirmedMerges.length,
      pendingMergeMoves: pendingMerges.length,
      validation,
    },
    null,
    2,
  ),
);

// copy reports + update STAV
const dest = path.join(ROOT, "_reports");
fs.mkdirSync(dest, { recursive: true });
for (const f of fs.readdirSync(OUT)) {
  fs.copyFileSync(path.join(OUT, f), path.join(dest, f));
}
// keep gallery/import files from v3 copy
fs.writeFileSync(
  path.join(ROOT, "STAV.md"),
  [
    "# Katalóg batch 5.9.26 - ready-v4",
    "",
    "Pracovná kópia z v3: jazyková a vecná oprava popisov.",
    "ID, fotky a Farby rozsahy zachované.",
    "",
    `Aktívne produkty: ${active.length}`,
    `Zmenené popisy: ${changes.length}`,
    "",
    "Reporty: `_reports/`",
    "",
  ].join("\n"),
);

console.log(
  JSON.stringify(
    {
      changes: changes.length,
      webp,
      confirmedMerges: confirmedMerges.length,
      pendingMerges: pendingMerges.length,
      validation,
    },
    null,
    2,
  ),
);
