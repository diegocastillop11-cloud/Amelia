import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendReactivacion } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Clientes con última visita hace más de 30 días
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, name, email, last_visit, business_id, businesses(name, slug)')
    .not('email', 'is', null)
    .not('last_visit', 'is', null)
    .lt('last_visit', cutoffStr)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!clients?.length) return NextResponse.json({ sent: 0, message: 'Sin clientes inactivos' })

  // Filtrar negocios con módulo recordatorios activo
  const businessIds = clients.map(c => c.business_id).filter((v, i, a) => a.indexOf(v) === i)
  const { data: licenses } = await supabase
    .from('licenses')
    .select('business_id, modules')
    .in('business_id', businessIds)

  const withModule: Record<string, boolean> = {}
  licenses?.filter(l => l.modules?.recordatorios === true)
           .forEach(l => { withModule[l.business_id] = true })

  const elegibles = clients.filter(c => withModule[c.business_id])
  if (!elegibles.length) return NextResponse.json({ sent: 0, message: 'Ningún negocio tiene módulo activo' })

  const formatDate = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ameliapp.cl'

  const results = await Promise.allSettled(
    elegibles.map(c => {
      const biz = Array.isArray(c.businesses) ? c.businesses[0] : c.businesses as { name: string; slug: string } | null
      return sendReactivacion({
        to:           c.email,
        clientName:   c.name,
        businessName: biz?.name ?? '',
        lastVisit:    formatDate(c.last_visit),
        bookingUrl:   `${baseUrl}/sitio/${biz?.slug ?? ''}`,
      })
    })
  )

  const sent   = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  return NextResponse.json({ sent, failed, total: elegibles.length })
}
