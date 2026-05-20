-- Ejecutar en Supabase → SQL Editor
-- Agrega columna page_id a meta_connections

ALTER TABLE meta_connections ADD COLUMN IF NOT EXISTS page_id text;
ALTER TABLE meta_connections ADD COLUMN IF NOT EXISTS page_name text;
