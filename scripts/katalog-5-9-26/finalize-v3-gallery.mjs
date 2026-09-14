import fs from "node:fs";
import path from "node:path";

const root = "katalog_raw/noveprodukty5.9.26-ready-v3";
const reports = "scripts/katalog-5-9-26/v3-reports";

// Deduplicate and clarify common gallery: 147 is empty-farby, not mix gallery
const gallery = [
  {
    productId: "66",
    photos: [10, 11],
    fromProduct: "68",
    note: "Prezentačný mix / spoločná galéria - nie farebná varianta v poli Farby. Importér potrebuje všeobecnú galériu.",
  },
  {
    productId: "155",
    photos: [1, 2, 3],
    note: "Len spoločné/mix fotografie - nie jednotlivé farebné varianty. Nepripravené na bezchybný farebný import.",
  },
  {
    productId: "172",
    photos: [1, 2],
    note: "Len spoločné/mix fotografie - nie jednotlivé farebné varianty. Nepripravené na bezchybný farebný import.",
  },
];

const pendingNoColor = [
  {
    productId: "147",
    photos: [1],
    status: "pending-no-color",
    note: "Farby prázdne zámerne. Foto 1.webp ostáva v zložke produktu. Nie je to spoločná galéria mixu farieb. Importér musí podporiť produkt bez zvolenej farby.",
  },
];

fs.writeFileSync(path.join(reports, "spolecna-galerie.json"), JSON.stringify(gallery, null, 2));
fs.writeFileSync(path.join(root, "spolecna-galerie.json"), JSON.stringify(gallery, null, 2));
fs.writeFileSync(path.join(reports, "produkty-bez-farby.json"), JSON.stringify(pendingNoColor, null, 2));
fs.writeFileSync(path.join(root, "produkty-bez-farby.json"), JSON.stringify(pendingNoColor, null, 2));

// Copy all reports to _reports
const dest = path.join(root, "_reports");
fs.mkdirSync(dest, { recursive: true });
for (const f of fs.readdirSync(reports)) {
  fs.copyFileSync(path.join(reports, f), path.join(dest, f));
}
fs.copyFileSync(path.join(reports, "produkty-bez-farby.json"), path.join(dest, "produkty-bez-farby.json"));

console.log("gallery cleaned; 147 moved to produkty-bez-farby.json");
