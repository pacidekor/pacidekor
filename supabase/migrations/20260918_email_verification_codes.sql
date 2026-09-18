-- OTP codes for registration e-mail verification (service-role only)
create table if not exists public.email_verification_codes (
  email text primary key,
  code_hash text not null,
  purpose text not null check (purpose in ('retail_register', 'wholesale_register')),
  customer_name text,
  company_name text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists email_verification_codes_expires_at_idx
  on public.email_verification_codes (expires_at);

alter table public.email_verification_codes enable row level security;

-- No policies for anon/authenticated — only service role bypasses RLS.
revoke all on table public.email_verification_codes from anon, authenticated;
grant all on table public.email_verification_codes to service_role;
