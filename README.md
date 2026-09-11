# MedControl NFC

PWA con Next.js, Supabase y NFC para registrar medicamentos y suplementos.

## Instalación

1. Ejecuta todas las migraciones de `supabase/migrations/` en orden.
2. Copia `.env.example` a `.env.local` y configura las credenciales públicas de Supabase.
3. Instala y arranca la aplicación:

```bash
npm install
npm run dev
```

## Notificaciones Web Push

Las tomas programadas se envían desde Supabase Cron a la Edge Function, por lo que no dependen de que la web esté abierta.

### A. Generar claves VAPID

Ejecuta localmente (no subas el resultado a Git):

```bash
npx web-push generate-vapid-keys --json
```

### B. Variable del frontend

Añade solo la clave pública a Vercel y a `.env.local`:

```text
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
```

### C. Secretos de Supabase Edge Functions

Guarda los secretos exclusivamente en Supabase:

```bash
supabase secrets set VAPID_PUBLIC_KEY="..."
supabase secrets set VAPID_PRIVATE_KEY="..."
supabase secrets set VAPID_SUBJECT="mailto:tu-correo@ejemplo.com"
```

`VAPID_PRIVATE_KEY` nunca se usa en Next.js, Vercel ni el navegador.

### D. Desplegar la Edge Function

```bash
supabase functions deploy send-medication-reminders
```

La función usa `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`, que Supabase proporciona automáticamente en Edge Functions.

### E. Programar Supabase Cron cada minuto

En el SQL Editor, habilita `pg_cron`, `pg_net` y Vault si todavía no están activos. Guarda primero la URL del proyecto y la Service Role Key en Vault (sustituye los valores):

```sql
select vault.create_secret('https://TU_PROJECT_REF.supabase.co', 'medcontrol_project_url');
select vault.create_secret('TU_SERVICE_ROLE_KEY', 'medcontrol_service_role_key');

select cron.schedule(
  'send-medication-reminders-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'medcontrol_project_url') || '/functions/v1/send-medication-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'medcontrol_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

No incluyas una Service Role Key en el repositorio ni en una migración.

### F. Activar desde la web

En **Configuración → Notificaciones**, pulsa **Activar notificaciones**. El navegador pide permiso, crea la suscripción Push y guarda endpoint, claves públicas y la zona horaria IANA del dispositivo.

### G. iPhone

En Safari, abre la aplicación, usa **Compartir → Añadir a pantalla de inicio**, abre la PWA instalada y activa las notificaciones desde Configuración. iOS requiere una PWA instalada para Web Push.

## Funcionamiento

- Los medicamentos **programados** pueden tener uno o varios horarios y recordatorios por medicamento.
- Los suplementos de **uso ocasional** no requieren horarios, no aparecen como pendientes ni generan recordatorios, pero se pueden registrar de forma manual o mediante NFC.
- El historial usa un calendario mensual y asigna tomas al día de medicación según la hora de corte configurada.
