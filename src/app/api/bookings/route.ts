import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET — dueño ve sus reservas
export async function GET(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('business_id')
  const dateFrom   = searchParams.get('from') ?? new Date().toISOString().slice(0, 10)
  const dateTo     = searchParams.get('to')   ?? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('business_id', businessId!)
    .gte('booking_date', dateFrom)
    .lte('booking_date', dateTo)
    .order('booking_date').order('booking_time')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ bookings: data ?? [] })
}

// POST — cliente público crea una reserva
export async function POST(req: Request) {
  // Usamos service role para que el cliente no autenticado pueda insertar
  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await req.json()
  const { business_id, service_name, client_name, client_phone, client_email,
          booking_date, booking_time, duration_min = 60, notes } = body

  // Validar campos requeridos
  if (!business_id || !service_name || !client_name || !client_phone || !booking_date || !booking_time)
    return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })

  // Verificar que el negocio existe y está publicado
  const { data: biz } = await admin
    .from('businesses').select('id, is_published').eq('id', business_id).single()
  if (!biz?.is_published)
    return NextResponse.json({ error: 'Negocio no disponible' }, { status: 400 })

  // Verificar que el slot no está ya ocupado
  const { data: existing } = await admin
    .from('bookings')
    .select('id')
    .eq('business_id', business_id)
    .eq('booking_date', booking_date)
    .eq('booking_time', booking_time)
    .neq('status', 'cancelled')
    .single()

  if (existing)
    return NextResponse.json({ error: 'Ese horario ya está reservado. Por favor elige otro.' }, { status: 409 })

  // Verificar que la fecha no está bloqueada
  const { data: blocked } = await admin
    .from('blocked_dates')
    .select('id')
    .eq('business_id', business_id)
    .eq('blocked_date', booking_date)
    .single()

  if (blocked)
    return NextResponse.json({ error: 'Esa fecha no está disponible.' }, { status: 409 })

  const { data: booking, error } = await admin
    .from('bookings')
    .insert({ business_id, service_name, client_name, client_phone, client_email,
              booking_date, booking_time, duration_min, notes, status: 'confirmed' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Upsert cliente — actualiza last_visit y total_visits automáticamente
  if (client_email) {
    const { data: existing } = await admin
      .from('clients')
      .select('id, total_visits')
      .eq('business_id', business_id)
      .eq('email', client_email)
      .single()

    if (existing) {
      await admin.from('clients').update({
        name: client_name,
        phone: client_phone,
        last_visit: booking_date,
        total_visits: (existing.total_visits ?? 0) + 1,
      }).eq('id', existing.id)
    } else {
      await admin.from('clients').insert({
        business_id, email: client_email,
        name: client_name, phone: client_phone,
        last_visit: booking_date, total_visits: 1,
      })
    }
  }

  return NextResponse.json({ booking, success: true })
}

// PATCH — dueño actualiza estado de reserva
export async function PATCH(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { booking_id, status } = await req.json()
  const { error } = await supabase
    .from('bookings').update({ status }).eq('id', booking_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
