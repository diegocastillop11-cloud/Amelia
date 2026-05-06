import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name, slug, category, primary_color, is_published, sites(id, status, content, created_at)')
    .eq('owner_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(1)

  const business = businesses?.[0] ?? null
  const site = business
    ? (Array.isArray(business.sites) ? business.sites[0] : business.sites)
    : null
  const hasValidSite = !!(site?.content && (site.content as Record<string, unknown>)?.hero)
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? 'ahí'

  // ── Métricas (solo si hay negocio) ──────────────────────────────────────
  const now   = new Date()
  const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const hoy       = now.toISOString().split('T')[0]

  const [
    { count: citasMes },
    { count: citasPendientes },
    { count: totalClientes },
    { data: proximasCitas },
    { data: license },
  ] = await Promise.all([
    business
      ? supabase.from('bookings').select('*', { count: 'exact', head: true })
          .eq('business_id', business.id).gte('date', mesInicio)
      : Promise.resolve({ count: 0 }),
    business
      ? supabase.from('bookings').select('*', { count: 'exact', head: true })
          .eq('business_id', business.id).eq('status', 'pending').gte('date', hoy)
      : Promise.resolve({ count: 0 }),
    business
      ? supabase.from('clients').select('*', { count: 'exact', head: true })
          .eq('business_id', business.id)
      : Promise.resolve({ count: 0 }),
    business
      ? supabase.from('bookings').select('date, service, customer_name, status')
          .eq('business_id', business.id).gte('date', hoy)
          .neq('status', 'cancelled').order('date', { ascending: true }).limit(5)
      : Promise.resolve({ data: [] }),
    business
      ? supabase.from('licenses').select('plan').eq('business_id', business.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const plan = (license as { plan?: string } | null)?.plan ?? 'free'

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <p className="text-sm mb-0.5" style={{ color: 'var(--text-muted)' }}>Panel de control</p>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Hola, {firstName} 👋
        </h1>
      </div>

      {!business || !hasValidSite ? (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden p-8" style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #2d2a5e 50%, #1e1b4b 100%)',
            border: '1px solid rgba(99,102,241,0.3)',
          }}>
            <h2 className="text-xl font-semibold text-white mb-2">Genera tu sitio web con IA</h2>
            <p className="text-sm mb-5" style={{ color: 'rgba(165,180,252,0.75)' }}>
              Describe tu negocio y nuestra IA crea todo el contenido en segundos.
            </p>
            <Link href="/dashboard/sitio"
                  className="btn-primary inline-flex items-center gap-2"
                  style={{ background: 'white', color: '#4f46e5', textDecoration: 'none' }}>
              ⚡ Crear mi sitio ahora
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">

          {/* ── Sitio card ── */}
          <div className="card p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                     style={{
                       background: `${business.primary_color ?? '#6366f1'}20`,
                       border: `1.5px solid ${business.primary_color ?? '#6366f1'}40`,
                     }}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                       style={{ color: business.primary_color ?? '#6366f1' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
                    {business.name}
                  </p>
                  <p className="text-sm flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                    <span style={{ color: business.is_published ? '#6ee7b7' : '#fcd34d' }}>
                      ● {business.is_published ? 'Publicado' : 'Borrador'}
                    </span>
                    <span>·</span>
                    <span className="mono text-xs">/sitio/{business.slug}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {business.is_published && (
                  <a href={`/sitio/${business.slug}`} target="_blank"
                     className="btn-ghost text-sm" style={{ textDecoration: 'none' }}>
                    Ver sitio ↗
                  </a>
                )}
                <Link href="/dashboard/sitio" className="btn-ghost text-sm"
                      style={{ textDecoration: 'none' }}>
                  🔄 Regenerar
                </Link>
                <Link
                  href={`/dashboard/sitio/editor?id=${business.id}`}
                  className="btn-primary text-sm py-2.5 px-5"
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                  </svg>
                  Editar sitio
                </Link>
              </div>
            </div>
          </div>

          {/* ── Stats ── */}
          <div className="grid grid-cols-3 gap-3">
            <Link href="/dashboard/reservas" className="card card-hover p-5" style={{ textDecoration: 'none' }}>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Citas este mes</p>
              <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {citasMes ?? 0}
              </p>
              {(citasPendientes ?? 0) > 0 && (
                <p className="text-xs mt-1" style={{ color: '#fcd34d' }}>
                  {citasPendientes} por confirmar
                </p>
              )}
              {(citasPendientes ?? 0) === 0 && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Ver agenda →</p>
              )}
            </Link>

            <Link href="/dashboard/clientes" className="card card-hover p-5" style={{ textDecoration: 'none' }}>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Clientes</p>
              <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {totalClientes ?? 0}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {(totalClientes ?? 0) === 0 ? 'Aún sin clientes' : 'Ver todos →'}
              </p>
            </Link>

            <Link href="/dashboard/upgrade" className="card card-hover p-5" style={{ textDecoration: 'none' }}>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Plan actual</p>
              <p className="text-2xl font-semibold capitalize"
                 style={{ color: plan === 'free' ? 'var(--text-primary)' : 'var(--accent-light)' }}>
                {plan}
              </p>
              {plan === 'free' && (
                <p className="text-xs mt-1" style={{ color: 'var(--accent-light)' }}>Mejorar plan →</p>
              )}
            </Link>
          </div>

          {/* ── Próximas citas ── */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                Próximas citas
              </p>
              <Link href="/dashboard/reservas" className="text-xs"
                    style={{ color: 'var(--accent-light)', textDecoration: 'none' }}>
                Ver todas →
              </Link>
            </div>

            {!proximasCitas || proximasCitas.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
                  Aún no hay citas agendadas.
                </p>
                {business.is_published ? (
                  <a href={`/sitio/${business.slug}`} target="_blank"
                     className="btn-ghost text-xs" style={{ textDecoration: 'none' }}>
                    Compartir mi sitio ↗
                  </a>
                ) : (
                  <Link href={`/dashboard/sitio/editor?id=${business.id}`}
                        className="btn-ghost text-xs" style={{ textDecoration: 'none' }}>
                    Publicar sitio →
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {(proximasCitas as { date: string; service: string; customer_name: string; status: string }[]).map((cita, i) => {
                  const fecha = new Date(cita.date + 'T00:00:00')
                  const label = fecha.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })
                  return (
                    <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-xl"
                         style={{ background: 'var(--bg-elevated)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                             style={{ background: `${business.primary_color ?? '#6366f1'}18` }}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                               style={{ color: business.primary_color ?? '#6366f1' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {cita.customer_name}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {cita.service} · {label}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                            style={{
                              background: cita.status === 'confirmed'
                                ? 'rgba(110,231,183,0.12)' : 'rgba(252,211,77,0.12)',
                              color: cita.status === 'confirmed' ? '#6ee7b7' : '#fcd34d',
                            }}>
                        {cita.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
