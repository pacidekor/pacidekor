-- GoPay payment reference on orders

alter table public.orders
  add column if not exists gopay_payment_id text;

create unique index if not exists orders_gopay_payment_id_uidx
  on public.orders (gopay_payment_id)
  where gopay_payment_id is not null;
