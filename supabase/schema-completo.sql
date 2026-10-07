-- AMELIA — schema completo. Pegar entero en Supabase → SQL Editor → Run (proyecto nuevo y vacío).

-- ============================================================
-- AMELIA — SQL Setup para Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. OWNERS
-- Se crea automáticamente cuando un usuario se registra (ver trigger abajo)
CREATE TABLE IF NOT EXISTS public.owners (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  is_superadmin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners ven su propio perfil" ON public.owners;
CREATE POLICY "Owners ven su propio perfil" ON public.owners FOR SELECT
  USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT COALESCE((SELECT is_superadmin FROM public.owners WHERE id = auth.uid()), FALSE)
$$;

DROP POLICY IF EXISTS "Superadmin ve todos los owners" ON public.owners;
CREATE POLICY "Superadmin ve todos los owners" ON public.owners FOR SELECT
  USING (public.is_superadmin());

DROP POLICY IF EXISTS "Owners actualizan su propio perfil" ON public.owners;
CREATE POLICY "Owners actualizan su propio perfil" ON public.owners FOR UPDATE
  USING (auth.uid() = id);

-- 2. TRIGGER: crear owner al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.owners (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. BUSINESSES
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES public.owners(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT,
  description TEXT,
  primary_color TEXT DEFAULT '#0ea5e9',
  logo_url TEXT,
  cover_url TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners gestionan sus negocios" ON public.businesses;
CREATE POLICY "Owners gestionan sus negocios" ON public.businesses FOR ALL
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Superadmin ve todos los negocios" ON public.businesses;
CREATE POLICY "Superadmin ve todos los negocios" ON public.businesses FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM public.owners WHERE is_superadmin = true)
  );

-- 4. SITES
CREATE TABLE IF NOT EXISTS public.sites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL UNIQUE,
  template_id TEXT DEFAULT 'moderna',
  content JSONB,
  raw_html TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners gestionan sus sitios" ON public.sites;
CREATE POLICY "Owners gestionan sus sitios" ON public.sites FOR ALL
  USING (
    auth.uid() = (
      SELECT owner_id FROM public.businesses WHERE id = business_id
    )
  );

-- Sitios publicados son públicos
DROP POLICY IF EXISTS "Sitios publicados son públicos" ON public.sites;
CREATE POLICY "Sitios publicados son públicos" ON public.sites FOR SELECT
  USING (status = 'published');

-- 5. TEMPLATES
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  preview_url TEXT,
  category TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Templates son públicas" ON public.templates;
CREATE POLICY "Templates son públicas" ON public.templates FOR SELECT
  USING (TRUE);

-- Templates iniciales
INSERT INTO public.templates (name, category, is_premium) VALUES
  ('Moderna', 'general', FALSE),
  ('Clásica', 'general', FALSE),
  ('Minimalista', 'general', FALSE),
  ('Vibrante', 'general', FALSE),
  ('Profesional', 'general', TRUE),
  ('Creativa', 'general', TRUE)
ON CONFLICT DO NOTHING;

-- 6. PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2),
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners gestionan sus productos" ON public.products;
CREATE POLICY "Owners gestionan sus productos" ON public.products FOR ALL
  USING (
    auth.uid() = (
      SELECT owner_id FROM public.businesses WHERE id = business_id
    )
  );

-- 8. LICENSES
CREATE TABLE IF NOT EXISTS public.licenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'premium')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners ven su licencia" ON public.licenses;
CREATE POLICY "Owners ven su licencia" ON public.licenses FOR SELECT
  USING (
    auth.uid() = (
      SELECT owner_id FROM public.businesses WHERE id = business_id
    )
  );

-- 9. SITE SETTINGS
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL UNIQUE,
  primary_color TEXT DEFAULT '#0ea5e9',
  secondary_color TEXT,
  logo_url TEXT,
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners gestionan sus settings" ON public.site_settings;
CREATE POLICY "Owners gestionan sus settings" ON public.site_settings FOR ALL
  USING (
    auth.uid() = (
      SELECT owner_id FROM public.businesses WHERE id = business_id
    )
  );

