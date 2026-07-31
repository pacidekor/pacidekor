-- Managed product sales / akcie (replaces localStorage discounts)

create table public.product_discounts (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  original_price text not null,
  sale_price text not null,
  discount_percent integer not null,
  show_on_akcia_page boolean not null default true,
  active boolean not null default true,
  starts_at date,
  ends_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_discounts_percent_range check (
    discount_percent >= 0 and discount_percent <= 100
  ),
  constraint product_discounts_product_unique unique (product_id)
);

create index product_discounts_active_idx
  on public.product_discounts (active, show_on_akcia_page);

create or replace function public.set_product_discounts_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger product_discounts_set_updated_at
  before update on public.product_discounts
  for each row
  execute function public.set_product_discounts_updated_at();

alter table public.product_discounts enable row level security;

create policy "product_discounts_select_public"
  on public.product_discounts
  for select
  to anon, authenticated
  using (true);

create policy "product_discounts_insert_admin"
  on public.product_discounts
  for insert
  to authenticated
  with check (public.is_admin());

create policy "product_discounts_update_admin"
  on public.product_discounts
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "product_discounts_delete_admin"
  on public.product_discounts
  for delete
  to authenticated
  using (public.is_admin());

grant select on table public.product_discounts to anon, authenticated;
grant insert, update, delete on table public.product_discounts to authenticated;
