-- Per-color stock quantities for products.variant_mode = 'colors'.
-- Semantics of color_stock JSON object values:
--   missing key  = unlimited (same as product stock_quantity null)
--   null         = unlimited (explicit)
--   0            = sold out → keep in sync with unavailable_color_ids
--   N > 0        = N pieces available
--
-- Custom text variants store stockQuantity inside text_variants jsonb
-- (see src/lib/product-variants.ts); no extra column here.

alter table public.products
  add column if not exists color_stock jsonb not null default '{}'::jsonb;

comment on column public.products.color_stock is
  'Map colorId → qty (number|null). Missing/null = unlimited; 0 = sold out.';

-- Backfill sold-out markers from existing unavailable_color_ids.
update public.products p
set color_stock = coalesce(
  (
    select jsonb_object_agg(cid, to_jsonb(0))
    from unnest(coalesce(p.unavailable_color_ids, '{}'::text[])) as cid
    where length(trim(cid)) > 0
  ),
  '{}'::jsonb
)
where coalesce(cardinality(p.unavailable_color_ids), 0) > 0
  and (p.color_stock is null or p.color_stock = '{}'::jsonb);
