-- Favorites, cart lines, blog posts, and atomic stock adjustment

create table public.favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index favorites_user_id_idx on public.favorites (user_id);
create index favorites_product_id_idx on public.favorites (product_id);

alter table public.favorites enable row level security;

create policy "favorites_select_own"
  on public.favorites for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "favorites_insert_own"
  on public.favorites for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "favorites_delete_own"
  on public.favorites for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, delete on table public.favorites to authenticated;

create table public.cart_items (
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  color_id text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index cart_items_user_id_idx on public.cart_items (user_id);

create or replace function public.set_cart_items_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger cart_items_set_updated_at
  before update on public.cart_items
  for each row execute function public.set_cart_items_updated_at();

alter table public.cart_items enable row level security;

create policy "cart_items_select_own"
  on public.cart_items for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "cart_items_insert_own"
  on public.cart_items for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "cart_items_update_own"
  on public.cart_items for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "cart_items_delete_own"
  on public.cart_items for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on table public.cart_items to authenticated;

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  cover_image text not null default '',
  category text not null default 'Inšpirácia',
  author text not null default 'PACIDEKOR',
  published_at date not null default current_date,
  content jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index blog_posts_published_at_idx on public.blog_posts (published_at desc);
create index blog_posts_sort_order_idx on public.blog_posts (sort_order);

create or replace function public.set_blog_posts_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger blog_posts_set_updated_at
  before update on public.blog_posts
  for each row execute function public.set_blog_posts_updated_at();

alter table public.blog_posts enable row level security;

create policy "blog_posts_select_public"
  on public.blog_posts for select to anon, authenticated
  using (true);

create policy "blog_posts_insert_admin"
  on public.blog_posts for insert to authenticated
  with check (public.is_admin());

create policy "blog_posts_update_admin"
  on public.blog_posts for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "blog_posts_delete_admin"
  on public.blog_posts for delete to authenticated
  using (public.is_admin());

grant select on table public.blog_posts to anon, authenticated;
grant insert, update, delete on table public.blog_posts to authenticated;

create or replace function public.adjust_product_stock(
  p_product_id uuid,
  p_delta integer
)
returns table (out_in_stock boolean, out_stock_quantity integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_in_stock boolean;
  current_qty integer;
  next_qty integer;
begin
  if p_delta = 0 then
    select p.in_stock, p.stock_quantity
      into current_in_stock, current_qty
    from public.products p
    where p.id = p_product_id;

    if not found then
      raise exception 'Produkt neexistuje.';
    end if;

    out_in_stock := current_in_stock;
    out_stock_quantity := current_qty;
    return next;
    return;
  end if;

  select p.in_stock, p.stock_quantity
    into current_in_stock, current_qty
  from public.products p
  where p.id = p_product_id
  for update;

  if not found then
    raise exception 'Produkt neexistuje.';
  end if;

  if not current_in_stock and p_delta < 0 then
    raise exception 'Produkt nie je na sklade.';
  end if;

  if current_qty is null then
    out_in_stock := true;
    out_stock_quantity := null;
    return next;
    return;
  end if;

  next_qty := current_qty + p_delta;

  if next_qty < 0 then
    raise exception 'Nedostatok skladu.';
  end if;

  update public.products
  set
    stock_quantity = next_qty,
    in_stock = next_qty > 0
  where id = p_product_id;

  out_in_stock := next_qty > 0;
  out_stock_quantity := case when next_qty > 0 then next_qty else null end;
  return next;
end;
$$;

revoke all on function public.adjust_product_stock(uuid, integer) from public;
grant execute on function public.adjust_product_stock(uuid, integer) to anon, authenticated;
