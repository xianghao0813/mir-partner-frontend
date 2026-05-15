create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  cp_order_no text not null unique,
  user_id uuid not null,
  package_id integer not null,
  coins integer not null,
  expected_amount numeric(12, 2) not null,
  pay_method text not null default 'wechat',
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled', 'failed')),
  paid_amount numeric(12, 2),
  paid_at timestamptz,
  raw_callback jsonb,
  expires_at timestamptz not null default (now() + interval '1 minute'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payment_orders_user_id on public.payment_orders(user_id);
create index if not exists idx_payment_orders_status on public.payment_orders(status);
create index if not exists idx_payment_orders_created_at on public.payment_orders(created_at);
create index if not exists idx_payment_orders_expires_at on public.payment_orders(expires_at);

alter table public.payment_orders enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'payment_orders' and policyname = 'Users can read own payment orders'
  ) then
    create policy "Users can read own payment orders"
      on public.payment_orders
      for select
      using (auth.uid() = user_id);
  end if;
end $$;
