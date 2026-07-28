-- Admin login via username (customers keep email-only auth)

alter table public.profiles
  add column if not exists username text;

create unique index if not exists profiles_username_lower_unique
  on public.profiles (lower(username))
  where username is not null;

alter table public.profiles
  drop constraint if exists profiles_username_admin_only;

alter table public.profiles
  add constraint profiles_username_admin_only
  check (username is null or role = 'admin');

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
    if new.username is distinct from old.username then
      raise exception 'Cannot change username';
    end if;
  end if;
  return new;
end;
$$;
