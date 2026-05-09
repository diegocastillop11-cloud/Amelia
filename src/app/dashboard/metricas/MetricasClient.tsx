'use client'

interface MesData  { key: string; label: string; total: number }
interface Servicio { name: string; count: number }
interface TopProducto { id: string; name: string; revenue: number; units: number; margin: number | null }
interface StockAlert { id: string; name: string; stock: number }

interface VentasData {
  totalRevenue: number; totalCost: number; totalProfit: number; margenPct: number
  ventasPorMes: MesData[]
  topProductos: TopProducto[]
  stockAlerts: StockAlert[]
}

interface Props {
  businessName: string
  citasPorMes: MesData[]
  clientesPorMes: MesData[]
  estados: { confirmed: number; completed: number; cancelled: number }
  rankingServicios: Servicio[]
  totales: { citas: number; clientes: number; tasaCompletadas: number }
  ventas: VentasData
}

// ── Gráfico de barras CSS ─────────────────────────────────────────────────────

function BarChart({ data, color, formatValue }: { data: MesData[]; color: string; formatValue?: (v: number) => string }) {
  const max = Math.max(...data.map(d => d.total), 1)
  const fmt = formatValue ?? ((v: number) => String(v))
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
      {data.map(d => {
        const pct = (d.total / max) * 100
        return (
          <div key={d.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', lineHeight: 1, textAlign: 'center' }}>
              {d.total > 0 ? fmt(d.total) : ''}
            </span>
            <div style={{ width: '100%', position: 'relative', height: `${Math.max(pct, 2)}%`,
                          background: `${color}25`, borderRadius: '6px 6px 0 0',
                          border: `1px solid ${color}40`, borderBottom: 'none',
                          transition: 'height 0.3s ease' }}>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0,
                             height: `${Math.min(pct, 30)}%`, minHeight: 3,
                             background: color, borderRadius: '4px 4px 0 0', opacity: 0.9 }} />
            </div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', lineHeight: 1 }}>
              {d.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Donut de estado ───────────────────────────────────────────────────────────

function EstadoDonut({ estados }: { estados: Props['estados'] }) {
  const total = estados.confirmed + estados.completed + estados.cancelled
  if (total === 0) return (
    <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
      Sin citas este mes
    </p>
  )
  const items = [
    { label: 'Confirmadas', value: estados.confirmed, color: '#6366f1' },
    { label: 'Completadas', value: estados.completed, color: '#6ee7b7' },
    { label: 'Canceladas',  value: estados.cancelled, color: '#f87171' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map(item => {
        const pct = total > 0 ? Math.round((item.value / total) * 100) : 0
        return (
          <div key={item.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{item.label}</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: item.color }}>
                {item.value} <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 400 }}>({pct}%)</span>
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: item.color,
                             borderRadius: 3, transition: 'width 0.4s ease', opacity: 0.85 }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function fmtCLP(n: number) {
  if (n >= 1_000_000) return `$${(n/1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${Math.round(n/1_000)}K`
  return `$${n.toLocaleString('es-CL')}`
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function MetricasClient({
  businessName, citasPorMes, clientesPorMes, estados, rankingServicios, totales, ventas,
}: Props) {
  const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  const now = new Date()
  const mesActualLabel = `${MESES[now.getMonth()]} ${now.getFullYear()}`
  const tieneVentas = ventas.totalRevenue > 0

  return (
    <div className="p-8 max-w-4xl">

      {/* Header */}
      <div className="mb-8">
        <p className="text-sm mb-0.5" style={{ color: 'var(--text-muted)' }}>{businessName}</p>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Métricas</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Últimos 6 meses</p>
      </div>

      {/* KPIs citas */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Citas totales',     value: totales.citas,           icon: '📅', sub: 'últimos 6 meses' },
          { label: 'Clientes nuevos',   value: totales.clientes,        icon: '👥', sub: 'últimos 6 meses' },
          { label: 'Tasa completadas',  value: `${totales.tasaCompletadas}%`, icon: '✅', sub: 'del total de citas' },
        ].map(k => (
          <div key={k.label} className="card p-5">
            <p style={{ fontSize: '1.5rem', marginBottom: 4 }}>{k.icon}</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{k.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{k.label}</p>
            <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 2 }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── SECCIÓN VENTAS ── */}
      {tieneVentas && (
        <>
          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0 16px' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Ventas de productos
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {/* KPIs ventas */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Ingresos', value: fmtCLP(ventas.totalRevenue), icon: '💰', color: '#6ee7b7', sub: 'ventas completadas' },
              { label: 'Costo',    value: fmtCLP(ventas.totalCost),    icon: '📦', color: '#f59e0b', sub: 'costo de productos' },
              { label: 'Ganancia', value: fmtCLP(ventas.totalProfit),  icon: '📈', color: ventas.totalProfit >= 0 ? '#6ee7b7' : '#f87171', sub: 'ingreso − costo' },
              { label: 'Margen',   value: `${ventas.margenPct}%`,      icon: '🎯', color: ventas.margenPct >= 30 ? '#6ee7b7' : ventas.margenPct >= 15 ? '#f59e0b' : '#f87171', sub: 'margen neto' },
            ].map(k => (
              <div key={k.label} className="card p-4">
                <p style={{ fontSize: '1.25rem', marginBottom: 4 }}>{k.icon}</p>
                <p style={{ fontSize: '1.375rem', fontWeight: 800, color: k.color, margin: 0 }}>{k.value}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{k.label}</p>
                <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginTop: 1 }}>{k.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Ingresos por mes */}
            <div className="card p-6">
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                Ingresos por mes
              </p>
              <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>Pedidos completados</p>
              <BarChart data={ventas.ventasPorMes} color="#6ee7b7" formatValue={fmtCLP} />
            </div>

            {/* Top productos */}
            <div className="card p-6">
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                Top productos por ingreso
              </p>
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Pedidos completados</p>
              {ventas.topProductos.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sin datos aún</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {ventas.topProductos.map((p, i) => {
                    const maxRev = ventas.topProductos[0].revenue
                    const pct = Math.round((p.revenue / maxRev) * 100)
                    return (
                      <div key={p.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', width: 16, textAlign: 'right' }}>
                              #{i + 1}
                            </span>
                            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)',
                                            maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.name}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            {p.margin !== null && (
                              <span style={{ fontSize: '0.6875rem', fontWeight: 700,
                                              color: p.margin >= 30 ? '#6ee7b7' : p.margin >= 15 ? '#f59e0b' : '#f87171' }}>
                                {p.margin}%
                              </span>
                            )}
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {fmtCLP(p.revenue)}
                            </span>
                          </div>
                        </div>
                        <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginLeft: 22 }}>
                          <div style={{ height: '100%', width: `${pct}%`,
                                         background: 'linear-gradient(90deg, #6ee7b7, #34d399)',
                                         borderRadius: 3, transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Stock alerts */}
      {ventas.stockAlerts.length > 0 && (
        <div className="card p-5 mb-4">
          <div style={{ display: 'flex', alignItems: 'center', gap:8, marginBottom: 14 }}>
            <span style={{ fontSize: '1.125rem' }}>⚠️</span>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Alertas de stock</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Productos con poco o sin stock</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ventas.stockAlerts.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '8px 12px', borderRadius: 8,
                                        background: p.stock === 0 ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)',
                                        border: `1px solid ${p.stock === 0 ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{p.name}</span>
                <span style={{ fontSize: 13, fontWeight: 800,
                                color: p.stock === 0 ? '#f87171' : '#f59e0b' }}>
                  {p.stock === 0 ? 'Sin stock' : `${p.stock} ud.`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Citas por mes */}
        <div className="card p-6">
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            Citas por mes
          </p>
          <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>Total de citas agendadas</p>
          <BarChart data={citasPorMes} color="#6366f1" />
        </div>

        {/* Clientes nuevos */}
        <div className="card p-6">
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            Clientes nuevos por mes
          </p>
          <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>Primeras visitas registradas</p>
          <BarChart data={clientesPorMes} color="#6ee7b7" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Estado de citas este mes */}
        <div className="card p-6">
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            Estado de citas
          </p>
          <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
            {mesActualLabel}
          </p>
          <EstadoDonut estados={estados} />
        </div>

        {/* Top servicios */}
        <div className="card p-6">
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            Servicios más solicitados
          </p>
          <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>Excluyendo canceladas</p>

          {rankingServicios.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin datos aún</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rankingServicios.map((s, i) => {
                const max = rankingServicios[0].count
                const pct = Math.round((s.count / max) * 100)
                return (
                  <div key={s.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)',
                                        width: 16, textAlign: 'right' }}>
                          #{i + 1}
                        </span>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)',
                                        maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.name}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>
                        {s.count}
                      </span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginLeft: 22 }}>
                      <div style={{ height: '100%', width: `${pct}%`,
                                     background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                     borderRadius: 3, transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
