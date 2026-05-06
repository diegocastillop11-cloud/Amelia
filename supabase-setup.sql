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

CREATE POLICY "Owners ven su propio perfil"
  ON public.owners FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Owners actualizan su propio perfil"
  ON public.owners FOR UPDATE
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
  description TEXT,
  primary_color TEXT DEFAULT '#0ea5e9',
  logo_url TEXT,
  cover_url TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners gestionan sus negocios"
  ON public.businesses FOR ALL
  USING (auth.uid() = owner_id);

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

CREATE POLICY "Owners gestionan sus sitios"
  ON public.sites FOR ALL
  USING (
    auth.uid() = (
      SELECT owner_id FROM public.businesses WHERE id = business_id
    )
  );

-- Sitios publicados son públicos
CREATE POLICY "Sitios publicados son públicos"
  ON public.sites FOR SELECT
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

CREATE POLICY "Templates son públicas"
  ON public.templates FOR SELECT
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

CREATE POLICY "Owners gestionan sus productos"
  ON public.products FOR ALL
  USING (
    auth.uid() = (
      SELECT owner_id FROM public.businesses WHERE id = business_id
    )
  );

-- 7. BOOKINGS
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  service TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners gestionan sus reservas"
  ON public.bookings FOR ALL
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

CREATE POLICY "Owners ven su licencia"
  ON public.licenses FOR SELECT
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

CREATE POLICY "Owners gestionan sus settings"
  ON public.site_settings FOR ALL
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

CREATE POLICY "Owners gestionan sus horarios"
  ON public.schedules FOR ALL
  USING (auth.uid() = (SELECT owner_id FROM public.businesses WHERE id = business_id));

-- Horarios públicos para que el chatbot pueda leerlos
CREATE POLICY "Horarios publicados son públicos"
  ON public.schedules FOR SELECT
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

CREATE POLICY "Owners gestionan fechas bloqueadas"
  ON public.blocked_dates FOR ALL
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

CREATE POLICY "Owners gestionan sus reservas"
  ON public.bookings FOR ALL
  USING (auth.uid() = (SELECT owner_id FROM public.businesses WHERE id = business_id));

CREATE POLICY "Público puede crear reservas"
  ON public.bookings FOR INSERT
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

CREATE POLICY "Owners gestionan sus clientes"
  ON public.clients FOR ALL
  USING (auth.uid() = (SELECT owner_id FROM public.businesses WHERE id = business_id));

-- ============================================================
-- VERIFICACIÓN: Ejecuta esto para confirmar que todo se creó OK
-- ============================================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- ORDER BY table_name;
