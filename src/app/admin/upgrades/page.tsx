import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import UpgradeActions from './UpgradeActions'

export default async function UpgradesPage() {
  const supabase = createClient()

  const { data: requests } = await supabase
    .from('upgrade_requests')
    .select('id, requested_plan, status, created_at, email, user_id')
    .order('created_at', { ascending: false })

  const pending   = requests?.filter(r => r.status === 'pending') ?? []
  const completed = requests?.filter(r => r.status === 'completed') ?? []

  async function getBusinessIdForUser(userId: string) {
    const { data } = await supabase
      .from('businesses').select('id').eq('owner_id', userId).maybeSingle()
    return data?.id ?? null
  }

  const pendingWithBusiness = await Promise.all(
    pending.map(async r => ({
      ...r,
      business_id: await getBusinessIdForUser(r.user_id),
    }))
  )

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <Link href="/admin" className="text-xs mb-2 inline-flex items-center gap-1"
              style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          ← Volver al dashboard
        </Link>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Solicitudes de upgrade
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {pending.length} pendiente{pending.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Pendientes */}
      {pendingWithBusiness.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-2xl mb-2">✅</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin solicitudes pendientes</p>
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3"
             style={{ color: 'var(--text-muted)' }}>Pendientes</p>
          {pendingWithBusiness.map(r => (
            <div key={r.id} className="card p-5 flex items-center justify-between gap-4 flex-wrap"
                 style={{ borderColor: 'rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.03)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                     style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)', fontSize: '1.125rem' }}>
                  🔔
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{r.email}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Solicita plan <strong style={{ color: '#fcd34d' }}>{r.requested_plan.toUpperCase()}</strong>
                    {' · '}{new Date(r.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {r.business_id && (
                  <Link href={`/admin/clientes/${r.business_id}`}
                        className="btn-ghost text-xs" style={{ textDecoration: 'none' }}>
                    Ver cliente
                  </Link>
                )}
                <UpgradeActions
                  requestId={r.id}
                  businessId={r.business_id}
                  plan={r.requested_plan}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completadas */}
      {completed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3"
             style={{ color: 'var(--text-muted)' }}>Aprobadas</p>
          {completed.map(r => (
            <div key={r.id} className="card p-4 flex items-center justify-between"
                 style={{ opacity: 0.6 }}>
              <div>
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{r.email}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Plan {r.requested_plan.toUpperCase()} · aprobado
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ background: 'rgba(110,231,183,0.1)', color: '#6ee7b7', border: '1px solid rgba(110,231,183,0.2)' }}>
                ✓ Completado
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
