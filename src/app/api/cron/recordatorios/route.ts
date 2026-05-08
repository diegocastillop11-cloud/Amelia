import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendRecordatorio } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  // Protección: solo Vercel Cron o llamada manual con secret
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Citas de mañana con email del cliente
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dateStr = tomorrow.toISOString().split('T')[0]

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, client_name, client_email, service_name, booking_date, booking_time, business_id, businesses(name, slug)')
    .eq('booking_date', dateStr)
    .eq('status', 'confirmed')
    .not('client_email', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!bookings?.length) return NextResponse.json({ sent: 0, message: 'Sin citas mañana' })

  // Filtrar negocios con módulo recordatorios activo
  const businessIds = bookings.map(b => b.business_id).filter((v, i, a) => a.indexOf(v) === i)
  const { data: licenses } = await supabase
    .from('licenses')
    .select('business_id, modules')
    .in('business_id', businessIds)

  const withModule: Record<string, boolean> = {}
  licenses?.filter(l => l.modules?.recordatorios === true)
           .forEach(l => { withModule[l.business_id] = true })

  const elegibles = bookings.filter(b => withModule[b.business_id])
  if (!elegibles.length) return NextResponse.json({ sent: 0, message: 'Ningún negocio tiene módulo activo' })

  const formatDate = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })

  const results = await Promise.allSettled(
    elegibles.map(b => {
      const biz = Array.isArray(b.businesses) ? b.businesses[0] : b.businesses as { name: string; slug: string } | null
      return sendRecordatorio({
        to:           b.client_email,
        clientName:   b.client_name,
        businessName: biz?.name ?? '',
        serviceName:  b.service_name,
        date:         formatDate(b.booking_date),
        time:         b.booking_time,
      })
    })
  )

  const sent   = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return NextResponse.json({ sent, failed, total: elegibles.length })
}
