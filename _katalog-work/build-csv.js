const fs = require("fs");
const p =
  "C:/Users/tomas/.cursor/projects/c-Users-tomas-Desktop-projekty-pacidekor-pacidekornavrh1/agent-tools/ced8cc85-8aee-42b3-8193-30f40402479b.txt";
const raw = fs.readFileSync(p, "utf8");
const i = raw.indexOf("[");
const j = raw.lastIndexOf("]");
const rows = JSON.parse(raw.slice(i, j + 1));
console.log("rows", rows.length);
const cols = Object.keys(rows[0]);
function esc(v) {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
const lines = [cols.join(",")].concat(
  rows.map((r) => cols.map((c) => esc(r[c])).join(",")),
);
const out =
  "C:/Users/tomas/Desktop/projekty/pacidekor/pacidekornavrh1/_katalog-work/katalog-eshop.csv";
fs.writeFileSync(out, "\uFEFF" + lines.join("\n"), "utf8");
console.log("wrote", lines.length - 1, "products");
