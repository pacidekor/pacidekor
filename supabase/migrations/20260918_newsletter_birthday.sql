-- Newsletter subscribers + birthday send ledger

create table if not exists public.newsletter_subscribers (
  email text primary key,
  name text,
  unsubscribe_token text not null unique,
  active boolean not null default true,
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create index if not exists newsletter_subscribers_active_idx
  on public.newsletter_subscribers (active)
  where active = true;

alter table public.newsletter_subscribers enable row level security;
revoke all on table public.newsletter_subscribers from anon, authenticated;
grant all on table public.newsletter_subscribers to service_role;

create table if not exists public.birthday_emails_sent (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  year int not null,
  promo_code text not null,
  sent_at timestamptz not null default now(),
  primary key (profile_id, year)
);

alter table public.birthday_emails_sent enable row level security;
revoke all on table public.birthday_emails_sent from anon, authenticated;
grant all on table public.birthday_emails_sent to service_role;
