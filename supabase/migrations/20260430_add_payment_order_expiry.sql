alter table public.payment_orders
  add column if not exists expires_at timestamptz not null default (now() + interval '1 minute');

create index if not exists idx_payment_orders_expires_at
  on public.payment_orders(expires_at);
