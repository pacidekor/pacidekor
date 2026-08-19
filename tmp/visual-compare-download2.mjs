import fs from "node:fs";
import path from "node:path";

const extra = {
  NSGKELTE: "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/f53fdf71-136e-4df0-8370-fa6f148406fb.webp",
  "3K695XDV": "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/f81cf752-3280-4a0b-afc2-5076a80367e5.webp",
  FWG994ZY: "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/4497ae7e-3d35-4bbc-a5c6-25bf3c434133.webp",
  HVEM6XEA: "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/bb48f82c-cc79-45a3-be40-e6ae06a6a77e.webp",
  "883T8ZKL": "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/c882d319-2769-422c-a0c0-8cfe2ae162f2.webp",
  "2H78FKP6": "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/a9124d4d-d42b-42b8-8d5a-f1e5e3bb7c5c.webp",
  KQ4L9HSH: "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/e9e900c1-158c-4305-b303-8480529e3473.webp",
  EPU4MZJJ: "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/af717aa6-d8ee-4ee6-8f0a-8e9c4892137d.webp",
  N8JXPFYH: "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/dcb75640-c9c2-4d5c-be93-2ddc83c80d97.webp",
};

const dir = "tmp/visual-compare";
for (const [sku, url] of Object.entries(extra)) {
  const webp = path.join(dir, `${sku}.webp`);
  const r = await fetch(url);
  if (!r.ok) { console.log("FAIL", sku); continue; }
  fs.writeFileSync(webp, Buffer.from(await r.arrayBuffer()));
  console.log("ok", sku);
}
