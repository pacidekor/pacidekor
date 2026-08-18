BEGIN;

-- Vratit cilove karty na stav pred sloucenim (uvolni i puvodni slugy).

UPDATE products SET
  name = 'Stopka fialy',
  slug = 'stopka-fialy',
  color_ids = ARRAY['fialova','zlta','ruzova','modra']::text[],
  images = images[1:12],
  color_image_map = '{
    "fialova":[0,1,2],
    "zlta":[3,4,5],
    "ruzova":[6,7,8],
    "modra":[9,10,11]
  }'::jsonb,
  updated_at = now()
WHERE sku = 'PD-X58777SR';

UPDATE products SET
  name = 'Voskovka fialová',
  slug = 'voskovka-fialova',
  color_ids = ARRAY['fialova']::text[],
  images = images[1:3],
  color_image_map = '{"fialova":[0,1,2]}'::jsonb,
  updated_at = now()
WHERE sku = 'PD-N4B8Q2KQ';

UPDATE products SET
  name = 'Mečík na stonke',
  slug = 'mecik-na-stonke',
  images = images[1:15] || ARRAY[
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/f7ac4179-7aa9-4e3f-810d-3b08d9738bc8.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/a1229cd5-3812-44ca-a0d2-3c769ba9ab50.webp'
  ]::text[],
  color_image_map = '{
    "zlta":[0,1,2],
    "fialova":[3,4,5],
    "cervena":[6,7,8],
    "oranzova":[9,10,11],
    "ruzova":[12,13,14],
    "biela":[15]
  }'::jsonb,
  updated_at = now()
WHERE sku = 'PD-PTLYU96G';

UPDATE products SET
  color_ids = ARRAY[
    'custom:ffc0cb:Svetloru%C5%BEov%C3%A1',
    'custom:c11c84:Tmavoru%C5%BEov%C3%A1'
  ]::text[],
  images = images[1:7],
  color_image_map = '{
    "custom:ffc0cb:Svetloru%C5%BEov%C3%A1":[0,1,2],
    "custom:c11c84:Tmavoru%C5%BEov%C3%A1":[3,4,5]
  }'::jsonb,
  updated_at = now()
WHERE sku = 'PD-SZZBEPH8';

UPDATE products SET
  color_ids = ARRAY['zlta','kremova']::text[],
  images = images[1:6],
  color_image_map = '{"zlta":[0,1,2],"kremova":[3,4,5]}'::jsonb,
  updated_at = now()
WHERE sku = 'PD-TZDGX9ND';

UPDATE products SET
  name = 'Pivonka kytica biela Exclusive 45 cm',
  slug = 'pivonka-kytica-biela-exclusive-45-cm',
  updated_at = now()
WHERE sku = 'PD-NQ4Z52ZH';

-- Obnovit 12 smazanych karet se stejnymi UUID/SKU/slugy.

