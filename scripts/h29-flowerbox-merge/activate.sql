-- H29 ATOMIC ACTIVATE — do NOT run until: migration 20261018 applied + app deployed.
-- Single transaction: lock 3 rows → guard all → update target → archive sources.
-- Any guard miss / error → FULL rollback (no partial WRITTEN).
-- Before production: run check-guards-against-expected.mjs against live.
-- Live must match approved expected-pre.json; on difference STOP (never auto-rewrite).

begin;

do $$
declare
  t public.products%rowtype;
  s082 public.products%rowtype;
  s071 public.products%rowtype;
  target_id uuid := '12e00cb2-7707-430b-b4e0-f5821fa4fc93';
  source_082 uuid := '5451a149-4bd0-4292-8d71-f6edea24cb3d';
  source_071 uuid := '3fb3a76c-7c51-4bcb-8f0c-8fa52090c6e7';
  new_images text[];
  new_map jsonb;
  new_colors text[];
  new_shared jsonb;
begin
  -- Lock in stable id order to avoid deadlocks.
  select * into t from public.products where id = target_id for update;
  select * into s082 from public.products where id = source_082 for update;
  select * into s071 from public.products where id = source_071 for update;

  if t.id is null or s082.id is null or s071.id is null then
    raise exception 'H29 activate: missing row (target/082/071)';
  end if;

  -- Target guards
  if t.sku is distinct from 'IMP-NEJ-083'
     or t.slug is distinct from 'okruhly-flowerbox-so-snurkou-mix-farieb'
     or t.name is distinct from 'Okrúhly flowerbox so šnúrkou – mix farieb'
     or t.price is distinct from '5,90 €'
     or t.in_stock is distinct from true
     or t.stock_quantity is not null
     or t.packaging is distinct from '[{"id":"krabica","pieces":2}]'::jsonb
     or t.color_ids is distinct from array[
          'custom:800020:Bordov%C3%A1','biela','custom:ffb6c1:Svetloru%C5%BEov%C3%A1'
        ]::text[]
     or t.color_image_map is distinct from '{"biela":[7,8,9],"custom:800020:Bordov%C3%A1":[4,5,6],"custom:ffb6c1:Svetloru%C5%BEov%C3%A1":[1,2,3]}'::jsonb
     or coalesce(t.unavailable_color_ids, '{}'::text[]) is distinct from '{}'::text[]
     or md5(array_to_string(t.images, E'\n')) is distinct from '292f1c05eb7e5f5a5deb44c6431060fd'
     or cardinality(t.images) is distinct from 10
     or t.updated_at is distinct from '2026-10-16 12:31:47.416479+00'::timestamptz
     or t.archived_at is not null
     or t.redirect_to_product_id is not null
  then
    raise exception 'H29 activate: target IMP-NEJ-083 guard mismatch';
  end if;

  -- Source 082 guards
  if s082.sku is distinct from 'IMP-NEJ-082'
     or s082.slug is distinct from 'sada-2-okruhlych-flowerboxov-kraft-so-snurkou'
     or s082.price is distinct from '5,90 €'
     or s082.in_stock is distinct from true
     or s082.stock_quantity is not null
     or s082.packaging is distinct from '[{"id":"krabica","pieces":2}]'::jsonb
     or s082.color_ids is distinct from array['hneda']::text[]
     or s082.color_image_map is distinct from '{"hneda":[3]}'::jsonb
     or coalesce(s082.unavailable_color_ids, '{}'::text[]) is distinct from '{}'::text[]
     or md5(array_to_string(s082.images, E'\n')) is distinct from 'c5fe470c1c38b0b5d4fb3c805bff66a5'
     or cardinality(s082.images) is distinct from 4
     or s082.updated_at is distinct from '2026-09-26 14:34:01.090115+00'::timestamptz
     or s082.archived_at is not null
     or s082.redirect_to_product_id is not null
  then
    raise exception 'H29 activate: source IMP-NEJ-082 guard mismatch';
  end if;

  -- Source 071 guards
  if s071.sku is distinct from 'IMP-NEJ-071'
     or s071.slug is distinct from 'sada-okruhlych-flowerboxov-so-snurkou-kremova'
     or s071.price is distinct from '5,90 €'
     or s071.in_stock is distinct from true
     or s071.stock_quantity is not null
     or s071.packaging is distinct from '[{"id":"krabica","pieces":2}]'::jsonb
     or s071.color_ids is distinct from array['kremova']::text[]
     or s071.color_image_map is distinct from '{"kremova":[1,0]}'::jsonb
     or coalesce(s071.unavailable_color_ids, '{}'::text[]) is distinct from '{}'::text[]
     or md5(array_to_string(s071.images, E'\n')) is distinct from 'ce1e3b47f1d51a727ab013d6cbf9be34'
     or cardinality(s071.images) is distinct from 2
     or s071.updated_at is distinct from '2026-10-16 16:35:11.959842+00'::timestamptz
     or s071.archived_at is not null
     or s071.redirect_to_product_id is not null
  then
    raise exception 'H29 activate: source IMP-NEJ-071 guard mismatch';
  end if;

  new_images := t.images || s082.images || s071.images;
  if cardinality(new_images) is distinct from 16 then
    raise exception 'H29 activate: expected 16 images, got %', cardinality(new_images);
  end if;

  new_colors := array[
    'custom:800020:Bordov%C3%A1',
    'biela',
    'custom:ffb6c1:Svetloru%C5%BEov%C3%A1',
    'hneda',
    'kremova'
  ]::text[];

  new_map := '{
    "custom:800020:Bordov%C3%A1":[4,5,6],
    "biela":[7,8,9],
    "custom:ffb6c1:Svetloru%C5%BEov%C3%A1":[1,2,3],
    "hneda":[10,13,11,12],
    "kremova":[14,15]
  }'::jsonb;

  new_shared := jsonb_build_array(t.images[1]);

  update public.products
     set name = 'Sada 2 okrúhlych flowerboxov so šnúrkou',
         color_ids = new_colors,
         color_image_map = new_map,
         images = new_images,
         shared_image_urls = new_shared,
         unavailable_color_ids = '{}'::text[],
         updated_at = now()
   where id = target_id;

  update public.products
     set archived_at = now(),
         redirect_to_product_id = target_id,
         updated_at = now()
   where id = source_082;

  update public.products
     set archived_at = now(),
         redirect_to_product_id = target_id,
         updated_at = now()
   where id = source_071;

  raise notice 'H29 activate: OK — target updated, 082+071 archived → %', target_id;
