-- Admin-curated bestsellers for homepage /bestsellery

alter table public.products
  add column if not exists is_bestseller boolean not null default false;

create index if not exists products_is_bestseller_idx
  on public.products (is_bestseller)
  where is_bestseller = true;

comment on column public.products.is_bestseller is 'Admin flag: product listed in Bestsellery section';
