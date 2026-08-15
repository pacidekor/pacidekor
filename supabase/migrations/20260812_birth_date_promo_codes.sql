-- Optional birth date + promo codes for cart coupons

alter table public.profiles
  add column if not exists birth_date date;

comment on column public.profiles.birth_date is 'Optional date of birth for birthday offers';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  profile_type public.customer_type;
  profile_status public.customer_status;
  birth date;
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

  begin
    birth := nullif(trim(meta->>'birth_date'), '')::date;
  exception when others then
    birth := null;
  end;

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
    birth_date,
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
    birth,
    case
      when profile_status = 'aktivny' then now()
      else null
    end
  );

  return new;
end;
$function$;

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  discount_percent integer not null
    check (discount_percent > 0 and discount_percent <= 100),
  active boolean not null default true,
  starts_at date,
  ends_at date,
  min_order_eur numeric(10,2)
    check (min_order_eur is null or min_order_eur >= 0),
  max_uses integer
    check (max_uses is null or max_uses > 0),
  used_count integer not null default 0
    check (used_count >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promo_codes_code_unique unique (code)
);

create index if not exists promo_codes_code_idx on public.promo_codes (code);

alter table public.promo_codes enable row level security;

revoke all on table public.promo_codes from anon, authenticated;
grant select, insert, update, delete on table public.promo_codes to service_role;

insert into public.promo_codes (code, discount_percent, active, note)
values ('NARODENINY10', 10, true, 'Demo narodeninový kód 10 %')
on conflict (code) do nothing;
