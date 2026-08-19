-- Orders and order line items

create sequence if not exists public.order_number_seq start 1;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references public.profiles (id) on delete set null,
  status text not null default 'nova' check (
    status in (
      'nova',
      'nezaplatena',
      'zaplatena',
      'pripravuje_sa',
      'pripravena_na_odoslanie',
      'predana_dopravcovi',
      'dorucena',
      'stornovana'
    )
  ),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  customer_company text,
  customer_ico text,
  customer_dic text,
  customer_street text not null,
  customer_city text not null,
  customer_zip text not null,
  customer_country text not null default 'Slovensko',
  note text,
  shipping_method text not null,
  payment_method text not null,
  packeta_point_id text,
  packeta_point_name text,
  packeta_packet_id text,
  subtotal_eur numeric(10, 2) not null,
  discount_eur numeric(10, 2) not null default 0,
  promo_code text,
  shipping_cost_eur numeric(10, 2) not null default 0,
  total_eur numeric(10, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id),
  product_name text not null,
  unit_price text not null,
  quantity integer not null check (quantity > 0),
  color_id text,
  created_at timestamptz not null default now()
);

create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_customer_email_idx on public.orders (lower(customer_email));
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists order_items_order_id_idx on public.order_items (order_id);

create or replace function public.set_orders_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_orders_updated_at();

create or replace function public.next_order_number()
returns text
language plpgsql
set search_path = public
as $$
declare
  seq_val bigint;
begin
  seq_val := nextval('public.order_number_seq');
  return 'PD-' || to_char(now(), 'YYYY') || '-' || lpad(seq_val::text, 5, '0');
end;
$$;

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "orders_select_own"
  on public.orders for select to authenticated
  using (
    user_id = (select auth.uid())
    or lower(customer_email) = lower(
      coalesce((select email from public.profiles where id = (select auth.uid())), '')
    )
    or public.is_admin()
  );

create policy "orders_update_admin"
  on public.orders for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "order_items_select_via_order"
  on public.order_items for select to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_id
        and (
          o.user_id = (select auth.uid())
          or lower(o.customer_email) = lower(
            coalesce((select email from public.profiles where id = (select auth.uid())), '')
          )
          or public.is_admin()
        )
    )
  );

grant select on table public.orders to authenticated;
grant select on table public.order_items to authenticated;
grant update on table public.orders to authenticated;

revoke all on function public.next_order_number() from public;
grant execute on function public.next_order_number() to authenticated;
