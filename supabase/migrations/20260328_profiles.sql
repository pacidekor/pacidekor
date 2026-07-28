-- PACIDEKOR: profiles for retail / wholesale customers + admins
-- Apply in Supabase SQL Editor (or via CLI migration).

create type public.customer_type as enum ('maloobchod', 'velkoobchod');
create type public.customer_status as enum (
  'aktivny',
  'ziada_registraciu',
  'zamietnuty',
  'zablokovany'
);
create type public.app_role as enum ('customer', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'customer',
  type public.customer_type not null,
  status public.customer_status not null,
  name text not null,
  email text not null unique,
  phone text not null default '',
  company text,
  ico text,
  dic text,
  street text not null default '',
  city text not null default '',
  zip text not null default '',
  country text not null default 'Slovensko',
  note text,
  created_at timestamptz not null default now(),
  registered_at timestamptz
);

create index profiles_type_idx on public.profiles (type);
create index profiles_status_idx on public.profiles (status);
create index profiles_role_idx on public.profiles (role);

alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Own profile: read
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id or public.is_admin());

-- Own profile: update allowed fields only (enforced in app; block role/type/status via trigger)
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- Insert: users create their own row after signUp (id must match auth.uid())
create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id and role = 'customer');

-- Admin may delete customer profiles (Auth user delete needs service role in app)
create policy "profiles_delete_admin"
  on public.profiles
  for delete
  to authenticated
  using (public.is_admin());

create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not public.is_admin() then
    if new.role is distinct from old.role then
      raise exception 'Cannot change role';
    end if;
    if new.type is distinct from old.type then
      raise exception 'Cannot change type';
    end if;
    if new.status is distinct from old.status then
      raise exception 'Cannot change status';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;

create trigger profiles_protect_privileges
  before update on public.profiles
  for each row
  execute function public.protect_profile_privileges();

-- Create profile from auth.users metadata on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  profile_type public.customer_type;
  profile_status public.customer_status;
begin
  profile_type := coalesce(
    (meta->>'type')::public.customer_type,
    'maloobchod'
  );

  profile_status := coalesce(
    (meta->>'status')::public.customer_status,
    case
      when profile_type = 'velkoobchod' then 'ziada_registraciu'::public.customer_status
      else 'aktivny'::public.customer_status
    end
  );

  insert into public.profiles (
    id,
    role,
    type,
    status,
    name,
    email,
    phone,
    company,
    ico,
    dic,
    street,
    city,
    zip,
    country,
    note,
    registered_at
  ) values (
    new.id,
    'customer',
    profile_type,
    profile_status,
    coalesce(nullif(trim(meta->>'name'), ''), split_part(new.email, '@', 1)),
    lower(new.email),
    coalesce(meta->>'phone', ''),
    nullif(trim(meta->>'company'), ''),
    nullif(trim(meta->>'ico'), ''),
    nullif(trim(meta->>'dic'), ''),
    coalesce(meta->>'street', ''),
    coalesce(meta->>'city', ''),
    coalesce(meta->>'zip', ''),
    coalesce(nullif(trim(meta->>'country'), ''), 'Slovensko'),
    nullif(trim(meta->>'note'), ''),
    case
      when profile_status = 'aktivny' then now()
      else null
    end
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Admin seed (manual):
-- 1) Dashboard → Authentication → Users → Add user (email + password)
-- 2) Run (replace email):
--
-- update public.profiles
-- set role = 'admin',
--     type = 'maloobchod',
--     status = 'aktivny',
--     name = 'Administrátor',
--     registered_at = coalesce(registered_at, now())
-- where email = 'admin@pacidekor.sk';
-- ---------------------------------------------------------------------------
