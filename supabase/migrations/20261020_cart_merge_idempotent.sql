-- Idempotent guest→account cart merge.
-- Depends on: 20261019_product_text_variants.sql (cart_items.line_option_key + new PK).
--
-- Security: identity is ONLY auth.uid() from the verified JWT. There is no
-- user_id argument. Clients cannot write cart_merge_operations directly;
-- confirmation of a merge_id is scoped to (auth.uid(), merge_id).

create table if not exists public.cart_merge_operations (
  user_id uuid not null references public.profiles (id) on delete cascade,
  merge_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, merge_id)
);

alter table public.cart_merge_operations enable row level security;

revoke all on table public.cart_merge_operations from public;
revoke all on table public.cart_merge_operations from anon;
revoke all on table public.cart_merge_operations from authenticated;

drop policy if exists "cart_merge_operations_select_own" on public.cart_merge_operations;
create policy "cart_merge_operations_select_own"
  on public.cart_merge_operations for select to authenticated
  using ((select auth.uid()) = user_id);

-- No INSERT/UPDATE/DELETE policies for authenticated — only this function writes.
grant select on table public.cart_merge_operations to authenticated;

create or replace function public.merge_guest_cart_lines(
  p_merge_id uuid,
  p_lines jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Verified session identity only (never taken from p_lines / client body).
  uid uuid := auth.uid();
  inserted_id uuid;
  elem jsonb;
  v_product_id uuid;
  v_qty integer;
  v_key text;
  v_color text;
  v_existing integer;
  result jsonb;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if p_merge_id is null then
    raise exception 'merge_id required';
  end if;

  insert into public.cart_merge_operations (user_id, merge_id)
  values (uid, p_merge_id)
  on conflict (user_id, merge_id) do nothing
  returning merge_id into inserted_id;

  -- Already applied for this user + merge_id: confirm without adding again.
  -- Another user's same merge_id is a different PK row and does not confirm.
  if inserted_id is null then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'product_id', c.product_id,
          'quantity', c.quantity,
          'color_id', c.color_id,
          'line_option_key', c.line_option_key
        )
        order by c.updated_at desc
      ),
      '[]'::jsonb
    )
    into result
    from public.cart_items c
    where c.user_id = uid;

    return result;
  end if;

  for elem in
    select value from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb))
  loop
    begin
      v_product_id := (elem->>'product_id')::uuid;
    exception
      when others then
        continue;
    end;

    v_qty := greatest(1, floor(coalesce((elem->>'quantity')::numeric, 1))::integer);
    v_key := coalesce(nullif(trim(elem->>'line_option_key'), ''), '');
    v_color := nullif(trim(coalesce(elem->>'color_id', '')), '');

    if v_key like 'c:%' and v_color is null then
      v_color := nullif(trim(substr(v_key, 3)), '');
    end if;
    if v_key like 'v:%' then
      v_color := null;
    end if;

    select c.quantity
    into v_existing
    from public.cart_items c
    where c.user_id = uid
      and c.product_id = v_product_id
      and c.line_option_key = v_key;

    if found then
      update public.cart_items
      set quantity = v_existing + v_qty
      where user_id = uid
        and product_id = v_product_id
        and line_option_key = v_key;
    else
      insert into public.cart_items (
        user_id, product_id, quantity, color_id, line_option_key
      ) values (
        uid, v_product_id, v_qty, v_color, v_key
      );
    end if;
  end loop;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'product_id', c.product_id,
        'quantity', c.quantity,
        'color_id', c.color_id,
        'line_option_key', c.line_option_key
      )
      order by c.updated_at desc
    ),
    '[]'::jsonb
  )
  into result
  from public.cart_items c
  where c.user_id = uid;

  return result;
end;
$$;

revoke all on function public.merge_guest_cart_lines(uuid, jsonb) from public;
revoke all on function public.merge_guest_cart_lines(uuid, jsonb) from anon;
grant execute on function public.merge_guest_cart_lines(uuid, jsonb) to authenticated;

comment on function public.merge_guest_cart_lines(uuid, jsonb) is
  'Idempotent guest cart merge bound to auth.uid(); same (user_id, merge_id) applies at most once';
