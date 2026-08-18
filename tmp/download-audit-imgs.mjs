import fs from "node:fs";
import path from "node:path";

const groups = {
  fiala: [
    ["X3ZLNLMN", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/970f0022-8626-4074-ab57-37dd3b0f9bc7.webp"],
    ["7BHJ3NCA", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/f0b506bd-be5b-4d0d-9d70-40f006481c44.webp"],
    ["X58777SR", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/36c38bb9-2f21-4f00-b6ca-ed87e6631b3e.webp"],
    ["E5VALBXA", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/98f00d43-6d11-4d95-a03a-feb815809bc8.webp"],
    ["QMT2GGBK", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/12e9bde9-7626-4158-bbfe-6b3c8d32f927.webp"],
  ],
  voskovka: [
    ["N4B8Q2KQ", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/af717aa6-d8ee-4ee6-8f0a-8e9c4892137d.webp"],
    ["W3SBVZZP", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/5b537d39-07e7-4745-bf5e-17416475e7ac.webp"],
  ],
  gypso: [
    ["K4T58VB7", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/b341f8e2-f420-4648-a414-ed7dde2a4056.webp"],
    ["SZZBEPH8", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/dcb75640-c9c2-4d5c-be93-2ddc83c80d97.webp"],
  ],
  hortenzia: [
    ["MHY4YWPN", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/b80c1b58-03b0-4b33-9a7e-2b390dc3038f.webp"],
    ["ZM9T7G26", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/e3a09023-ec0d-43f5-9e8b-2007e39c3488.webp"],
    ["MFYC8XME", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/e29853a8-3ab0-471c-9dd6-5676749aa831.webp"],
    ["2VRMZHEH", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/1bc386c5-8e81-4a9a-a87f-993958dfcd83.webp"],
    ["PNDTQUKV", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/8b064732-e838-4185-aa59-e139a017f8fb.webp"],
    ["P73SPS8U", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/83c75018-24e3-47bb-882e-5fdd5905e37e.webp"],
    ["883T8ZKL", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/c882d319-2769-422c-a0c0-8cfe2ae162f2.webp"],
    ["DQUM4397", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/090a7119-1e90-4344-82aa-a884f110d315.webp"],
    ["46BAR5MD", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/edec9fdb-1e15-42f7-8d8a-c402a3ad2190.webp"],
  ],
  georgina: [
    ["SJVV4WK2", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/2463d3b7-2331-414f-88d0-9aa8fe558f9f.webp"],
    ["D3X5NDZN", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/bbd2a2f1-175d-4fcf-897b-e2647c8ac99f.webp"],
    ["ZYY8G328", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/d483cb0c-d153-45c9-849d-1b682b931d5b.webp"],
    ["R6WCKM7X", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/c412539d-4920-4f95-a3d5-721f57a9ed35.webp"],
    ["33WWXG4C", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/403e2b4a-9bea-4ae5-9b56-3182b66bcb20.webp"],
    ["H77ZU33M", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/6c379072-ab52-4b42-88e0-ed7ab65c48df.webp"],
    ["VBKGGJYF", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/a006aeeb-2394-40c8-96f6-0390dd891bc7.webp"],
    ["L8JU6QL6", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/e39f7ba1-1e34-455f-8c0f-785b0e0f152e.webp"],
    ["AMQ7TYEH", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/dc699b8d-b5dd-438d-91df-378c918445de.webp"],
  ],
  chryz: [
    ["HVEM6XEA", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/bb48f82c-cc79-45a3-be40-e6ae06a6a77e.webp"],
    ["ABN8TRKA", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/af592c3b-eb47-495b-bf92-5d1cc019d30f.webp"],
    ["T7P5476C", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/57b609ab-2a6a-4261-8d5a-d42bd19d358f.webp"],
    ["TZDGX9ND", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/da2b28fc-ad8c-4ed2-be2a-dcaa0a144994.webp"],
    ["264E8NE9", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/7f00e7b6-abe5-46be-9765-21f78d09991f.webp"],
    ["YGWYYMFC", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/1af4dfe5-a1af-4f2e-a036-b10fa88d45bd.webp"],
    ["GGJ666RA", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/25a1c9e7-ad0f-4df8-9c97-5528d4cc4d84.webp"],
    ["YA9PU8FG", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/2e02c037-5a1a-45a0-82e9-89d44bfcc63f.webp"],
    ["BA3TZLD2", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/73ce2e34-c5ac-4d3d-bc86-b2a3ea521a36.webp"],
    ["LTT8KGDY", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/6f4c61f1-97e9-4e8c-9b22-060c4b7f6e32.webp"],
    ["VFTKHAMK", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/9e80baf6-6867-42d3-8fa7-38b4fd848715.webp"],
  ],
  pivonky: [
    ["BT6XFTMN", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/11dc7edf-b449-4cda-80c1-2be8f0180a49.webp"],
    ["8WZHZJGT", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/4497ae7e-3d35-4bbc-a5c6-25bf3c434133.webp"],
    ["NSGKELTE", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/f53fdf71-136e-4df0-8370-fa6f148406fb.webp"],
    ["3K695XDV", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/f81cf752-3280-4a0b-afc2-5076a80367e5.webp"],
    ["U9QXUULC", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/dc390eb7-c7af-47ad-9a2d-31c4e8a270cb.webp"],
    ["XY5P2R7F", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/2fde03e5-9295-4f17-919d-83b38588b1b5.webp"],
    ["2HULXW68", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/a9124d4d-d42b-42b8-8d5a-f1e5e3bb7c5c.webp"],
    ["NQ4Z52ZH", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/ccc57042-ae59-4210-bded-e808e83e0fe8.webp"],
    ["9H2VV42J", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/f94bca17-42b6-4b7a-8a49-7b2f304c54e5.webp"],
  ],
  ceresna: [
    ["Z2SS7VFE", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/d3b66e71-7cb7-4621-a94d-ca5ad4e514c2.webp"],
    ["4K2KVXK7", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/2a33e50c-b244-41e0-b46b-65ff045f6f75.webp"],
    ["ZRJBU48L", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/27e220cc-bf8f-4ac5-8684-624310cf3b0d.webp"],
    ["SGY647CX", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/33e68494-5494-4a63-8227-0baad56caafe.webp"],
    ["BWTYVGQW", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/a8430996-08a3-4aea-ba7e-5537dc5a1d33.webp"],
  ],
  orchidea: [
    ["HMKSMX73", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/38fc48d1-2535-4557-baaf-ad7352baca54.webp"],
    ["CKTCNMDP", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/3559d967-e5eb-4a1a-82c8-ff86ec138253.webp"],
    ["R5W5EN8D", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/5686f653-0fb5-431c-9465-d557d76ff652.webp"],
  ],
  mecik: [
    ["D7TJ3235", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/4db84265-e90b-46eb-983a-ac3ef942764a.webp"],
    ["NWDB3C22", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/7e7604c9-b7cb-4d0c-b9d0-decb4344505e.webp"],
    ["PTLYU96G", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/3232ac27-ac3c-4784-9cb5-7cd728b96c4d.webp"],
  ],
  eukalyptus: [
    ["B5RDZFV7", "https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/"],
  ],
};

const extra = {
  eukalyptus: [
    { sku: "B5RDZFV7", url: null },
  ],
};

const dir = "tmp/audit-imgs";
fs.mkdirSync(dir, { recursive: true });

for (const [group, items] of Object.entries(groups)) {
  const gdir = path.join(dir, group);
  fs.mkdirSync(gdir, { recursive: true });
  for (const [sku, url] of items) {
    const out = path.join(gdir, `${sku}.webp`);
    if (fs.existsSync(out) && fs.statSync(out).size > 1000) continue;
    const r = await fetch(url);
    if (!r.ok) {
      console.log("FAIL", sku, r.status);
      continue;
    }
    fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
    console.log("ok", group, sku, fs.statSync(out).size);
  }
}
