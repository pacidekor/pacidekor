BEGIN;

-- 1) Fiala: keep PD-X58777SR, add Zeleno-ružová + krémová + biela photos
UPDATE products SET
  name = 'Fiala',
  slug = 'fiala',
  color_ids = ARRAY[
    'fialova','zlta','ruzova','modra',
    'custom:6b7f5a-d4a0a8:Zeleno-ru%C5%BEov%C3%A1',
    'kremova','biela'
  ]::text[],
  images = images || ARRAY[
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/12e9bde9-7626-4158-bbfe-6b3c8d32f927.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/a2603a17-5409-4cb3-a463-3a542272461f.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/0e49c2e7-0154-4e0c-ab7b-a7cc7674733c.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/f0b506bd-be5b-4d0d-9d70-40f006481c44.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/a36def4d-5a4c-434a-8d77-d45f946d3049.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/3fed4b4a-7aa2-41c3-9931-5547d625adaf.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/1b612747-c56b-4a45-8d8e-fbf8b51f5906.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/6346679c-ed54-4cc1-950d-baedac73f5dd.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/54ef1e7e-7d97-4755-a883-5d1f2eb154aa.webp'
  ]::text[],
  color_image_map = '{
    "fialova":[0,1,2],
    "zlta":[3,4,5],
    "ruzova":[6,7,8],
    "modra":[9,10,11],
    "custom:6b7f5a-d4a0a8:Zeleno-ru%C5%BEov%C3%A1":[12,13,14],
    "kremova":[15,16,17],
    "biela":[18,19,20]
  }'::jsonb,
  updated_at = now()
WHERE sku = 'PD-X58777SR';

-- 2) Voskovka
UPDATE products SET
  name = 'Voskovka',
  slug = 'voskovka',
  color_ids = ARRAY['fialova','kremova']::text[],
  images = images || ARRAY[
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/5b537d39-07e7-4745-bf5e-17416475e7ac.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/5f2a7a6b-140e-479a-9443-6e2ebb7d162f.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/9fa005b4-ff3d-48ac-a516-f1b35a0193b2.webp'
  ]::text[],
  color_image_map = '{"fialova":[0,1,2],"kremova":[3,4,5]}'::jsonb,
  updated_at = now()
WHERE sku = 'PD-N4B8Q2KQ';

-- 3) Mečík: keep 6 colors, add extra white photos from Mečík biely + Gladiola
UPDATE products SET
  name = 'Mečík',
  slug = 'mecik',
  color_image_map = jsonb_set(
    color_image_map,
    '{biela}',
    '[15,17,18,19,20,21,22]'::jsonb
  ),
  images = images || ARRAY[
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/7e7604c9-b7cb-4d0c-b9d0-decb4344505e.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/640f25f1-73c0-4c21-ab17-e23ae23cb760.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/43c58a0d-2d04-4492-a36a-89b1fc3b72f9.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/4db84265-e90b-46eb-983a-ac3ef942764a.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/5b7e550a-c0fd-40c7-bb2b-92c525cbdb63.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/831c1231-54fc-40e6-8378-5aca5e791ffc.webp'
  ]::text[],
  updated_at = now()
WHERE sku = 'PD-PTLYU96G';

-- 4) Gypsofilka: add white
UPDATE products SET
  color_ids = color_ids || ARRAY['biela']::text[],
  images = images || ARRAY[
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/b341f8e2-f420-4648-a414-ed7dde2a4056.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/4b0284f4-08f5-4b0c-a97f-61fef191f4cc.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/17b8859c-75af-4f69-9971-d0d8273cf1b5.webp'
  ]::text[],
  color_image_map = color_image_map || '{"biela":[7,8,9]}'::jsonb,
  updated_at = now()
WHERE sku = 'PD-SZZBEPH8';

-- 5) Kytica chryzantém: add biela + cervena
UPDATE products SET
  color_ids = ARRAY['zlta','kremova','biela','cervena']::text[],
  images = images || ARRAY[
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/9f35f122-ce47-48e5-8c9d-b10f6d8c053f.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/e1065a5f-ec72-4078-b2aa-c57eed97c3c3.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/c71ddf04-20bf-4ac4-9983-0e08240a03c8.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/25a1c9e7-ad0f-4df8-9c97-5528d4cc4d84.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/79665d24-705b-4db0-afa2-d2c05c4778cc.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/9ef2a825-1f3d-427f-a600-5bf394b8ec4e.webp'
  ]::text[],
  color_image_map = color_image_map || '{"biela":[6,7,8],"cervena":[9,10,11]}'::jsonb,
  updated_at = now()
WHERE sku = 'PD-TZDGX9ND';

-- 6) Exclusive 45 cm: drop color from name (slug after duplicate delete)
UPDATE products SET
  name = 'Pivonka kytica Exclusive 45 cm',
  updated_at = now()
WHERE sku = 'PD-NQ4Z52ZH';

-- Delete merged cards (cart/favorites/discounts cascade)
DELETE FROM products WHERE sku IN (
  'PD-E5VALBXA',
  'PD-QMT2GGBK',
  'PD-7BHJ3NCA',
  'PD-X3ZLNLMN',
  'PD-W3SBVZZP',
  'PD-NWDB3C22',
  'PD-D7TJ3235',
  'PD-K4T58VB7',
  'PD-NSGKELTE',
  'PD-264E8NE9',
  'PD-GGJ666RA',
  'PD-9H2VV42J'
);

UPDATE products SET
  slug = 'pivonka-kytica-exclusive-45-cm',
  updated_at = now()
WHERE sku = 'PD-NQ4Z52ZH';

COMMIT;
