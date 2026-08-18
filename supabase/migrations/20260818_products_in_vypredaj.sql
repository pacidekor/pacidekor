-- Flag for storefront "Výpredaj" (independent of Akcia discounts)

alter table public.products
  add column if not exists in_vypredaj boolean not null default false;

create index if not exists products_in_vypredaj_idx
  on public.products (in_vypredaj)
  where in_vypredaj = true;

comment on column public.products.in_vypredaj is 'Admin flag: product is listed on /vypredaj';
