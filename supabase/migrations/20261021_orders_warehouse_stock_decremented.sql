-- Idempotent flag: warehouse stock deducted once when Packeta label is printed.
alter table public.orders
  add column if not exists warehouse_stock_decremented_at timestamptz;

comment on column public.orders.warehouse_stock_decremented_at is
  'Set when order line quantities were deducted from product/color/variant warehouse stock (on Packeta label print).';

-- Existing labeled orders already left the warehouse; skip deduct on reprint.
update public.orders
set warehouse_stock_decremented_at = coalesce(updated_at, now())
where packeta_packet_id is not null
  and warehouse_stock_decremented_at is null;
