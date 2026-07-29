import fs from 'fs';
import path from 'path';

const root = 'public/products/paci-kvety-ready';
const catalogPath = 'scripts/paci-batch1-catalog.json';

/** @type {Record<string, {name?: string, desc?: string, colors: string[], multi?: boolean}>} */
const data = {
  '001': { colors: ['fialová'] },
  '002': { colors: ['prašnoružová / lososová'] },
  '003': {
    name: 'Orchidea Phalaenopsis',
    desc: 'Umelá orchidea so stonkom, otvorenými kvetmi a púčikmi. Dostupné vo viacerých farebných variantoch – ideálne do vázy alebo aranžmánov.',
    multi: true,
    colors: [
      'ružovobiela s magenta stredom [1,4,9,13,15,20]',
      'tmavo fialová [2,12,16]',
      'biela / krémová [3,10,11,19]',
      'limetkovo zelená [5,8,18]',
      'krémovožltá s magenta stredom [6,7,17]',
      'mix farieb (skupinová fotka) [14]',
    ],
  },
  '004': { colors: ['biela'] },
  '005': { colors: ['tmavozelená'] },
  '006': { colors: ['zelená'] },
  '007': { colors: ['žltá'] },
  '008': { colors: ['zelená s krémovým okrajom'] },
  '009': { colors: ['tmavozelená'] },
  '010': { colors: ['červená'] },
  '011': { colors: ['biela'] },
  '012': { colors: ['biela'] },
  '013': {
    name: 'Dálie / chryzantémy',
    desc: 'Husté viackveté hlavy so zelenými listami a jemnými bielymi doplnkami. Dostupné vo viacerých farbách.',
    multi: true,
    colors: [
      'bordová / vínová [1,2,3,4,5,6]',
      'prašnoružová / broskyňová [7]',
    ],
  },
  '014': {
    name: 'Dálie / chryzantémy',
    desc: 'Umelé kvety s hustými špicatými okvetnými lístkami a zelenými listami. Široká škála farebných variantov.',
    multi: true,
    colors: [
      'biela [1]',
      'prašnoružová / mauve [3]',
      'krémová s ružovým stredom [9,13]',
      'mix farieb: biela, ružová, krémová, meruňková, fialová, staroružová [7]',
    ],
  },
  '015': { colors: ['fialovobiela'] },
  '016': {
    name: 'Drobné kvety – zhluk (hortenziový typ)',
    desc: 'Zhluk drobných kvetov so zelenými zúbkovanými listami a jemnými hnedými prvkami. Dostupné vo viacerých farbách.',
    multi: true,
    colors: [
      'horčicovo žltá / oranžová [1]',
      'starozelená / antique green [7]',
      'biela [13]',
    ],
  },
  '017': { colors: ['biela'] },
  '018': {
    name: 'Vres / Erica – jemný zväzok',
    desc: 'Hustý zväzok jemných drobných kvetov. Soft dekor vhodný ako výplň do kytíc. Dostupné vo farebných variantoch.',
    multi: true,
    colors: [
      'staroružová / korálová [1,4]',
      'krémovo-zelenkavá [7]',
    ],
  },
  '019': { colors: ['biela s ružovou žilnatinou'] },
  '020': { colors: ['krémovožltá'] },
  '021': {
    name: 'Orchidea Cymbidium',
    desc: 'Umelé orchidey so stonkami a púčikmi. Výrazné farebné a vzorované varianty.',
    multi: true,
    colors: [
      'ružovobiela so žíhaním [1,5]',
      'zelená s vínovým tečkovaním [10]',
    ],
  },
  '022': { colors: ['žltá'] },
  '023': { colors: ['zelená s broskyňovými púčikmi'] },
  '024': { colors: ['krémová so zelenou a bordó výplňou'] },
  '025': { colors: ['zelenobiela'] },
  '026': { colors: ['mätovozelená / biela'] },
  '027': { colors: ['biela so žltým stredom'] },
  '028': { colors: ['krémová'] },
  '029': { colors: ['krémová'] },
  '030': {
    name: 'Allium / scabiosa – guľovité hlavy',
    desc: 'Štyri guľovité hlavy so zúbkovanými zelenými listami. Soft moderný dekor vo viacerých farbách.',
    multi: true,
    colors: [
      'prašnoružová / mauve [1]',
      'zelená [9]',
      'krémovožltá / sírová [16]',
    ],
  },
  '031': { colors: ['limetkovo-krémová'] },
  '032': { colors: ['limetkovozelená'] },
  '033': { colors: ['prašnofialová / levanduľová'] },
  '034': { colors: ['krémová'] },
  '035': {
    name: 'Gypsophila (nevestin závoj)',
    desc: 'Klasický umelý stonok gypsophily s drobnými kvetmi. Univerzálna výplň do kytíc a váz. Dostupné vo farebných variantoch.',
    multi: true,
    colors: [
      'biela [1]',
      'svetloružová [7]',
      'svetloružová / levanduľová [13]',
    ],
  },
  '036': {
    name: 'Mak',
    desc: 'Umelé maky so zelenými stredmi, púčikmi a listami. Výrazný farebný akcent do aranžmánov.',
    multi: true,
    colors: [
      'červená [1,5]',
      'tmavo bordová / vínová [10]',
    ],
  },
  '037': { colors: ['biela'] },
  '038': {
    name: 'Hyacint',
    desc: 'Umelý hyacint s hustým klasom drobných zvončekovitých kvetov a zelenými listami. Jarný dekor vo viacerých farbách.',
    multi: true,
    colors: [
      'biela / krémová [1]',
      'fialovomodrá / levanduľová [5]',
      'žltá [9]',
      'ružová [17]',
    ],
  },
  '039': {
    name: 'Drobné kvety na konári (waxflower typ)',
    desc: 'Mix jemných drobných kvetov na konári. Boho / jesenný aranžmán. Dostupné vo farebných variantoch.',
    multi: true,
    colors: [
      'bordová / vínová [1,10]',
      'staroružová / terra [1]',
      'krémová / biela [1,5]',
    ],
  },
  '040': { colors: ['biela so žltým stredom'] },
};

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const catalogById = Object.fromEntries(catalog.map((c) => [c.id, c]));

