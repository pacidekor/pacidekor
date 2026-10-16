-- NOT APPLIED automatically. Review, then run manually.
-- Explicit marker for gallery photos shared by several color variants.
--   NULL  = product not reviewed -> storefront keeps the legacy gallery order
--   '[]'  = reviewed, no shared photo
--   '["https://…/img.webp", …]' = shared photos (shown after all variant-specific photos)
-- Stored as URLs (not indexes) so it survives reordering/deleting images; color_image_map keeps using indexes.
-- Additive & nullable: no existing row or query changes behaviour until a product gets a value.
alter table public.products
  add column if not exists shared_image_urls jsonb;

comment on column public.products.shared_image_urls is
  'Gallery image URLs shared by several color variants; NULL = not reviewed (legacy order).';
