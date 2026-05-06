-- Ejecutar en Supabase SQL Editor (complemento al setup inicial)

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
