create table if not exists public.risk_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  event_type text not null,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  score integer not null default 0,
  source text not null default 'system',
  details jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_risk_events_user_created_at on public.risk_events(user_id, created_at desc);
create index if not exists idx_risk_events_type_created_at on public.risk_events(event_type, created_at desc);
create index if not exists idx_risk_events_unresolved on public.risk_events(user_id, resolved_at) where resolved_at is null;

alter table public.risk_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'risk_events' and policyname = 'Users can read own risk events'
  ) then
    create policy "Users can read own risk events"
      on public.risk_events
      for select
      using (auth.uid() = user_id);
  end if;
end $$;