-- 10. SCHEDULES (horarios de atención)
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_open BOOLEAN DEFAULT TRUE,
  open_time TEXT DEFAULT '09:00',
  close_time TEXT DEFAULT '18:00',
  slot_duration INT DEFAULT 60,
  UNIQUE(business_id, day_of_week)
);

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners gestionan sus horarios" ON public.schedules;
CREATE POLICY "Owners gestionan sus horarios" ON public.schedules FOR ALL
  USING (auth.uid() = (SELECT owner_id FROM public.businesses WHERE id = business_id));

-- Horarios públicos para que el chatbot pueda leerlos
DROP POLICY IF EXISTS "Horarios publicados son públicos" ON public.schedules;
CREATE POLICY "Horarios publicados son públicos" ON public.schedules FOR SELECT
  USING (TRUE);

-- 11. BLOCKED_DATES (fechas no disponibles)
CREATE TABLE IF NOT EXISTS public.blocked_dates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  blocked_date DATE NOT NULL,
  reason TEXT,
  UNIQUE(business_id, blocked_date)
);

ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners gestionan fechas bloqueadas" ON public.blocked_dates;
CREATE POLICY "Owners gestionan fechas bloqueadas" ON public.blocked_dates FOR ALL
  USING (auth.uid() = (SELECT owner_id FROM public.businesses WHERE id = business_id));

-- 7-bis. BOOKINGS — esquema actualizado (reemplaza el anterior)
-- Si ya tenías la tabla antigua, ejecuta primero: DROP TABLE IF EXISTS public.bookings CASCADE;
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  service_name TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT,
  booking_date DATE NOT NULL,
  booking_time TEXT NOT NULL,
  duration_min INT DEFAULT 60,
  notes TEXT,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners gestionan sus reservas" ON public.bookings;
CREATE POLICY "Owners gestionan sus reservas" ON public.bookings FOR ALL
  USING (auth.uid() = (SELECT owner_id FROM public.businesses WHERE id = business_id));

DROP POLICY IF EXISTS "Público puede crear reservas" ON public.bookings;
CREATE POLICY "Público puede crear reservas" ON public.bookings FOR INSERT
  WITH CHECK (TRUE);

-- 12. CLIENTS (base histórica de clientes por negocio)
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,                          -- notas privadas del dueño
  last_visit DATE,
  total_visits INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, email)
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners gestionan sus clientes" ON public.clients;
CREATE POLICY "Owners gestionan sus clientes" ON public.clients FOR ALL
  USING (auth.uid() = (SELECT owner_id FROM public.businesses WHERE id = business_id));

-- ============================================================
-- VERIFICACIÓN: Ejecuta esto para confirmar que todo se creó OK
-- ============================================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- ORDER BY table_name;


-- Ejecutar en Supabase SQL Editor (complemento al setup inicial)

-- ── Stock y precio costo en products ─────────────────────────────────────────
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock INTEGER;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'unidad';

-- Función RPC para decrementar stock sin llegar a negativo
CREATE OR REPLACE FUNCTION public.adjust_stock(p_id UUID, p_delta INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.products
  SET stock = GREATEST(0, COALESCE(stock, 0) + p_delta)
  WHERE id = p_id AND stock IS NOT NULL;
END;
$$;

-- ── Columnas de negocio para e-commerce ──────────────────────────────────────
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS payment_info JSONB;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS delivery_settings JSONB;

-- ── Tabla orders ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_email TEXT,
  client_note TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal INTEGER NOT NULL DEFAULT 0,
  discount INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  delivery_type TEXT DEFAULT 'pickup',
  delivery_address TEXT,
  delivery_distance_km NUMERIC,
  delivery_cost INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner lee sus pedidos" ON public.orders;
CREATE POLICY "Owner lee sus pedidos" ON public.orders FOR SELECT
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Owner actualiza sus pedidos" ON public.orders;
CREATE POLICY "Owner actualiza sus pedidos" ON public.orders FOR UPDATE
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Insertar pedido público" ON public.orders;
CREATE POLICY "Insertar pedido público" ON public.orders FOR INSERT WITH CHECK (true);

-- ── Tabla promotions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percent','fixed')),
  value NUMERIC NOT NULL,
  applies_to TEXT NOT NULL CHECK (applies_to IN ('all_products','product')),
  item_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  active BOOLEAN DEFAULT true,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner gestiona sus promociones" ON public.promotions;
CREATE POLICY "Owner gestiona sus promociones" ON public.promotions FOR ALL
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
  WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));



