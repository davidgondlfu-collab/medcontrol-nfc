-- Medication behaviour is additive: existing records remain scheduled.
alter table public.medications
  add column if not exists usage_type text not null default 'scheduled'
    check (usage_type in ('scheduled', 'occasional')),
  add column if not exists reminders_enabled boolean not null default true;

-- Supplements without a schedule must never create a reminder by default.
update public.medications m
set reminders_enabled = false
where not exists (select 1 from public.schedules s where s.medication_id = m.id);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  timezone text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  medication_id uuid not null references public.medications(id) on delete cascade,
  scheduled_at timestamptz not null,
  notification_type text not null default 'scheduled_reminder',
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, medication_id, scheduled_at, notification_type)
);

create index if not exists push_subscriptions_user_active_idx on public.push_subscriptions(user_id) where active;
create index if not exists notification_deliveries_scheduled_idx on public.notification_deliveries(scheduled_at);

alter table public.push_subscriptions enable row level security;
alter table public.notification_deliveries enable row level security;

create policy "Users manage own push subscriptions" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users view own notification deliveries" on public.notification_deliveries
  for select using (auth.uid() = user_id);
