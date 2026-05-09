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
    { data: orders },
    { data: products },
  ] = await Promise.all([
    supabase.from('bookings')
      .select('booking_date, status, service_name, duration_min')
      .eq('business_id', biz.id)
      .gte('booking_date', desdeStr)
      .order('booking_date', { ascending: true }),

    supabase.from('clients')
      .select('created_at')
      .eq('business_id', biz.id)
      .gte('created_at', desdeStr + 'T00:00:00'),

    supabase.from('bookings')
      .select('service_name')
      .eq('business_id', biz.id)
      .neq('status', 'cancelled'),

    // Pedidos completados en los últimos 6 meses
    supabase.from('orders')
      .select('total, items, created_at')
      .eq('business_id', biz.id)
      .eq('status', 'completed')
      .gte('created_at', desdeStr + 'T00:00:00'),

    // Productos con stock y precio costo
    supabase.from('products')
      .select('id, name, price, cost_price, stock')
      .eq('business_id', biz.id),
  ])

  // ── Meses para el eje X ───────────────────────────────────────────────────
  const meses: { key: string; label: string }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    meses.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][d.getMonth()],
    })
  }

  // ── Citas ─────────────────────────────────────────────────────────────────
  const citasPorMes = meses.map(m => ({
    ...m, total: bookings?.filter(b => b.booking_date?.startsWith(m.key)).length ?? 0,
  }))
  const clientesPorMes = meses.map(m => ({
    ...m, total: clients?.filter(c => c.created_at?.startsWith(m.key)).length ?? 0,
  }))
  const mesActual = meses[meses.length - 1].key
  const citasMes  = bookings?.filter(b => b.booking_date?.startsWith(mesActual)) ?? []
  const estados   = {
    confirmed: citasMes.filter(b => b.status === 'confirmed').length,
    completed: citasMes.filter(b => b.status === 'completed').length,
    cancelled: citasMes.filter(b => b.status === 'cancelled').length,
  }
  const serviceCounts: Record<string, number> = {}
  topServices?.forEach(b => {
    if (b.service_name) serviceCounts[b.service_name] = (serviceCounts[b.service_name] ?? 0) + 1
  })
  const rankingServicios = Object.entries(serviceCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([name, count]) => ({ name, count }))
  const totalCitas    = bookings?.length ?? 0
  const totalClientes = clients?.length ?? 0
  const tasaCompletadas = totalCitas > 0
    ? Math.round(((bookings?.filter(b => b.status === 'completed').length ?? 0) / totalCitas) * 100) : 0

  // ── Ventas ────────────────────────────────────────────────────────────────
  interface OrderItem { id?: string; name: string; qty: number; price: number; promo_price?: number }
  type OrderRow = { total: number; items: OrderItem[]; created_at: string }

  const productMap = new Map((products ?? []).map(p => [p.id, p]))

  // Ingresos por mes
  const ventasPorMes = meses.map(m => {
    const monthOrders = (orders ?? []).filter((o: OrderRow) => o.created_at?.startsWith(m.key))
    const total = monthOrders.reduce((acc: number, o: OrderRow) => acc + (o.total ?? 0), 0)
    return { ...m, total }
  })

  // Totales de ventas
  let totalRevenue = 0, totalCost = 0
  const productRevenue: Record<string, { name: string; revenue: number; units: number }> = {}

  for (const order of (orders ?? []) as OrderRow[]) {
    totalRevenue += order.total ?? 0
    const items: OrderItem[] = Array.isArray(order.items) ? order.items : []
    for (const item of items) {
      const pid = item.id ?? ''
      const prod = pid ? productMap.get(pid) : null
      const effectivePrice = item.promo_price ?? item.price
      const lineRevenue = effectivePrice * item.qty
      if (prod?.cost_price) totalCost += prod.cost_price * item.qty
      if (pid) {
        if (!productRevenue[pid]) productRevenue[pid] = { name: item.name, revenue: 0, units: 0 }
        productRevenue[pid].revenue += lineRevenue
        productRevenue[pid].units   += item.qty
      }
    }
  }

  const totalProfit = totalRevenue - totalCost
  const margenPct   = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0

  const topProductos = Object.entries(productRevenue)
    .sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5)
    .map(([id, v]) => {
      const prod = productMap.get(id)
      const cost = prod?.cost_price ? prod.cost_price * v.units : null
      const margin = (cost !== null && v.revenue > 0) ? Math.round((1 - cost / v.revenue) * 100) : null
      return { id, name: v.name, revenue: v.revenue, units: v.units, margin }
    })

  // Stock alerts
  const stockAlerts = (products ?? [])
    .filter(p => p.stock != null && p.stock <= 5)
    .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0))
    .slice(0, 10)
    .map(p => ({ id: p.id, name: p.name, stock: p.stock as number }))

  return (
    <MetricasClient
      businessName={biz.name}
      citasPorMes={citasPorMes}
      clientesPorMes={clientesPorMes}
      estados={estados}
      rankingServicios={rankingServicios}
      totales={{ citas: totalCitas, clientes: totalClientes, tasaCompletadas }}
      ventas={{ totalRevenue, totalCost, totalProfit, margenPct, ventasPorMes, topProductos, stockAlerts }}
    />
  )
}
