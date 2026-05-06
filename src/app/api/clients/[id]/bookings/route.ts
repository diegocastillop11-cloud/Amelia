import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  // Obtener email del cliente
  const { data: client } = await supabase
    .from('clients').select('email, business_id').eq('id', params.id).single()

  if (!client) return NextResponse.json({ bookings: [] })

  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, service_name, booking_date, booking_time, status, notes')
    .eq('business_id', client.business_id)
    .eq('client_email', client.email)
    .order('booking_date', { ascending: false })
    .limit(20)

  return NextResponse.json({ bookings: bookings ?? [] })
}
