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
CREATE POLICY "owner_whatsapp_conv" ON public.whatsapp_conversations
  USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));
