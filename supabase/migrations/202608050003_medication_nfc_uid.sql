-- El UID principal queda directamente vinculado al medicamento.
alter table public.medications
  add column if not exists nfc_uid text unique;

-- Conserva las vinculaciones creadas con la estructura anterior al actualizar.
update public.medications m
set nfc_uid = (
  select t.tag_uid from public.nfc_tags t
  where t.medication_id = m.id
  order by t.id
  limit 1
)
where m.nfc_uid is null
  and exists (select 1 from public.nfc_tags t where t.medication_id = m.id);
