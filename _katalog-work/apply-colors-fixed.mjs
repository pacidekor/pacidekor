import fs from 'fs';
import path from 'path';

const root = process.cwd();
const fixedPath = path.join(root, 'public', '249produkty', 'catalog-colors-fixed.json');
const catalogPath = path.join(root, 'public', '249produkty-ready', 'catalog.json');
const readyRoot = path.join(root, 'public', '249produkty-ready');

const fixed = JSON.parse(fs.readFileSync(fixedPath, 'utf8'));
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

const byId = new Map(fixed.map((p) => [p.id, p]));

let countChanged = 0;
const changedIds = [];

for (const item of catalog) {
  const corr = byId.get(item.id);
  if (!corr) continue;
  const oldColors = item.colors || [];
  const newColors = corr.colors;
  if (oldColors.length !== newColors.length) {
    countChanged++;
    changedIds.push({
      id: item.id,
      from: oldColors.length,
      to: newColors.length,
      old: oldColors,
      neu: newColors,
    });
  }
  item.colors = newColors;

  const folder = path.join(readyRoot, item.readyFolder);
  const produktPath = path.join(folder, 'produkt.txt');
  if (!fs.existsSync(produktPath)) {
    console.warn('missing produkt.txt', item.id, folder);
    continue;
  }
  let text = fs.readFileSync(produktPath, 'utf8');
  const farbyLine = `Farby: ${newColors.join(', ')}`;
  if (/^Farby:.*/m.test(text)) {
    text = text.replace(/^Farby:.*/m, farbyLine);
  } else {
    text = text.trimEnd() + '\n' + farbyLine + '\n';
  }
  fs.writeFileSync(produktPath, text, 'utf8');
}

fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n', 'utf8');

console.log('color_count_changed', countChanged);
console.log(JSON.stringify(changedIds, null, 2));
