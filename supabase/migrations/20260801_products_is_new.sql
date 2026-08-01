-- Flag + expiry for storefront "Novinky" (admin-controlled, time-based)

alter table public.products
  add column if not exists is_new boolean not null default false,
  add column if not exists new_until timestamptz;

create index if not exists products_is_new_until_idx
  on public.products (is_new, new_until)
  where is_new = true;

comment on column public.products.is_new is 'Admin flag: product is marked as novinka';
comment on column public.products.new_until is 'Novinka visible until this timestamp (typically created_at + 60 days)';
