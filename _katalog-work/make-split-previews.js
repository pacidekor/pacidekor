const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "katalog_raw", "produktyznovu");
const OUT = path.join(__dirname, "_preview-split");

function listImages(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && /\.(jpe?g|png|webp)$/i.test(d.name))
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const dirs = fs
  .readdirSync(SRC, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

const manifest = [];

for (const name of dirs) {
  const dir = path.join(SRC, name);
  const images = listImages(dir);
  if (images.length <= 3) continue;

  const safe = name.replace(/[<>:"/\\|?*]/g, "-").slice(0, 80);
  const folderOut = path.join(OUT, `${String(images.length).padStart(2, "0")}__${safe}`);
  fs.mkdirSync(folderOut, { recursive: true });

  const groups = [];
  for (let i = 0; i < images.length; i += 3) {
    groups.push(images.slice(i, i + 3));
  }

  groups.forEach((g, gi) => {
    const srcImg = path.join(dir, g[0]);
    const dest = path.join(
      folderOut,
      `g${String(gi + 1).padStart(2, "0")}_of_${groups.length}__${g[0]}`,
    );
    fs.copyFileSync(srcImg, dest);
  });

  manifest.push({
    name,
    count: images.length,
    groups: groups.length,
    groupSizes: groups.map((g) => g.length),
    previewDir: folderOut,
  });
}

manifest.sort((a, b) => b.count - a.count);
fs.writeFileSync(
  path.join(OUT, "manifest.json"),
  JSON.stringify(manifest, null, 2),
);
console.log("preview folders", manifest.length);
console.log("out", OUT);
manifest.slice(0, 15).forEach((m) =>
  console.log(m.count, "imgs", m.groups, "groups |", m.name),
);
