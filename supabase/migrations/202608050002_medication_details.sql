-- Campos adicionales para la gestión detallada de medicamentos.
alter table public.medications
  add column if not exists dose numeric,
  add column if not exists unit text;

alter table public.profiles
  add column if not exists nfc_duplicate_window_hours numeric not null default 4
  check (nfc_duplicate_window_hours > 0 and nfc_duplicate_window_hours <= 24);
