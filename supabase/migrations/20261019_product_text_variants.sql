-- Custom text variants + cart line identity (color/variant namespaces).
-- Local / staging first. Does not convert existing products to custom.

-- ---------------------------------------------------------------------------
-- products: variant mode + text variants + catalog summary
-- ---------------------------------------------------------------------------

alter table public.products
  add column if not exists variant_mode text not null default 'none',
  add column if not exists variant_axis_label text,
  add column if not exists text_variants jsonb,
  add column if not exists default_variant_id text,
  add column if not exists variant_total_count integer not null default 0,
  add column if not exists variant_orderable_count integer not null default 0,
  add column if not exists variant_min_price_cents integer,
  add column if not exists variant_price_varies boolean not null default false,
  add column if not exists price_before_custom text;

alter table public.products
  drop constraint if exists products_variant_mode_check;

alter table public.products
  add constraint products_variant_mode_check
  check (variant_mode in ('none', 'colors', 'custom'));

-- Backfill mode from existing color_ids (no price / catalog data changes).
update public.products
set variant_mode = 'colors'
where variant_mode = 'none'
  and color_ids is not null
  and cardinality(color_ids) > 0;

comment on column public.products.variant_mode is
  'none | colors | custom — single selection axis';
comment on column public.products.text_variants is
  'JSON array: {id,label,priceCents,available,sortOrder,imageUrls[]}';
comment on column public.products.price_before_custom is
  'Catalog price snapshot when entering custom mode; restore/confirm on exit';

-- ---------------------------------------------------------------------------
-- cart_items: line_option_key namespaces (c: / v: / empty)
-- ---------------------------------------------------------------------------

alter table public.cart_items
  add column if not exists line_option_key text not null default '';

-- Preserve stored color as its own line key (no invention of missing colors).
update public.cart_items
set line_option_key = case
  when color_id is not null and length(trim(color_id)) > 0
    then 'c:' || trim(color_id)
  else ''
end
where line_option_key = ''
  and color_id is not null
  and length(trim(color_id)) > 0;

alter table public.cart_items drop constraint if exists cart_items_pkey;

-- If duplicate (user, product, key) somehow exist, keep newest.
delete from public.cart_items a
using public.cart_items b
where a.ctid < b.ctid
  and a.user_id = b.user_id
  and a.product_id = b.product_id
  and a.line_option_key = b.line_option_key;

alter table public.cart_items
  add primary key (user_id, product_id, line_option_key);

create index if not exists cart_items_user_id_idx
  on public.cart_items (user_id);

-- ---------------------------------------------------------------------------
-- order_items: selection snapshots (axis + value); optional variant_id
-- ---------------------------------------------------------------------------

alter table public.order_items
  add column if not exists variant_id text,
  add column if not exists selection_axis_label text,
  add column if not exists selection_value_label text;

comment on column public.order_items.selection_axis_label is
  'Snapshot e.g. Farba / Veľkosť at order time';
comment on column public.order_items.selection_value_label is
  'Snapshot of selected color or variant label at order time';

