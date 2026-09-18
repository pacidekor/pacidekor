-- Invoices linked to orders + yearly sequence

create table if not exists public.invoice_sequences (
  year integer primary key,
  last_number integer not null default 0 check (last_number >= 0)
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete restrict,
  invoice_number text not null unique,
  variable_symbol text not null,
  issued_at date not null,
  due_at date not null,
  currency text not null default 'EUR',
  subtotal_ex_vat numeric(12, 2) not null,
  vat_amount numeric(12, 2) not null,
  total_inc_vat numeric(12, 2) not null,
  payment_method text not null,
  paid boolean not null default false,
  customer jsonb not null,
  items jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists invoices_order_id_idx on public.invoices (order_id);
create index if not exists invoices_invoice_number_idx on public.invoices (invoice_number);

alter table public.invoices enable row level security;
alter table public.invoice_sequences enable row level security;

revoke all on table public.invoices from anon, authenticated;
revoke all on table public.invoice_sequences from anon, authenticated;
grant all on table public.invoices to service_role;
grant all on table public.invoice_sequences to service_role;

create policy "invoices_select_own"
  on public.invoices for select to authenticated
  using (
    exists (
      select 1 from public.orders o
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

grant select on table public.invoices to authenticated;

create or replace function public.next_invoice_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  y integer := extract(year from now())::integer;
  n integer;
begin
  insert into public.invoice_sequences (year, last_number)
  values (y, 1)
  on conflict (year) do update
    set last_number = public.invoice_sequences.last_number + 1
  returning last_number into n;

  return 'FA-' || y::text || '-' || lpad(n::text, 4, '0');
end;
$$;

revoke all on function public.next_invoice_number() from public;
grant execute on function public.next_invoice_number() to service_role;
