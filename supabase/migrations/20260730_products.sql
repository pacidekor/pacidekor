-- Products catalog for storefront + admin CRUD

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  sku text,
  price text not null default '0,00 €',
  original_price text,
  discount integer,
  category text not null,
  subcategory_id text,
  color_ids text[] not null default '{}',
  packaging jsonb not null default '[]'::jsonb,
  details jsonb not null default '[]'::jsonb,
  images text[] not null default '{}',
  in_stock boolean not null default true,
  stock_quantity integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_discount_range check (
    discount is null or (discount >= 0 and discount <= 100)
  ),
  constraint products_stock_quantity_nonneg check (
    stock_quantity is null or stock_quantity >= 0
  )
);

create index products_category_idx on public.products (category);
create index products_subcategory_id_idx on public.products (subcategory_id);
create index products_created_at_idx on public.products (created_at desc);
create index products_color_ids_gin on public.products using gin (color_ids);

create or replace function public.set_products_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_set_updated_at
  before update on public.products
  for each row
  execute function public.set_products_updated_at();

alter table public.products enable row level security;

create policy "products_select_public"
  on public.products
  for select
  to anon, authenticated
  using (true);

create policy "products_insert_admin"
  on public.products
  for insert
  to authenticated
  with check (public.is_admin());

create policy "products_update_admin"
  on public.products
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "products_delete_admin"
  on public.products
  for delete
  to authenticated
  using (public.is_admin());

grant select on table public.products to anon, authenticated;
grant insert, update, delete on table public.products to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "product_images_insert_admin"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

create policy "product_images_update_admin"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

create policy "product_images_delete_admin"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
