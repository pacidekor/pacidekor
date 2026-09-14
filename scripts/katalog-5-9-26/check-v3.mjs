import fs from "node:fs";
import path from "node:path";

const root = "katalog_raw/noveprodukty5.9.26-ready-v3";

function info(id) {
  return fs.readFileSync(path.join(root, id, "info.txt"), "utf8");
}

const checks = [
  "13", "14", "28", "32", "34", "35", "36", "38", "43", "46", "67", "70",
  "15", "66", "85", "83", "84", "144", "147", "155", "167", "172", "148", "41", "55",
];
for (const id of checks) {
  const dir = path.join(root, id);
  const exists = fs.existsSync(dir);
  console.log("====", id, exists ? "ACTIVE" : "MISSING/ARCHIVED");
  if (exists) {
    console.log(info(id).trim());
    console.log(
      "files",
      fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(".webp"))
        .sort((a, b) => parseInt(a) - parseInt(b))
        .join(","),
    );
  } else if (fs.existsSync(path.join(root, "_archived", id))) {
    console.log("(in _archived)");
  }
  console.log("");
}

// Count webps: active only vs archived originals
function countWebp(dir) {
  let n = 0;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.isDirectory() && /^\d+$/.test(ent.name)) {
      n += fs.readdirSync(path.join(dir, ent.name)).filter((f) => f.endsWith(".webp")).length;
    }
  }
  return n;
}
const active = countWebp(root);
const arch = fs.existsSync(path.join(root, "_archived"))
  ? countWebp(path.join(root, "_archived"))
  : 0;
const ready = countWebp("katalog_raw/noveprodukty5.9.26-ready");
console.log({ activeWebp: active, archivedWebp: arch, readyWebp: ready, sumActiveArch: active + arch });
