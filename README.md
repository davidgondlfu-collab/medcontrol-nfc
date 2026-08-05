# MedControl NFC

PWA responsive para registrar medicamentos y suplementos. Está creada con Next.js App Router, TypeScript, Tailwind CSS y Supabase.

## Puesta en marcha

1. Crea un proyecto en Supabase.
2. Ejecuta, en orden, todas las migraciones de `supabase/migrations/` en el SQL Editor de Supabase (o usa la CLI de Supabase).
3. Copia `.env.example` a `.env.local` y completa la URL y la clave publicable/anon de tu proyecto.
4. Instala las dependencias y arranca el entorno:

```bash
npm install
npm run dev
```

En Supabase Auth, habilita el proveedor Email. Si se requiere confirmación de email, el registro mostrará el aviso correspondiente.

## Incluye

- Registro e inicio de sesión con Supabase Auth y renovación de sesión mediante middleware.
- Panel con tomas pendientes/completadas, próxima y última toma; CRUD de medicamentos, horarios, fotos, dosis, etiquetas NFC e historial filtrable.
- Esquema SQL, índices, trigger de perfil y RLS sobre todos los datos.
- Bucket privado `medication-photos`, listo para subir imágenes en una siguiente iteración.
- Ruta NFC: `/nfc?id=IDENTIFICADOR`, que registra una toma NFC y evita duplicados dentro de la ventana configurable del perfil. El identificador es lógico, único por medicamento e independiente del UID físico de la etiqueta.

La lectura física de etiquetas, los recordatorios y las notificaciones siguen fuera de alcance; la ruta NFC procesa únicamente el UID recibido por URL.
