import fs from "fs";
import path from "path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const envPath = path.join(process.cwd(), ".env.local");
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const sample = path.join(
  process.cwd(),
  "katalog_raw",
  "nahrat na eshop pojmenovane",
);
const dirs = fs.readdirSync(sample, { withFileTypes: true }).filter((d) => d.isDirectory());
const firstWebp = dirs.length
  ? fs
      .readdirSync(path.join(sample, dirs[0].name))
      .find((f) => f.endsWith(".webp"))
  : null;

if (!firstWebp) {
  console.error("No sample webp found");
  process.exit(1);
}

const input = fs.readFileSync(path.join(sample, dirs[0].name, firstWebp));
console.log("Sample:", dirs[0].name, firstWebp, input.length, "bytes");

const { data, info } = await sharp(input)
  .rotate()
  .resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true })
  .webp({ quality: 82, effort: 4 })
  .toBuffer({ resolveWithObject: true });

console.log("Sharp OK:", info.width, "x", info.height, data.length, "bytes");

const storage = createClient(url, key);
const objectPath = `test-upload/${crypto.randomUUID()}.webp`;
const { error } = await storage.storage.from("product-images").upload(objectPath, data, {
  contentType: "image/webp",
  upsert: false,
});

if (error) {
  console.error("Upload FAILED:", error);
  process.exit(1);
}

const { data: pub } = storage.storage.from("product-images").getPublicUrl(objectPath);
console.log("Upload OK:", pub.publicUrl);

await storage.storage.from("product-images").remove([objectPath]);
console.log("Cleanup OK");
