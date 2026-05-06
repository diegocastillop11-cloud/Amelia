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
          {/* CTA crear sitio */}
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

          {/* ── Sitio card con botón Editar prominente ── */}
          <div className="card p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                {/* Indicador color */}
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

              {/* Acciones */}
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
                {/* ✅ Botón Editar prominente */}
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

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            <Link href="/dashboard/reservas" className="card card-hover p-5" style={{ textDecoration: 'none' }}>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Próximas reservas</p>
              <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>—</p>
              <p className="text-xs mt-1" style={{ color: 'var(--accent-light)' }}>Configurar →</p>
            </Link>
            <Link href="/dashboard/productos" className="card card-hover p-5" style={{ textDecoration: 'none' }}>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Productos</p>
              <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>—</p>
            </Link>
            <Link href="/dashboard/upgrade" className="card card-hover p-5" style={{ textDecoration: 'none' }}>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Plan actual</p>
              <p className="text-2xl font-semibold" style={{ color: 'var(--accent-light)' }}>Free</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Mejorar →</p>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