end $$;

-- Exact post-state while the transaction (and FOR UPDATE locks) are still open.
-- Consumed by run-activate-capture.mjs → activations/<id>/backup-post.json (write-once).
select jsonb_build_object(
  'capturedInTransaction', true,
  'note', 'Post-activate snapshot taken before COMMIT; do not replace with a later DB read.',
  'target', (select jsonb_build_object(
      'id', id, 'sku', sku, 'slug', slug, 'name', name, 'price', price,
      'packaging', packaging, 'in_stock', in_stock, 'stock_quantity', stock_quantity,
      'color_ids', to_jsonb(color_ids), 'color_image_map', color_image_map,
      'shared_image_urls', shared_image_urls,
      'unavailable_color_ids', to_jsonb(coalesce(unavailable_color_ids, '{}'::text[])),
      'images', to_jsonb(images),
      'updated_at', updated_at::text,
      'archived_at', archived_at,
      'redirect_to_product_id', redirect_to_product_id
    ) from public.products where id = '12e00cb2-7707-430b-b4e0-f5821fa4fc93'),
  'source082', (select jsonb_build_object(
      'id', id, 'sku', sku, 'slug', slug, 'name', name,
      'color_ids', to_jsonb(color_ids), 'color_image_map', color_image_map,
      'shared_image_urls', shared_image_urls,
      'unavailable_color_ids', to_jsonb(coalesce(unavailable_color_ids, '{}'::text[])),
      'images', to_jsonb(images),
      'updated_at', updated_at::text,
      'archived_at', archived_at,
      'redirect_to_product_id', redirect_to_product_id
    ) from public.products where id = '5451a149-4bd0-4292-8d71-f6edea24cb3d'),
  'source071', (select jsonb_build_object(
      'id', id, 'sku', sku, 'slug', slug, 'name', name,
      'color_ids', to_jsonb(color_ids), 'color_image_map', color_image_map,
      'shared_image_urls', shared_image_urls,
      'unavailable_color_ids', to_jsonb(coalesce(unavailable_color_ids, '{}'::text[])),
      'images', to_jsonb(images),
      'updated_at', updated_at::text,
      'archived_at', archived_at,
      'redirect_to_product_id', redirect_to_product_id
    ) from public.products where id = '3fb3a76c-7c51-4bcb-8f0c-8fa52090c6e7')
) as h29_post_snapshot;

commit;
