const fs = require("fs");
const path =
  "C:/Users/tomas/Desktop/projekty/pacidekor/pacidekornavrh1/_katalog-work/katalog-raw.json";
let text = fs.readFileSync(path, "utf8").trim();
// MCP payload was escaped as \" inside the wrapper
if (text.includes('\\"')) {
  text = text.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}
const rows = JSON.parse(text);
console.log("rows", rows.length);
const cols = [
  "id",
  "slug",
  "name",
  "sku",
  "category",
  "subcategory_id",
  "druh_id",
  "druh_label",
  "color_ids",
  "image_count",
  "price",
  "in_stock",
  "stock_quantity",
  "is_new",
  "in_vypredaj",
  "created_at",
  "updated_at",
];
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
console.log("wrote", rows.length);