-- Tabla para solicitudes de upgrade de plan
CREATE TABLE IF NOT EXISTS public.upgrade_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  requested_plan TEXT NOT NULL CHECK (requested_plan IN ('pro', 'premium')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.upgrade_requests ENABLE ROW LEVEL SECURITY;

-- El usuario puede insertar/ver su propia solicitud
DROP POLICY IF EXISTS "Users gestionan sus upgrade requests" ON public.upgrade_requests;
CREATE POLICY "Users gestionan sus upgrade requests" ON public.upgrade_requests FOR ALL
  USING (auth.uid() = user_id);


-- Ejecutar en Supabase → SQL Editor

create table if not exists meta_connections (
  id               uuid default gen_random_uuid() primary key,
  business_id      uuid references businesses(id) on delete cascade not null unique,
  access_token     text not null,
  ad_account_id    text,
  meta_user_id     text,
  token_expires_at timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

alter table meta_connections enable row level security;

create policy "Owners manage own meta connection"
  on meta_connections
  for all
  using (
    business_id in (
      select id from businesses where owner_id = auth.uid()
    )
  );


-- Ejecutar en Supabase → SQL Editor
-- Agrega columna page_id a meta_connections

ALTER TABLE meta_connections ADD COLUMN IF NOT EXISTS page_id text;
ALTER TABLE meta_connections ADD COLUMN IF NOT EXISTS page_name text;


ALTER TABLE meta_connections ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD';


-- Conexión de WhatsApp por negocio
CREATE TABLE IF NOT EXISTS public.whatsapp_connections (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id          uuid REFERENCES public.businesses(id) ON DELETE CASCADE UNIQUE,
  phone_number_id      text NOT NULL,
  waba_id              text,
  display_phone_number text,
  access_token         text NOT NULL,
  webhook_verified     boolean DEFAULT false,
  is_active            boolean DEFAULT true,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_whatsapp" ON public.whatsapp_connections;
CREATE POLICY "owner_whatsapp" ON public.whatsapp_connections
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

-- Conversaciones de WhatsApp por cliente
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id     uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_phone  text NOT NULL,
  customer_name   text,
  messages        jsonb DEFAULT '[]',
  last_message_at timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now(),
  UNIQUE (business_id, customer_phone)
);

ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_whatsapp_conv" ON public.whatsapp_conversations;
CREATE POLICY "owner_whatsapp_conv" ON public.whatsapp_conversations
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

-- ── client_profiles / client_history (usadas por /api/client-notes) ──────────
CREATE TABLE IF NOT EXISTS public.client_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  client_email TEXT NOT NULL,
  client_name TEXT,
  client_phone TEXT,
  notes TEXT,
  allergies TEXT,
  preferences TEXT,
  last_service TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, client_email)
);
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners gestionan perfiles de sus clientes" ON public.client_profiles;
CREATE POLICY "Owners gestionan perfiles de sus clientes" ON public.client_profiles FOR ALL
  USING (auth.uid() = (SELECT owner_id FROM public.businesses WHERE id = business_id));

CREATE TABLE IF NOT EXISTS public.client_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  client_email TEXT NOT NULL,
  booking_id UUID,
  service_name TEXT,
  service_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.client_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners gestionan historial de sus clientes" ON public.client_history;
CREATE POLICY "Owners gestionan historial de sus clientes" ON public.client_history FOR ALL
  USING (auth.uid() = (SELECT owner_id FROM public.businesses WHERE id = business_id));

-- ── Storage: bucket público para imágenes (/api/upload-image) ────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-assets', 'business-assets', TRUE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Lectura pública de business-assets" ON storage.objects;
CREATE POLICY "Lectura pública de business-assets" ON storage.objects FOR SELECT USING (bucket_id = 'business-assets');
DROP POLICY IF EXISTS "Usuarios suben a su carpeta en business-assets" ON storage.objects;
CREATE POLICY "Usuarios suben a su carpeta en business-assets" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'business-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Usuarios gestionan su carpeta en business-assets" ON storage.objects;
CREATE POLICY "Usuarios gestionan su carpeta en business-assets" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'business-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
