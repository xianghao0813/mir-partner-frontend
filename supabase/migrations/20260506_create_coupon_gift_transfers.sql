create table if not exists public.coupon_gift_transfers (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.user_coupons(id) on delete cascade,
  from_user_id uuid not null,
  to_user_id uuid,
  transfer_token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'claimed', 'expired', 'cancelled')),
  expires_at timestamptz not null,
  claimed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_coupon_gift_transfers_coupon_id on public.coupon_gift_transfers(coupon_id);
create index if not exists idx_coupon_gift_transfers_from_user_id on public.coupon_gift_transfers(from_user_id);
create index if not exists idx_coupon_gift_transfers_to_user_id on public.coupon_gift_transfers(to_user_id);
create index if not exists idx_coupon_gift_transfers_expires_at on public.coupon_gift_transfers(expires_at);
create unique index if not exists idx_coupon_gift_transfers_one_pending
  on public.coupon_gift_transfers(coupon_id)
  where status = 'pending';

alter table public.coupon_gift_transfers enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'coupon_gift_transfers' and policyname = 'Users can read own coupon gift transfers'
  ) then
    create policy "Users can read own coupon gift transfers"
      on public.coupon_gift_transfers
      for select
      using (auth.uid() = from_user_id or auth.uid() = to_user_id);
  end if;
end $$;
