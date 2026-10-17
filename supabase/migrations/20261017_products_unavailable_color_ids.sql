-- NOT APPLIED automatically. Review, then run manually (local first).
-- Per-color sold-out marker: color stays in color_ids / gallery, but cannot be ordered.
-- Empty array = no color blocked by this flag (legacy behaviour).
-- Product-level in_stock / stock_quantity remain authoritative for the whole product.
alter table public.products
  add column if not exists unavailable_color_ids text[] not null default '{}';

comment on column public.products.unavailable_color_ids is
  'Color IDs that remain visible but cannot be added to cart / ordered; empty = none blocked.';
