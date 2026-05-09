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

CREATE POLICY "Owner lee sus pedidos"
  ON public.orders FOR SELECT
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Owner actualiza sus pedidos"
  ON public.orders FOR UPDATE
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Insertar pedido público"
  ON public.orders FOR INSERT WITH CHECK (true);

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

CREATE POLICY "Owner gestiona sus promociones"
  ON public.promotions FOR ALL
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
CREATE POLICY "Users gestionan sus upgrade requests"
  ON public.upgrade_requests FOR ALL
  USING (auth.uid() = user_id);
