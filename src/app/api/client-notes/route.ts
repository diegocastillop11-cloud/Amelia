import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET — buscar cliente por email
export async function GET(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const email       = searchParams.get('email')
  const businessId  = searchParams.get('business_id')

  if (!email || !businessId) return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })

  // Perfil del cliente
  const { data: profile } = await supabase
    .from('client_profiles')
    .select('*')
    .eq('business_id', businessId)
    .eq('client_email', email.toLowerCase())
    .single()

  // Historial de visitas
  const { data: history } = await supabase
    .from('client_history')
    .select('*')
    .eq('business_id', businessId)
    .eq('client_email', email.toLowerCase())
    .order('service_date', { ascending: false })
    .limit(10)

  return NextResponse.json({ profile: profile ?? null, history: history ?? [] })
}

// POST — crear/actualizar perfil de cliente
export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { business_id, client_email, client_name, client_phone,
          notes, allergies, preferences, last_service } = await req.json()

  const { data, error } = await supabase
    .from('client_profiles')
    .upsert({
      business_id,
      client_email: client_email.toLowerCase(),
      client_name, client_phone,
      notes, allergies, preferences, last_service,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'business_id,client_email' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
}

// PATCH — agregar entrada al historial
export async function PATCH(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { business_id, client_email, booking_id, service_name, service_date, notes } = await req.json()

  const { data, error } = await supabase
    .from('client_history')
    .insert({ business_id, client_email: client_email.toLowerCase(),
              booking_id, service_name, service_date, notes })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data })
}
