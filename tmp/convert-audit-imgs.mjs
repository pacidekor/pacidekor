import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const extras = [
  ["eukalyptus", "B5RDZFV7", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/1012e0a0-bbd2-452f-a1bc-bc05cefe5746.webp"],
  ["eukalyptus", "FERE5QDB", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/0d5a7486-dd17-42c3-9cf6-f1af7d067c6e.webp"],
  ["eukalyptus", "DY5G4E97", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/862be2de-a991-4396-8ed7-654c63b76b27.webp"],
  ["eukalyptus", "AQYA5XQT", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/ed3eb2d6-b7c7-4c33-9cd1-2b46a1eb507b.webp"],
  ["eukalyptus", "X83Q8CN4", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/b56a9306-9681-409f-a7f4-4eeed5de0aaa.webp"],
  ["eukalyptus", "YYHUWX3T", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/0e33a276-cd0e-4823-89dd-67e2b5604ea3.webp"],
  ["eukalyptus", "6GPM2GLZ", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/2cb535c8-1f01-40d3-a9a1-65e86419a515.webp"],
  ["asparagus", "K24X9BZH", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/8fc39ec2-70d0-49bb-9794-887ebeba548b.webp"],
  ["asparagus", "N8JXPFYH", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/7a7099a5-aa6f-46d2-a4b9-604b1266059e.webp"],
  ["jazmin", "W46KRFGE", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/e540ff64-8c8d-4e31-ae46-3cd9d629420b.webp"],
  ["jazmin", "EKSUPEFJ", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/9824ff64-e02c-46e0-a59b-46148a4561ad.webp"],
  ["klincek", "2PQSPSVK", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/e8135246-b242-4d51-b71c-00e99da6dff9.webp"],
  ["klincek", "9PN37B4C", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/3f407fd3-060b-4eb9-bea1-987f735f922b.webp"],
  ["iskernik", "2H78FKP6", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/3c6ed778-f992-4137-9373-3a0c11a4f192.webp"],
  ["iskernik", "6CXL3TUG", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/6e860937-6dbd-4abf-a62d-91f2ccce66b5.webp"],
  ["iskernik", "KFXU8BKF", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/49ea8052-f011-48d7-9350-4b9935ce9021.webp"],
  ["iskernik", "AGNWJVHS", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/a3e4bf87-f48e-4292-9772-1da0810224c3.webp"],
  ["iskernik", "GDR4HC3F", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/b7f32489-3bfe-42d4-beab-04ed60a6df21.webp"],
];

for (const [group, sku, url] of extras) {
  const gdir = path.join("tmp/audit-imgs", group);
  fs.mkdirSync(gdir, { recursive: true });
  const r = await fetch(url);
  if (!r.ok) {
    console.log("FAIL", sku, r.status);
    continue;
  }
  fs.writeFileSync(path.join(gdir, `${sku}.webp`), Buffer.from(await r.arrayBuffer()));
  console.log("dl", group, sku);
}

async function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...(await walk(p)));
    else if (ent.name.endsWith(".webp")) out.push(p);
  }
  return out;
}

const files = await walk("tmp/audit-imgs");
for (const file of files) {
  const jpg = file.replace(/\.webp$/i, ".jpg");
  await sharp(file).jpeg({ quality: 72 }).resize(700).toFile(jpg);
  console.log("jpg", jpg);
}
