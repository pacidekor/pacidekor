import fs from "node:fs";
import path from "node:path";

function parseFarby(farby) {
  return farby.split("|").map((part) => {
    const m = part.trim().match(/^(.+?)\s*\[([^\]]+)\]\s*$/);
    if (!m) return { color: part.trim(), photos: [], range: null };
    const color = m[1].trim();
    const range = m[2].trim();
    const photos = [];
    if (range.includes("-")) {
      const [a, b] = range.split("-").map((x) => Number(x.trim()));
      for (let n = a; n <= b; n++) photos.push(n);
    } else if (range.includes(",")) {
      for (const x of range.split(",")) photos.push(Number(x.trim()));
    } else photos.push(Number(range));
    return { color, photos, range };
  });
}

const root = "katalog_raw/noveprodukty5.9.26-ready-v2";
for (const id of ["43", "85", "13", "28", "34", "36", "66", "156", "15", "83", "127"]) {
  const dir = path.join(root, id);
  if (!fs.existsSync(dir)) {
    console.log("MISSING", id);
    continue;
  }
  const t = fs.readFileSync(path.join(dir, "info.txt"), "utf8");
  const farby = (t.match(/^Farby:\s*(.+)$/m) || [])[1] || "";
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".webp"))
    .sort((a, b) => parseInt(a) - parseInt(b));
  console.log("====", id);
  console.log(t.trim());
  console.log("files:", files.join(", "));
  const parsed = parseFarby(farby);
  for (const p of parsed) {
    const bad = p.photos.filter((n) => !Number.isFinite(n) || !files.includes(`${n}.webp`));
    if (bad.length) console.log("BAD", p.color, p.range, bad);
  }
  console.log("");
}
