import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MetricasClient from './MetricasClient'

export default async function MetricasPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: biz } = await supabase
    .from('businesses').select('id, name').eq('owner_id', user.id).maybeSingle()
  if (!biz) redirect('/dashboard')

  // Últimos 6 meses
  const desde = new Date()
  desde.setMonth(desde.getMonth() - 5)
  desde.setDate(1)
  const desdeStr = desde.toISOString().split('T')[0]

  const [
    { data: bookings },
    { data: clients },
    { data: topServices },
  ] = await Promise.all([
    // Todas las citas de los últimos 6 meses
    supabase.from('bookings')
      .select('booking_date, status, service_name, duration_min')
      .eq('business_id', biz.id)
      .gte('booking_date', desdeStr)
      .order('booking_date', { ascending: true }),

    // Clientes con fecha de creación
    supabase.from('clients')
      .select('created_at')
      .eq('business_id', biz.id)
      .gte('created_at', desdeStr + 'T00:00:00'),

    // Top 5 servicios
    supabase.from('bookings')
      .select('service_name')
      .eq('business_id', biz.id)
      .neq('status', 'cancelled'),
  ])

  // ── Procesar datos ────────────────────────────────────────────────────────

  // Meses para el eje X
  const meses: { key: string; label: string }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    meses.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('es-CL', { month: 'short' }),
    })
  }

  // Citas por mes
  const citasPorMes = meses.map(m => ({
    ...m,
    total: bookings?.filter(b => b.booking_date?.startsWith(m.key)).length ?? 0,
  }))

  // Clientes nuevos por mes
  const clientesPorMes = meses.map(m => ({
    ...m,
    total: clients?.filter(c => c.created_at?.startsWith(m.key)).length ?? 0,
  }))

  // Estado de citas este mes
  const mesActual = meses[meses.length - 1].key
  const citasMes  = bookings?.filter(b => b.booking_date?.startsWith(mesActual)) ?? []
  const estados   = {
    confirmed:  citasMes.filter(b => b.status === 'confirmed').length,
    completed:  citasMes.filter(b => b.status === 'completed').length,
    cancelled:  citasMes.filter(b => b.status === 'cancelled').length,
  }

  // Top servicios
  const serviceCounts: Record<string, number> = {}
  topServices?.forEach(b => {
    if (b.service_name) serviceCounts[b.service_name] = (serviceCounts[b.service_name] ?? 0) + 1
  })
  const rankingServicios = Object.entries(serviceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))

  // Totales globales
  const totalCitas    = bookings?.length ?? 0
  const totalClientes = clients?.length ?? 0
  const tasaCompletadas = totalCitas > 0
    ? Math.round(((bookings?.filter(b => b.status === 'completed').length ?? 0) / totalCitas) * 100)
    : 0

  return (
    <MetricasClient
      businessName={biz.name}
      citasPorMes={citasPorMes}
      clientesPorMes={clientesPorMes}
      estados={estados}
      rankingServicios={rankingServicios}
      totales={{ citas: totalCitas, clientes: totalClientes, tasaCompletadas }}
    />
  )
}
