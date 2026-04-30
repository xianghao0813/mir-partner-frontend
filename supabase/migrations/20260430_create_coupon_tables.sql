create table if not exists public.user_coupons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  coupon_code text not null,
  title text not null,
  description text,
  discount_type text not null check (discount_type in ('amount', 'percent')),
  discount_value numeric(12, 2) not null check (discount_value > 0),
  min_amount numeric(12, 2) not null default 0,
  applicable_package_ids integer[] not null default '{}',
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_order_no text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_coupons_user_id on public.user_coupons(user_id);
create index if not exists idx_user_coupons_expires_at on public.user_coupons(expires_at);
create unique index if not exists idx_user_coupons_used_order_no
  on public.user_coupons(used_order_no)
  where used_order_no is not null;

create table if not exists public.coupon_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  session_token text not null unique,
  user_id uuid not null,
  coupon_id uuid not null references public.user_coupons(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'consumed', 'expired', 'closed')),
  cp_order_no text,
  package_id integer,
  opened_at timestamptz not null default now(),
  consumed_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_coupon_sessions_user_id on public.coupon_checkout_sessions(user_id);
create index if not exists idx_coupon_sessions_coupon_id on public.coupon_checkout_sessions(coupon_id);
create index if not exists idx_coupon_sessions_expires_at on public.coupon_checkout_sessions(expires_at);
create unique index if not exists idx_coupon_sessions_cp_order_no
  on public.coupon_checkout_sessions(cp_order_no)
  where cp_order_no is not null;

alter table public.user_coupons enable row level security;
alter table public.coupon_checkout_sessions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_coupons' and policyname = 'Users can read own coupons'
  ) then
    create policy "Users can read own coupons"
      on public.user_coupons
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'coupon_checkout_sessions' and policyname = 'Users can read own coupon sessions'
  ) then
    create policy "Users can read own coupon sessions"
      on public.coupon_checkout_sessions
      for select
      using (auth.uid() = user_id);
  end if;
end $$;
