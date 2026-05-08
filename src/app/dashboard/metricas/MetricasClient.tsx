'use client'

interface MesData  { key: string; label: string; total: number }
interface Servicio { name: string; count: number }

interface Props {
  businessName: string
  citasPorMes: MesData[]
  clientesPorMes: MesData[]
  estados: { confirmed: number; completed: number; cancelled: number }
  rankingServicios: Servicio[]
  totales: { citas: number; clientes: number; tasaCompletadas: number }
}

// ── Gráfico de barras CSS ─────────────────────────────────────────────────────

function BarChart({ data, color }: { data: MesData[]; color: string }) {
  const max = Math.max(...data.map(d => d.total), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
      {data.map(d => {
        const pct = (d.total / max) * 100
        return (
          <div key={d.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', lineHeight: 1 }}>
              {d.total > 0 ? d.total : ''}
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

// ── Página principal ──────────────────────────────────────────────────────────

export default function MetricasClient({
  businessName, citasPorMes, clientesPorMes, estados, rankingServicios, totales,
}: Props) {
  const mesActualLabel = new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })

  return (
    <div className="p-8 max-w-4xl">

      {/* Header */}
      <div className="mb-8">
        <p className="text-sm mb-0.5" style={{ color: 'var(--text-muted)' }}>{businessName}</p>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Métricas</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Últimos 6 meses</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Citas totales', value: totales.citas, icon: '📅', sub: 'últimos 6 meses' },
          { label: 'Clientes nuevos', value: totales.clientes, icon: '👥', sub: 'últimos 6 meses' },
          { label: 'Tasa completadas', value: `${totales.tasaCompletadas}%`, icon: '✅', sub: 'del total de citas' },
        ].map(k => (
          <div key={k.label} className="card p-5">
            <p style={{ fontSize: '1.5rem', marginBottom: 4 }}>{k.icon}</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{k.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{k.label}</p>
            <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 2 }}>{k.sub}</p>
          </div>
        ))}
      </div>

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
