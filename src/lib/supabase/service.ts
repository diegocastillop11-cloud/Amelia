import { createClient } from '@supabase/supabase-js'

// Cliente con service role — solo para webhooks y procesos server-side sin sesión de usuario
export const createServiceClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
