-- NOT APPLIED automatically. Review, then run manually (local / staging first).
-- Product archive + slug redirect for merges (H29). Additive, nullable.
-- Deploy order: this migration → app code → data merge transaction.
-- Does NOT use ON DELETE CASCADE on redirect FK.
-- Archive ≠ in_stock=false. Rows are never deleted by this feature.

alter table public.products
  add column if not exists archived_at timestamptz null;

alter table public.products
  add column if not exists redirect_to_product_id uuid null;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'products_redirect_to_product_id_fkey'
  ) then
    alter table public.products
      add constraint products_redirect_to_product_id_fkey
      foreign key (redirect_to_product_id)
      references public.products (id)
      on delete no action
      on update no action;
  end if;
end $$;

comment on column public.products.archived_at is
  'When set, product is hidden from public catalog/search/sitemap; row kept for orders and redirect.';
comment on column public.products.redirect_to_product_id is
  'Optional merge target. Set only together with archived_at; target must be live and non-redirecting.';

-- Filled redirect requires archived source (archived without redirect is allowed).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_redirect_requires_archived'
  ) then
    alter table public.products
      add constraint products_redirect_requires_archived
      check (redirect_to_product_id is null or archived_at is not null);
  end if;
end $$;

-- Product must not redirect to itself.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_redirect_not_self'
  ) then
    alter table public.products
      add constraint products_redirect_not_self
      check (redirect_to_product_id is null or redirect_to_product_id <> id);
  end if;
end $$;

-- Target must exist (FK), not be archived, and must not itself redirect (no chain/cycle).
-- Also: cannot archive a product that is currently a redirect target.
create or replace function public.products_validate_archive_redirect()
returns trigger
language plpgsql
as $$
declare
  target record;
begin
  if new.redirect_to_product_id is not null then
    if new.archived_at is null then
      raise exception 'redirect_to_product_id requires archived_at';
    end if;
    if new.redirect_to_product_id = new.id then
      raise exception 'product cannot redirect to itself';
    end if;

    select p.id, p.archived_at, p.redirect_to_product_id
      into target
      from public.products p
     where p.id = new.redirect_to_product_id
     for share;

    if not found then
      raise exception 'redirect target does not exist';
    end if;
    if target.archived_at is not null then
      raise exception 'redirect target must not be archived';
    end if;
    if target.redirect_to_product_id is not null then
      raise exception 'redirect target must not itself redirect (no chain)';
    end if;
  end if;

  -- Prevent archiving a live merge target while sources still point at it.
  if new.archived_at is not null
     and (tg_op = 'INSERT' or old.archived_at is null)
     and exists (
       select 1
         from public.products p
        where p.redirect_to_product_id = new.id
     ) then
    raise exception 'cannot archive a product that is a redirect target';
  end if;

  return new;
end;
$$;

drop trigger if exists products_validate_archive_redirect on public.products;
create trigger products_validate_archive_redirect
  before insert or update of archived_at, redirect_to_product_id
  on public.products
  for each row
  execute function public.products_validate_archive_redirect();

create index if not exists products_archived_at_idx
  on public.products (archived_at)
  where archived_at is not null;

create index if not exists products_redirect_to_product_id_idx
  on public.products (redirect_to_product_id)
  where redirect_to_product_id is not null;
