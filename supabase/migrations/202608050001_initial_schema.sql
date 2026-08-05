-- MedControl NFC: esquema inicial y seguridad por usuario.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default ''
);

create table public.medications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  description text,
  photo_url text,
  color text not null default '#2563eb',
  active boolean not null default true
);

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references public.medications(id) on delete cascade,
  time time not null,
  days_of_week smallint[] not null default '{0,1,2,3,4,5,6}'::smallint[],
  constraint schedules_valid_days check (days_of_week <@ '{0,1,2,3,4,5,6}'::smallint[])
);

create table public.nfc_tags (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references public.medications(id) on delete cascade,
  tag_uid text not null unique check (char_length(trim(tag_uid)) > 0)
);

create table public.intakes (
  id uuid primary key default gen_random_uuid(),
  medication_id uuid not null references public.medications(id) on delete cascade,
  taken_at timestamptz not null default now(),
  method text not null check (method in ('manual', 'nfc'))
);

create index medications_user_id_idx on public.medications(user_id);
create index schedules_medication_id_idx on public.schedules(medication_id);
create index nfc_tags_medication_id_idx on public.nfc_tags(medication_id);
create index intakes_medication_taken_at_idx on public.intakes(medication_id, taken_at desc);

-- Crea el perfil en el alta sin exponer permisos especiales al navegador.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.medications enable row level security;
alter table public.schedules enable row level security;
alter table public.nfc_tags enable row level security;
alter table public.intakes enable row level security;

create policy "Users manage own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users manage own medications" on public.medications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own schedules" on public.schedules for all using (exists (select 1 from public.medications m where m.id = medication_id and m.user_id = auth.uid())) with check (exists (select 1 from public.medications m where m.id = medication_id and m.user_id = auth.uid()));
create policy "Users manage own NFC tags" on public.nfc_tags for all using (exists (select 1 from public.medications m where m.id = medication_id and m.user_id = auth.uid())) with check (exists (select 1 from public.medications m where m.id = medication_id and m.user_id = auth.uid()));
create policy "Users manage own intakes" on public.intakes for all using (exists (select 1 from public.medications m where m.id = medication_id and m.user_id = auth.uid())) with check (exists (select 1 from public.medications m where m.id = medication_id and m.user_id = auth.uid()));

-- Storage reservado para futuras fotos de medicamentos. Las rutas incluyen el ID de usuario.
insert into storage.buckets (id, name, public) values ('medication-photos', 'medication-photos', false)
on conflict (id) do nothing;
create policy "Users manage own medication photos" on storage.objects for all to authenticated
using (bucket_id = 'medication-photos' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'medication-photos' and (storage.foldername(name))[1] = auth.uid()::text);