INSERT INTO products (
  id, sku, slug, name, description, price, category, subcategory_id, druh_id,
  color_ids, color_image_map, images, packaging, details,
  in_stock, is_new, created_at, updated_at
) VALUES
(
  '0a77c3cb-5e69-4886-8763-350da24e7aab',
  'PD-E5VALBXA',
  'fiala-fialova',
  'Fiala fialová',
  $d$Vysoká stopka fialy s hustým klasom riasených fialových kvetov a zelenými púčikmi na vrchole. Úzke listy pri stopke dodávajú kvetu prirodzený vzhľad. Ideálna do vysokých váz a predĺžených aranžmánov.$d$,
  '1,00 €', 'Umelé kvety', 'stopkove-kvety', 'fiala',
  ARRAY['fialova']::text[],
  '{"fialova":[0,1,2]}'::jsonb,
  ARRAY[
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/98f00d43-6d11-4d95-a03a-feb815809bc8.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/5ce0b6db-c5df-4d26-812a-f9b617434c68.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/ea2b1088-c3a5-4456-a8d4-ab3549b7b1bd.webp'
  ]::text[],
  '[]'::jsonb, '[]'::jsonb, true, true,
  '2026-08-17 22:19:40.713529+00', now()
),
(
  '823b6513-b8dc-4d14-bb83-51c290208ea1',
  'PD-QMT2GGBK',
  'fiala-na-stopke',
  'Fiala na stopke',
  $d$Vysoká fiala s hustým klasom riasených kvetov a púčikmi na konci stonky. Pôsobí slávnostne a vyplní vysokú vázu bez ďalších doplnkov. Hodí sa do predĺžených kytíc aj ako solitér.$d$,
  '1,00 €', 'Umelé kvety', 'stopkove-kvety', 'fiala',
  ARRAY['custom:6b7f5a-d4a0a8:Zeleno-ru%C5%BEov%C3%A1','ruzova','fialova']::text[],
  '{
    "custom:6b7f5a-d4a0a8:Zeleno-ru%C5%BEov%C3%A1":[0,1,2],
    "ruzova":[3,4,5],
    "fialova":[6,7,8]
  }'::jsonb,
  ARRAY[
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/12e9bde9-7626-4158-bbfe-6b3c8d32f927.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/a2603a17-5409-4cb3-a463-3a542272461f.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/0e49c2e7-0154-4e0c-ab7b-a7cc7674733c.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/243c5490-d069-4e74-a210-301620c55149.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/ac00f518-9de4-46b9-97d6-db8fb226eec9.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/a13c0b77-e1d4-47b9-ae33-491bbbd2d54d.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/fff9109f-87c8-48bd-bc4d-343df179059d.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/54d9fad5-3a8d-4685-b620-a559f7d7d898.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/6c34f570-50af-4699-bcc4-fc92e66af408.webp'
  ]::text[],
  '[]'::jsonb, '[]'::jsonb, true, true,
  '2026-08-18 09:20:45.568263+00', now()
),
(
  '0c733620-ea70-4baa-8cb3-d736a3a7b2dd',
  'PD-7BHJ3NCA',
  'fiala-kremova',
  'Fiala krémová',
  $d$Umelý stonok fialy (Matthiola) s hustým klasom krémových/smotanových kvetov a zúbkovanými zelenými listami.$d$,
  '1,00 €', 'Umelé kvety', 'stopkove-kvety', 'fiala',
  ARRAY['kremova','biela']::text[],
  '{"kremova":[0,1,2],"biela":[3,4,5]}'::jsonb,
  ARRAY[
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/f0b506bd-be5b-4d0d-9d70-40f006481c44.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/a36def4d-5a4c-434a-8d77-d45f946d3049.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/3fed4b4a-7aa2-41c3-9931-5547d625adaf.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/1b612747-c56b-4a45-8d8e-fbf8b51f5906.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/6346679c-ed54-4cc1-950d-baedac73f5dd.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/54ef1e7e-7d97-4755-a883-5d1f2eb154aa.webp'
  ]::text[],
  '[]'::jsonb, '[]'::jsonb, true, true,
  '2026-07-31 19:49:12.6587+00', now()
),
(
  'ccfd17df-ac41-4f09-844c-ff79aad7e462',
  'PD-X3ZLNLMN',
  'fiala-zlta',
  'Fiala žltá',
  $d$Umelý stonok fialy (Matthiola) s hustým klasom drobných žltých kvetov a zúbkovanými zelenými listami.$d$,
  '1,00 €', 'Umelé kvety', 'stopkove-kvety', 'fiala',
  ARRAY['zlta']::text[],
  '{"zlta":[0,1,2]}'::jsonb,
  ARRAY[
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/970f0022-8626-4074-ab57-37dd3b0f9bc7.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/fbc79950-015f-4836-a2ab-58fd09b88da1.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/12193404-f44a-414d-bb86-f863966e2cc9.webp'
  ]::text[],
  '[]'::jsonb, '[]'::jsonb, true, true,
  '2026-07-31 19:32:58.502906+00', now()
),
(
  '5e150134-1392-4ecd-b4c1-b93f32a63f0e',
  'PD-W3SBVZZP',
  'voskovka-kremova',
  'Voskovka krémová',
  $d$Umelá voskovka s drobnými krémovými kvetmi, ihlicovitou zeleňou a tenkým hnedým stonkom. Vzdušný filler.$d$,
  '1,00 €', 'Umelé kvety', 'stopkove-kvety', 'voskovka',
  ARRAY['kremova']::text[],
  '{"kremova":[0,1,2]}'::jsonb,
  ARRAY[
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/5b537d39-07e7-4745-bf5e-17416475e7ac.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/5f2a7a6b-140e-479a-9443-6e2ebb7d162f.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/9fa005b4-ff3d-48ac-a516-f1b35a0193b2.webp'
  ]::text[],
  '[]'::jsonb, '[]'::jsonb, true, true,
  '2026-07-31 19:38:08.112614+00', now()
),
(
  'c38071fa-f185-4790-8e3a-7364e3dbf1bd',
  'PD-NWDB3C22',
  'mecik-biely',
  'Mečík biely',
  $d$Elegantný biely mečík s dlhým klasom otvorených kvetov a zelenými púčikmi na vrchole. Mečovité listy pri stonke podčiarkujú typický vzpriamený tvar. Hodí sa do vysokých váz a slávnostných aranžmánov.$d$,
  '1,00 €', 'Umelé kvety', 'stopkove-kvety', 'mecik',
  ARRAY['biela']::text[],
  '{"biela":[0,1,2]}'::jsonb,
  ARRAY[
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/7e7604c9-b7cb-4d0c-b9d0-decb4344505e.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/640f25f1-73c0-4c21-ab17-e23ae23cb760.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/43c58a0d-2d04-4492-a36a-89b1fc3b72f9.webp'
  ]::text[],
  '[]'::jsonb, '[]'::jsonb, true, true,
  '2026-08-17 22:21:22.172466+00', now()
),
(
  'd7e13235-7e31-4c0f-8dae-41cf724c8362',
  'PD-D7TJ3235',
  'gladiola-biela-zvazok',
  'Gladiola biela - zväzok',
  $d$Umelé biele gladioly (mečíky) s tromi otvorenými kvetmi a zelenými púčikmi na tenkom stonku. Vhodné do vázy.$d$,
  '1,00 €', 'Umelé kvety', 'stopkove-kvety', 'gladiola',
  ARRAY['biela']::text[],
  '{"biela":[0,1,2]}'::jsonb,
  ARRAY[
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/4db84265-e90b-46eb-983a-ac3ef942764a.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/5b7e550a-c0fd-40c7-bb2b-92c525cbdb63.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/831c1231-54fc-40e6-8378-5aca5e791ffc.webp'
  ]::text[],
  '[]'::jsonb, '[]'::jsonb, true, true,
  '2026-07-31 20:02:27.553896+00', now()
),
(
  '98274afa-d46f-49ad-b6bd-77e51bcafa31',
  'PD-K4T58VB7',
  'gypsofilka-drobne-sukvetia',
  'Gypsofilka - drobné súkvetia',
  $d$Umelý stonok s drobnými bielymi guľovitými súkvetiami na vetvenom zelenom stonku. Filler do vázy.$d$,
  '1,00 €', 'Umelé kvety', 'stopkove-kvety', 'gypsofilka',
  ARRAY['biela']::text[],
  '{"biela":[0,1,2]}'::jsonb,
  ARRAY[
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/b341f8e2-f420-4648-a414-ed7dde2a4056.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/4b0284f4-08f5-4b0c-a97f-61fef191f4cc.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/17b8859c-75af-4f69-9971-d0d8273cf1b5.webp'
  ]::text[],
  '[]'::jsonb, '[]'::jsonb, true, true,
  '2026-07-31 20:11:32.396937+00', now()
),
(
  '14f3b091-e17e-4f8c-88fa-c5f8d39946dc',
  'PD-NSGKELTE',
  'kytica-pivoniek-3',
  'Kytica pivoniek',
  $d$Bohatá umelá kytica s plnými, vrstvenými kvetmi pivoniek a sýtozelenými listami. Husté okvetné lístky pôsobia mäkkým a realistickým dojmom. Ideálna ako výrazná dekorácia do vázy alebo stred aranžmánu.$d$,
  '1,00 €', 'Umelé kvety', 'kytice', 'pivonie',
  ARRAY['custom:800020:Bordov%C3%A1','kremova']::text[],
  '{"custom:800020:Bordov%C3%A1":[0,1,2],"kremova":[3,4,5]}'::jsonb,
  ARRAY[
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/f53fdf71-136e-4df0-8370-fa6f148406fb.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/86c9895b-a986-4693-a3a6-cb7f6a29cf97.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/c17ed7fe-0f9c-4a59-8bc3-641bf150d178.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/aba1a691-0e07-4e01-916a-eae4b734fa18.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/1ad95320-2827-484b-8e97-ceefb50af669.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/808b11d3-7a39-4768-9b8e-64445cc7e8fe.webp'
  ]::text[],
  '[]'::jsonb, '[]'::jsonb, true, true,
  '2026-08-17 20:11:29.355379+00', now()
),
(
  'a272f261-9e2b-431f-8510-b5da0e9e20fe',
  'PD-264E8NE9',
  'kytica-chryzantem-2',
  'Kytica chryzantém',
  $d$Umelá kytica chryzantém s guľatými, hustými kvetmi a zubatými zelenými listami. Pôsobí bohato a veľmi realisticky. Skvele sa hodí do vázy v interiéri aj na trvácne aranžmány.$d$,
  '1,00 €', 'Umelé kvety', 'kytice', 'chryzantema',
  ARRAY['kremova','biela']::text[],
  '{"kremova":[0,1,2],"biela":[3,4,5]}'::jsonb,
  ARRAY[
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/7f00e7b6-abe5-46be-9765-21f78d09991f.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/c9424735-7fd8-435f-bfcd-ff5278c41447.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/99680ae6-5463-4ea0-a0ce-eb40567a0d95.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/9f35f122-ce47-48e5-8c9d-b10f6d8c053f.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/e1065a5f-ec72-4078-b2aa-c57eed97c3c3.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/c71ddf04-20bf-4ac4-9983-0e08240a03c8.webp'
  ]::text[],
  '[]'::jsonb, '[]'::jsonb, true, true,
  '2026-08-17 21:46:40.932221+00', now()
),
(
  'aa6666aa-17e2-4f8c-88fa-c5f8d39946dd',
  'PD-GGJ666RA',
  'kytica-chryzantem-duplikat',
  'Kytica chryzantém - duplikát',
  $d$Umelá kytica chryzantém s hustými, guľatými kvetmi a zubatými zelenými listami. Sýty bordový odtieň pôsobí elegantne a výrazne. Ideálna dekorácia do vázy pre moderný aj klasický interiér.$d$,
  '1,00 €', 'Umelé kvety', 'kytice', 'chryzantema',
  ARRAY['cervena']::text[],
  '{"cervena":[0,1,2]}'::jsonb,
  ARRAY[
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/25a1c9e7-ad0f-4df8-9c97-5528d4cc4d84.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/79665d24-705b-4db0-afa2-d2c05c4778cc.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/9ef2a825-1f3d-427f-a600-5bf394b8ec4e.webp'
  ]::text[],
  '[]'::jsonb, '[]'::jsonb, true, true,
  '2026-08-17 22:24:17.549755+00', now()
),
(
  '30f26c9e-cb08-475e-badd-35ae45ac6317',
  'PD-9H2VV42J',
  'pivonka-kytica-exclusive-45-cm',
  'Pivonka kytica Exclusive 45 cm',
  $d$Umelá kytica plných krémových pivoniek s papradím, sivozelenými listami a drobnými filler akcentmi. Exclusive, cca 45 cm.$d$,
  '1,00 €', 'Umelé kvety', 'kytice', 'pivonie',
  ARRAY['biela']::text[],
  '{}'::jsonb,
  ARRAY[
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/f94bca17-42b6-4b7a-8a49-7b2f304c54e5.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/8d1d5c2d-38cb-4c2e-bd4a-5f2466a01852.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/22437e1d-5c63-4ecb-a461-0dffd2af4c52/5504ef22-0a12-4dfc-9967-42675a6aadaf.webp'
  ]::text[],
  '[]'::jsonb,
  '[{"title":"Doprava","content":"Objednávky expedujeme do 24 hodín. Doručenie kuriérom obvykle do 1-2 pracovných dní na Slovensku."}]'::jsonb,
  true, true,
  '2026-07-31 21:05:40.932854+00', now()
);

COMMIT;
