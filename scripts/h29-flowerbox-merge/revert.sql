-- H29 ATOMIC REVERT — restores exact pre-merge values from backup-pre.json literals.
-- Conditioned on POST-activation state (updated_at + full images/shared/map).
-- post_*_updated_at MUST be filled from results/backup-post.json after a real activate
-- (use capture-post-state.mjs → build-revert-from-backup.mjs for a concrete filled file).
-- Leaving them null forces refusal. Later edit → exception → FULL rollback.
-- Does NOT roll back app code / H07 unavailable_color_ids feature.
-- NEVER restores images via t.images[1:10] — only exact backup-pre arrays.

begin;

do $$
declare
  t public.products%rowtype;
  s082 public.products%rowtype;
  s071 public.products%rowtype;
  target_id uuid := '12e00cb2-7707-430b-b4e0-f5821fa4fc93';
  source_082 uuid := '5451a149-4bd0-4292-8d71-f6edea24cb3d';
  source_071 uuid := '3fb3a76c-7c51-4bcb-8f0c-8fa52090c6e7';
  -- Exact approved post shape (images/shared/map) — not just cardinality.
  expected_post_images text[] := array[
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/83/47ae6d17acfe-4.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/83/1196184e5d82-3.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/83/a6f128ee4198-1.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/83/6baf233020b3-2.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/83/66b9932cbdc4-5.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/83/eeac94a4de03-6.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/83/126e84c4275e-7.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/83/57f107b2fc68-8.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/83/36df2e9746f4-9.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/83/ea35852b339c-10.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/82/d0b99d30c9d8-1.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/82/2ffd41f3c102-2.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/82/40bf878fc55c-3.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/82/1061b0726fa2-4.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/71/1630a0a7794a-1.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/71/eb9cf7b33832-2.webp'
  ]::text[];
  expected_post_shared jsonb := '["https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/83/47ae6d17acfe-4.webp"]'::jsonb;
  expected_post_map jsonb := '{
    "custom:800020:Bordov%C3%A1":[4,5,6],
    "biela":[7,8,9],
    "custom:ffb6c1:Svetloru%C5%BEov%C3%A1":[1,2,3],
    "hneda":[10,13,11,12],
    "kremova":[14,15]
  }'::jsonb;
  expected_post_colors text[] := array[
    'custom:800020:Bordov%C3%A1','biela','custom:ffb6c1:Svetloru%C5%BEov%C3%A1','hneda','kremova'
  ]::text[];
  expected_082_images text[] := array[
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/82/d0b99d30c9d8-1.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/82/2ffd41f3c102-2.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/82/40bf878fc55c-3.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/82/1061b0726fa2-4.webp'
  ]::text[];
  expected_071_images text[] := array[
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/71/1630a0a7794a-1.webp',
    'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/71/eb9cf7b33832-2.webp'
  ]::text[];
  -- REQUIRED: fill from results/backup-post.json after activate (never invent production values).
  post_target_updated_at timestamptz := null;
  post_082_updated_at timestamptz := null;
  post_071_updated_at timestamptz := null;
begin
  if post_target_updated_at is null
     or post_082_updated_at is null
     or post_071_updated_at is null then
    raise exception 'H29 revert: set post_*_updated_at from activation backup-post.json before running';
  end if;

  select * into t from public.products where id = target_id for update;
  select * into s082 from public.products where id = source_082 for update;
  select * into s071 from public.products where id = source_071 for update;

  if t.id is null or s082.id is null or s071.id is null then
    raise exception 'H29 revert: missing row';
  end if;

  if t.name is distinct from 'Sada 2 okrúhlych flowerboxov so šnúrkou'
     or t.sku is distinct from 'IMP-NEJ-083'
     or t.slug is distinct from 'okruhly-flowerbox-so-snurkou-mix-farieb'
     or t.price is distinct from '5,90 €'
     or t.in_stock is distinct from true
     or t.stock_quantity is not null
     or t.packaging is distinct from '[{"id":"krabica","pieces":2}]'::jsonb
     or t.color_ids is distinct from expected_post_colors
     or t.color_image_map is distinct from expected_post_map
     or coalesce(t.unavailable_color_ids, '{}'::text[]) is distinct from '{}'::text[]
     or t.images is distinct from expected_post_images
     or t.shared_image_urls is distinct from expected_post_shared
     or t.archived_at is not null
     or t.redirect_to_product_id is not null
     or t.updated_at is distinct from post_target_updated_at
  then
    raise exception 'H29 revert: target post-state guard mismatch (later edit?)';
  end if;

  if s082.archived_at is null
     or s082.redirect_to_product_id is distinct from target_id
     or s082.sku is distinct from 'IMP-NEJ-082'
     or s082.images is distinct from expected_082_images
     or s082.updated_at is distinct from post_082_updated_at
  then
    raise exception 'H29 revert: source 082 post-state guard mismatch';
  end if;

  if s071.archived_at is null
     or s071.redirect_to_product_id is distinct from target_id
     or s071.sku is distinct from 'IMP-NEJ-071'
     or s071.images is distinct from expected_071_images
     or s071.updated_at is distinct from post_071_updated_at
  then
    raise exception 'H29 revert: source 071 post-state guard mismatch';
  end if;

  -- Exact restore from backup-pre.json (not a slice of current t.images).
  update public.products
     set name = 'Okrúhly flowerbox so šnúrkou – mix farieb',
         color_ids = array[
           'custom:800020:Bordov%C3%A1','biela','custom:ffb6c1:Svetloru%C5%BEov%C3%A1'
         ]::text[],
         color_image_map = '{"biela":[7,8,9],"custom:800020:Bordov%C3%A1":[4,5,6],"custom:ffb6c1:Svetloru%C5%BEov%C3%A1":[1,2,3]}'::jsonb,
         images = array[
           'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/83/47ae6d17acfe-4.webp',
           'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/83/1196184e5d82-3.webp',
           'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/83/a6f128ee4198-1.webp',
           'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/83/6baf233020b3-2.webp',
           'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/83/66b9932cbdc4-5.webp',
           'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/83/eeac94a4de03-6.webp',
           'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/83/126e84c4275e-7.webp',
           'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/83/57f107b2fc68-8.webp',
           'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/83/36df2e9746f4-9.webp',
           'https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/83/ea35852b339c-10.webp'
         ]::text[],
         shared_image_urls = '["https://skytsyfjowwyzpvhidco.supabase.co/storage/v1/object/public/product-images/bulk-nej/83/47ae6d17acfe-4.webp"]'::jsonb,
         unavailable_color_ids = '{}'::text[],
         archived_at = null,
         redirect_to_product_id = null,
         updated_at = now()
   where id = target_id;

  update public.products
     set archived_at = null,
         redirect_to_product_id = null,
         updated_at = now()
   where id = source_082;

  update public.products
     set archived_at = null,
         redirect_to_product_id = null,
         updated_at = now()
   where id = source_071;

  raise notice 'H29 revert: OK — exact pre-merge restored from backup-pre';
end $$;

commit;
