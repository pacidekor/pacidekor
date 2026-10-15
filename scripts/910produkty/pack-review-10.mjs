import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const out = "scripts/910produkty/chatgpt-review-10";
const productsDir = path.join(out, "products");
const audit = JSON.parse(
  fs.readFileSync(
    "scripts/910produkty/validation-reports/chatgpt-audit.json",
    "utf8",
  ),
);
const byId = Object.fromEntries(audit.products.map((p) => [p.id, p]));

function field(info, key) {
  const m = info.match(new RegExp(`^${key}:\\s*(.*)$`, "m"));
  return m ? m[1].trim() : "";
}

const manifest = [];
for (const id of fs.readdirSync(productsDir).sort()) {
  const dir = path.join(productsDir, id);
  if (!fs.statSync(dir).isDirectory()) continue;
  const info = fs.readFileSync(path.join(dir, "info.txt"), "utf8");
  const prev = byId[id] || {};
  const photos = fs
    .readdirSync(dir)
    .filter((f) => /^\d+\.jpg$/i.test(f))
    .sort((a, b) => Number(a) - Number(b));
  manifest.push({
    id,
    previousVerdict: prev.verdict || null,
    previousHumanQuestion: prev.humanQuestion || null,
    previousNotes: prev.notes || null,
    previousProposedFarby: prev.proposedFarby || null,
    name: field(info, "Názov"),
    farby: field(info, "Farby"),
    category: field(info, "Kategória"),
    subcategory: field(info, "Subkategória"),
    sheet: `products/${id}/_sheet.jpg`,
    photos: photos.map((f) => `products/${id}/${f}`),
  });
}

fs.writeFileSync(
  path.join(out, "manifest.json"),
  JSON.stringify(manifest, null, 2),
);
fs.writeFileSync(
  path.join(out, "README.md"),
  `# PACIDEKOR — 10 produktov na finálny verdikt

1. Nahraj tento ZIP do ChatGPT
2. Ako správu vlož obsah \`PROMPT.md\`
3. Nech vráti finálny JSON verdikt pre všetkých 10
`,
);

const zip = path.resolve(
  "public/910produkty-ready/_reports/910-held-10-final-verdict.zip",
);
fs.mkdirSync(path.dirname(zip), { recursive: true });
if (fs.existsSync(zip)) fs.unlinkSync(zip);

const absOut = path.resolve(out);
execSync(
  `powershell -NoProfile -Command "Compress-Archive -Path '${absOut}\\*' -DestinationPath '${zip}' -Force"`,
  { stdio: "inherit" },
);

console.log("manifest", manifest.length);
console.log("zip", zip, (fs.statSync(zip).size / 1024 / 1024).toFixed(1), "MB");
for (const m of manifest) {
  console.log(m.id, m.previousVerdict, "-", m.name);
}
