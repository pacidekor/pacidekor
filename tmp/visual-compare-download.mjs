import fs from "node:fs";
import path from "node:path";

const pairs = [
  // ruze kytica
  ["S3LPHA87", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/d8c6d17d-fe4d-4ca6-b70a-928ab76e77f9.webp"],
  ["JLBY9GW3", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/aa2180c6-8927-415f-b7d5-8c4c8111ab75.webp"],
  ["YJ7ZPJWC", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/b6860923-8dda-4314-bcff-0187db505787.webp"],
  ["H3GY6UTW", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/9913bc24-bded-457c-8be4-79ad0ed27378.webp"],
  // ruze stopka
  ["9ATLJP9Q", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/2f3b1e5d-55aa-47be-8f56-034a208065e2.webp"],
  ["L7CBK6X6", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/0891c8ee-dd76-468a-b43f-a9400f73d8fc.webp"],
  ["44VCYE7D", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/418f9cf6-a8c3-492d-bf3b-bc3d8fcdd43b.webp"],
  ["MWDXSGMY", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/eb216622-5913-44e3-b891-6ec6a8b60715.webp"],
  // pivonky
  ["XY5P2R7F", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/2fde03e5-9295-4f17-919d-83b38588b1b5.webp"],
  ["U9QXUULC", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/dc390eb7-c7af-47ad-9a2d-31c4e8a270cb.webp"],
  ["2HULXW68", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/a9124d4d-d42b-42b8-8d5a-f1e5e3bb7c5c.webp"],
  ["DEV49V3H", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/22bc1463-6dad-4f87-b2e7-3c4eb2a3f612.webp"],
  ["8WZHZJGT", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/4497ae7e-3d35-4bbc-a5c6-25bf3c434133.webp"],
  ["2SSHQQWS", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/3e0458a6-905c-4439-b153-46f5e659dd9f.webp"],
  ["NQ4Z52ZH", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/ccc57042-ae59-4210-bded-e808e83e0fe8.webp"],
  ["9H2VV42J", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/f94bca17-42b6-4b7a-8a49-7b2f304c54e5.webp"],
  ["P3DFUXKY", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/cb52ddc5-b02b-4930-9a45-4876456ef4f6.webp"],
  ["9FJNTA4F", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/2a5372a6-aaa2-4557-b4fb-8e2596341cc0.webp"],
  // fiala
  ["X58777SR", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/36c38bb9-2f21-4f00-b6ca-ed87e6631b3e.webp"],
  ["E5VALBXA", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/98f00d43-6d11-4d95-a03a-feb815809bc8.webp"],
  ["7BHJ3NCA", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/f0b506bd-be5b-4d0d-9d70-40f006481c44.webp"],
  ["X3ZLNLMN", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/970f0022-8626-4074-ab57-37dd3b0f9bc7.webp"],
  ["QMT2GGBK", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/12e9bde9-7626-4158-bbfe-6b3c8d32f927.webp"],
  // voskovka mecik
  ["N4B8Q2KQ", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/af717aa6-d8ee-4ee6-8f0a-8e9c4892137d.webp"],
  ["W3SBVZZP", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/5b537d39-07e7-4745-bf5e-17416475e7ac.webp"],
  ["PTLYU96G", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/3232ac27-ac3c-4784-9cb5-7cd728b96c4d.webp"],
  ["NWDB3C22", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/7e7604c9-b7cb-4d0c-b9d0-decb4344505e.webp"],
  ["D7TJ3235", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/4db84265-e90b-46eb-983a-ac3ef942764a.webp"],
  // chryzantema
  ["BA3TZLD2", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/73ce2e34-c5ac-4d3d-bc86-b2a3ea521a36.webp"],
  ["YA9PU8FG", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/2e02c037-5a1a-45a0-82e9-89d44bfcc63f.webp"],
  ["VFTKHAMK", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/9e80baf6-6867-42d3-8fa7-38b4fd848715.webp"],
  ["TZDGX9ND", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/da2b28fc-ad8c-4ed2-be2a-dcaa0a144994.webp"],
  ["264E8NE9", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/7f00e7b6-abe5-46be-9765-21f78d09991f.webp"],
  // hortenzia georgina iskernik
  ["P73SPS8U", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/83c75018-24e3-47bb-882e-5fdd5905e37e.webp"],
  ["ZM9T7G26", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/e3a09023-ec0d-43f5-9e8b-2007e39c3488.webp"],
  ["H77ZU33M", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/6c379072-ab52-4b42-88e0-ed7ab65c48df.webp"],
  ["VBKGGJYF", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/a006aeeb-2394-40c8-96f6-0390dd891bc7.webp"],
  ["R6WCKM7X", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/c412539d-4920-4f95-a3d5-721f57a9ed35.webp"],
  ["AGNWJVHS", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/a3e4bf87-f48e-4292-9772-1da0810224c3.webp"],
  ["KFXU8BKF", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/49ea8052-f011-48d7-9350-4b9935ce9021.webp"],
  ["GDR4HC3F", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/b7f32489-3bfe-42d4-beab-04ed60a6df21.webp"],
  // ostatni
  ["UA3KCF6W", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/1e650866-2b01-4164-9faf-7216572f3771.webp"],
  ["5HYNFUAL", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/dfe54940-6572-4d2f-adc6-62f82d1183b0.webp"],
  ["B5RDZFV7", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/1012e0a0-bbd2-452f-a1bc-bc05cefe5746.webp"],
  ["4Q5ZSRS3", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/ba5afceb-610b-4937-9756-11e142cd7c30.webp"],
  ["EKSUPEFJ", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/9824ff64-e02c-46e0-a59b-46148a4561ad.webp"],
  ["W46KRFGE", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/e540ff64-8c8d-4e31-ae46-3cd9d629420b.webp"],
  ["SZZBEPH8", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/dcb75640-c9c2-4d5c-be93-2ddc83c80d97.webp"],
  ["K4T58VB7", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/b341f8e2-f420-4648-a414-ed7dde2a4056.webp"],
  ["9PN37B4C", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/3f407fd3-060b-4eb9-bea1-987f735f922b.webp"],
  ["2PQSPSVK", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/e8135246-b242-4d51-b71c-00e99da6dff9.webp"],
  ["A63ZBYYV", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/021525ce-cd14-4ccf-abdc-b279fcd47401.webp"],
  ["4L7MJ6WB", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/36dfd5e7-ea3c-44b9-8081-b4b033115a41.webp"],
  ["ZHFBJGDT", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/2516660e-cf02-4ed9-9936-2a061fafb438.webp"],
  ["ALL9V84K", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/134a4933-08ae-4576-b545-88f09920b39b.webp"],
];

const dir = "tmp/visual-compare";
fs.mkdirSync(dir, { recursive: true });

for (const [sku, url] of pairs) {
  const out = path.join(dir, `${sku}.webp`);
  const r = await fetch(url);
  if (!r.ok) { console.log("FAIL", sku); continue; }
  fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
  console.log("ok", sku);
}
