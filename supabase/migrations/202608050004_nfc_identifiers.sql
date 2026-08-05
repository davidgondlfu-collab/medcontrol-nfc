-- El identificador NFC es lógico y se escribe en la etiqueta como parte de una URL.
alter table public.medications
  add column if not exists nfc_identifier text unique;

-- Mantiene las URLs NFC ya distribuidas durante la transición desde nfc_uid.
update public.medications
set nfc_identifier = nfc_uid
where nfc_identifier is null and nfc_uid is not null;
