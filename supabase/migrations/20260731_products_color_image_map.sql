-- Map color variant IDs to 0-based indexes in products.images
alter table public.products
  add column if not exists color_image_map jsonb not null default '{}'::jsonb;
