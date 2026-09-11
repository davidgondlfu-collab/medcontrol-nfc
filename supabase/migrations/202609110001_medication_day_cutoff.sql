-- Defines the boundary between one medication day and the next.
alter table public.profiles
  add column if not exists medication_day_cutoff_time time not null default '05:00:00';
