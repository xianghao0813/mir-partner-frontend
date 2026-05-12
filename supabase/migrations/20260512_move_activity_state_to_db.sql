create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  attendance_date date not null,
  month_key text not null,
  type text not null check (type in ('checkin', 'makeup')),
  created_at timestamptz not null default now(),
  unique (user_id, attendance_date)
);

create index if not exists attendance_records_user_month_idx
on public.attendance_records (user_id, month_key, attendance_date desc);

create table if not exists public.attendance_bonus_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  month_key text not null,
  bonus_type text not null check (bonus_type in ('streak:7', 'streak:25')),
  created_at timestamptz not null default now(),
  unique (user_id, month_key, bonus_type)
);

create index if not exists attendance_bonus_claims_user_month_idx
on public.attendance_bonus_claims (user_id, month_key);

create table if not exists public.boss_last_hit_daily_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  day_key text not null,
  best_score integer not null default 0,
  daily_best_score integer not null default 0,
  daily_run_count integer not null default 0,
  reward_claimed_at timestamptz,
  reward_receipt text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, day_key)
);

create index if not exists boss_last_hit_daily_states_user_day_idx
on public.boss_last_hit_daily_states (user_id, day_key);

create table if not exists public.boss_last_hit_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  day_key text not null,
  score integer not null default 0,
  distance integer not null default 0,
  obstacles_cleared integer not null default 0,
  duration_ms integer not null default 0,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists boss_last_hit_runs_user_day_idx
on public.boss_last_hit_runs (user_id, day_key, completed_at desc);