for (const [id, meta] of Object.entries(data)) {
  const infoPath = path.join(root, id, 'info.txt');
  const raw = fs.readFileSync(infoPath, 'utf8');
  const lines = Object.fromEntries(
    raw
      .trim()
      .split(/\r?\n/)
      .map((l) => {
        const i = l.indexOf(':');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );

  const name = meta.name || lines['Názov'] || catalogById[id]?.name;
  const desc = meta.desc || lines['Popis'] || catalogById[id]?.desc;
  const source = lines['Zdrojová zložka'];
  const price = lines['Cena'] || '1,00 €';
  const images = lines['Obrázky'];
  const colorsLine = meta.colors.join(' | ');

  const out = [
    `Názov: ${name}`,
    `Zdrojová zložka: ${source}`,
    `Popis: ${desc}`,
    `Farby: ${colorsLine}`,
    `Cena: ${price}`,
    `Obrázky: ${images}`,
    '',
  ].join('\n');

  fs.writeFileSync(infoPath, out, 'utf8');

  const cat = catalogById[id];
  if (cat) {
    cat.name = name;
    cat.desc = desc;
    cat.colors = meta.colors.map((c) => c.replace(/\s*\[[^\]]+\]\s*$/, '').trim());
    cat.colorDetails = meta.colors;
    cat.hasColorVariants = Boolean(meta.multi) || meta.colors.length > 1;
  }
}

fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n', 'utf8');

const multi = catalog.filter((c) => c.hasColorVariants).map((c) => c.id);
console.log('updated', catalog.length, 'products');
console.log('multi-color', multi.length, multi.join(','));
console.log('--- sample 003 ---');
console.log(fs.readFileSync(path.join(root, '003', 'info.txt'), 'utf8'));
