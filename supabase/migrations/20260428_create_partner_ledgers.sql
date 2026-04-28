create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  transaction_key text not null unique,
  type text not null check (type in ('recharge', 'consume')),
  amount numeric not null default 0,
  coins integer not null default 0,
  description text not null default '',
  pay_method text,
  status text not null default 'success',
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists wallet_transactions_user_month_idx
on public.wallet_transactions (user_id, occurred_at desc);

create table if not exists public.mir_point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  transaction_key text not null unique,
  type text not null check (type in ('earn', 'deduct', 'adjust')),
  source text not null,
  reference_id text,
  points integer not null,
  title text not null default '',
  description text not null default '',
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists mir_point_transactions_user_month_idx
on public.mir_point_transactions (user_id, occurred_at desc);
