const fs = require("fs");
const path = require("path");

// Load env
const envPath = path.join(__dirname, "..", ".env.local");
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const uuids = new Set(
  JSON.parse(fs.readFileSync(path.join(__dirname, "_matched-uuids.json"), "utf8")),
);

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const res = await fetch(`${url}/rest/v1/products?select=id,images`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const products = await res.json();
  console.log("E-shop products:", products.length);

  const matched = new Set();
  for (const p of products) {
    for (const img of p.images || []) {
      for (const uuid of uuids) {
        if (img.includes(uuid)) {
          matched.add(p.id);
          break;
        }
      }
    }
  }
  console.log("E-shop products matched by raw dump:", matched.size);
  console.log("E-shop products NOT matched:", products.length - matched.size);
}

main().catch(console.error);
