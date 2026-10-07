---
name: migracion-db
description: Crear o modificar tablas en Supabase/Postgres de forma segura. Usar cuando haya que agregar una tabla, columna, índice o bucket, o cuando el usuario diga "migración", "nueva tabla", "agregar columna", "cambiar el schema", "base de datos". NO usar para consultas de solo lectura.
---

# Migraciones de base de datos

## Reglas

1. **Toda tabla nace en una migración del repo.** Nunca crear tablas a mano en el
   dashboard: después nadie sabe que existen ni cómo recrearlas.
2. **Archivo nuevo, numeración única:** `supabase/migrations/NNN_nombre_corto.sql`, con el
   siguiente número libre. Revisar `ls supabase/migrations` antes: no repetir números.
3. **Idempotente:** `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`,
   `CREATE INDEX IF NOT EXISTS`, `ON CONFLICT DO NOTHING`.
4. **Solo aditiva** en el mismo PR que la usa. Borrar o renombrar columnas va en un PR
   posterior, cuando ningún código las lee.
5. **Plantilla de tabla de usuario:**
   ```sql
   CREATE TABLE IF NOT EXISTS <tabla> (
     id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     -- columnas...
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   );
   CREATE INDEX IF NOT EXISTS idx_<tabla>_user ON <tabla>(user_id);
   CREATE TRIGGER <tabla>_updated_at BEFORE UPDATE ON <tabla>
     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
   ALTER TABLE <tabla> ENABLE ROW LEVEL SECURITY;
   ```
   - Dueño por `user_id UUID`, no por email (los emails cambian).
   - **RLS siempre activado.** Si solo el backend (service role) accede, no hace falta
     ninguna política. Si el frontend leerá la tabla directo, escribir políticas
     `USING (auth.uid() = user_id)`.
   - `CHECK` para columnas de estado con valores fijos.
6. **Buckets de Storage privados** (`public = false`); el backend sirve los archivos.

## Después de escribir la migración

1. El usuario la corre en Supabase → SQL Editor (o `supabase db push` si el CLI está
   vinculado). Claude no la ejecuta contra producción sin confirmación explícita.
2. Verificar que se aplicó: consultar la tabla/columna desde el backend local o el Table
   Editor.
3. Si la tabla tiene datos de usuario: agregarla al borrado de cuenta y al export/backup
   si existen.
4. Si hay consultas que pueden pasar de 1000 filas: paginar con `.range()` y un `order`
   estable (Supabase corta en 1000 sin avisar).
5. Si es un cambio con consecuencias (nueva tabla de pagos, cambio de estado), anotar en
   `CLAUDE.md` qué la usa y por qué existe.
