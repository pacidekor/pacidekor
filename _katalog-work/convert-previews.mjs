import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ready = path.join('public', '249produkty-ready');
const preview = path.join('public', '249produkty', '_preview');
fs.mkdirSync(preview, { recursive: true });

const dirs = fs
  .readdirSync(ready, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

for (const dir of dirs) {
  const idMatch = dir.match(/^(\d+)/);
  if (!idMatch) continue;
  const id = idMatch[1];
  const folder = path.join(ready, dir);
  const webps = fs
    .readdirSync(folder)
    .filter((f) => f.toLowerCase().endsWith('.webp'))
    .sort((a, b) => parseInt(a) - parseInt(b));
  const limit = webps.length <= 7 ? webps.length : Math.min(webps.length, 12);
  for (let i = 0; i < limit; i++) {
    const src = path.join(folder, webps[i]);
    const dest = path.join(preview, `${id}-${i + 1}.jpg`);
    await sharp(src)
      .jpeg({ quality: 85 })
      .resize(900, 900, { fit: 'inside', withoutEnlargement: true })
      .toFile(dest);
  }
  console.log('OK', id, 'converted', limit, 'of', webps.length);
}
