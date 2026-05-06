import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { count: totalBusinesses },
    { count: publishedSites },
    { count: totalOwners },
    { count: upgradeCount },
  ] = await Promise.all([
    supabase.from('businesses').select('*', { count: 'exact', head: true }),
    supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('is_published', true),
    supabase.from('owners').select('*', { count: 'exact', head: true }).eq('is_superadmin', false),
    supabase.from('upgrade_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  const pending = upgradeCount ?? 0

  const stats = [
    { label: 'Negocios', value: totalBusinesses ?? 0, icon: '🏪' },
    { label: 'Publicados', value: publishedSites ?? 0, icon: '🌐' },
    { label: 'Usuarios', value: totalOwners ?? 0, icon: '👥' },
    { label: 'Upgrades pendientes', value: pending, icon: '🔔', alert: pending > 0 },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Panel de control</p>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Dashboard Admin</h1>
        <p className="text-xs mono mt-1" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="card p-5"
               style={s.alert ? { borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' } : {}}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xl">{s.icon}</span>
              {s.alert && <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#f59e0b' }} />}
            </div>
            <p className="text-3xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Alerta upgrades */}
      {pending > 0 && (
        <div className="card p-5 mb-6 flex items-center justify-between"
             style={{ borderColor: 'rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.05)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                 style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>🔔</div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {pending} solicitud{pending > 1 ? 'es' : ''} de upgrade pendiente{pending > 1 ? 's' : ''}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Clientes que quieren cambiar de plan</p>
            </div>
          </div>
          <Link href="/admin/upgrades" className="btn-ghost" style={{ color: '#fcd34d', borderColor: 'rgba(245,158,11,0.3)' }}>
            Revisar →
          </Link>
        </div>
      )}

      {/* Accesos rápidos */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Accesos rápidos</h2>
        <div className="flex gap-3">
          <Link href="/admin/clientes" className="btn-primary">Ver clientes</Link>
          <Link href="/admin/clientes/nuevo" className="btn-secondary">+ Nuevo cliente</Link>
        </div>
      </div>
    </div>
  )
}
