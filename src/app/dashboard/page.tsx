import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import PrimerosPasos from '@/components/dashboard/PrimerosPasos'

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
          .eq('business_id', business.id).gte('booking_date', mesInicio)
      : Promise.resolve({ count: 0 }),
    business
      ? supabase.from('bookings').select('*', { count: 'exact', head: true })
          .eq('business_id', business.id).eq('status', 'pending').gte('booking_date', hoy)
      : Promise.resolve({ count: 0 }),
    business
      ? supabase.from('clients').select('*', { count: 'exact', head: true })
          .eq('business_id', business.id)
      : Promise.resolve({ count: 0 }),
    business
      ? supabase.from('bookings').select('booking_date, booking_time, service_name, client_name, status')
          .eq('business_id', business.id).gte('booking_date', hoy)
          .neq('status', 'cancelled').order('booking_date', { ascending: true })
          .order('booking_time', { ascending: true }).limit(5)
      : Promise.resolve({ data: [] }),
    business
      ? supabase.from('licenses').select('plan').eq('business_id', business.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const plan = (license as { plan?: string } | null)?.plan ?? 'free'

  const dashCss = `
    @keyframes db-beam-spin{from{transform:translate(-50%,-50%) rotate(0deg)}to{transform:translate(-50%,-50%) rotate(360deg)}}
    .db-beam{position:relative;overflow:hidden;z-index:0}
    .db-beam::before{content:'';position:absolute;inset:0;width:220%;aspect-ratio:1;top:50%;left:50%;transform:translate(-50%,-50%);
      background:conic-gradient(transparent 0deg,transparent 258deg,rgba(255,255,255,0.88) 288deg,rgba(255,255,255,0.45) 308deg,transparent 338deg);
      animation:db-beam-spin 2.8s linear infinite;pointer-events:none;z-index:-1}
    @keyframes db-shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
    .db-shimmer{background:linear-gradient(90deg,#818cf8,#a78bfa,#c4b5fd,#818cf8);background-size:220% auto;
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
      animation:db-shimmer 3.5s linear infinite}
    @keyframes db-aurora{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(4%,6%) scale(1.1)}}
    .db-aurora-blob{position:absolute;border-radius:50%;filter:blur(55px);pointer-events:none;animation:db-aurora 9s ease-in-out infinite}
    .db-card-content{position:relative;z-index:1}
    .db-stat-card{transition:transform 0.2s cubic-bezier(0.22,1,0.36,1),box-shadow 0.2s,border-color 0.2s}
    .db-stat-card:hover{transform:translateY(-4px);box-shadow:0 16px 40px rgba(99,102,241,0.13) !important}
    .db-count{display:inline-block}
  `
  const dashScript = `
    (function(){
      function run(){
        document.querySelectorAll('.db-count').forEach(function(el){
          var t=parseInt(el.getAttribute('data-target')||'0',10);
          if(!t)return;
          el.textContent='0';
          var s=null,d=900;
          function step(ts){if(!s)s=ts;var p=Math.min((ts-s)/d,1),e=1-Math.pow(1-p,3);el.textContent=Math.round(e*t);if(p<1)requestAnimationFrame(step)}
          requestAnimationFrame(step);
        });
      }
      document.readyState==='loading'?document.addEventListener('DOMContentLoaded',run):run();
    })()
  `

  return (
    <div className="p-8 max-w-4xl">
      <style dangerouslySetInnerHTML={{ __html: dashCss }} />
      <script dangerouslySetInnerHTML={{ __html: dashScript }} />
      <div className="mb-8">
        <p className="text-sm mb-0.5" style={{ color: 'var(--text-muted)' }}>Panel de control</p>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Hola, {firstName} 👋
        </h1>
      </div>

      <PrimerosPasos
        enlace={business?.is_published && business.slug ? `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/sitio/${business.slug}` : null}
        pasos={[
          { titulo: 'Crea tu sitio web', detalle: 'Cuéntanos de tu negocio y lo armamos por ti en segundos.', hecho: hasValidSite, href: '/dashboard/sitio', boton: 'Crear mi sitio' },
          { titulo: 'Revisa tus servicios y precios', detalle: 'Cambia los textos y pon tus precios reales.', hecho: !!((site?.content as { services?: { price?: string }[] } | undefined)?.services ?? []).some(sv => sv.price && sv.price !== '$0'), href: '/dashboard/sitio/editor', boton: 'Revisar mi sitio' },
          { titulo: 'Publica tu sitio', detalle: 'Así tus clientes pueden verlo en internet.', hecho: !!business?.is_published, href: '/dashboard/sitio/editor', boton: 'Publicar mi sitio' },
        ]}
      />

      {!business || !hasValidSite ? (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden p-8" style={{
            background: 'var(--hero-bg)',
            border: 'none',
          }}>
            <h2 className="text-xl font-semibold text-white mb-2">Genera tu sitio web con IA</h2>
            <p className="text-sm mb-5" style={{ color: 'rgba(255,255,255,0.85)' }}>
              Describe tu negocio y nuestra IA crea todo el contenido en segundos.
            </p>
            <Link href="/dashboard/sitio"
                  className="btn-primary inline-flex items-center gap-2"
                  style={{ background: 'white', color: 'var(--accent-light)', textDecoration: 'none' }}>
              ⚡ Crear mi sitio ahora
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">

          {/* ── Sitio card ── */}
          <div className="card p-6" style={{ position: 'relative', overflow: 'hidden' }}>
            {/* Aurora blob */}
            <div className="db-aurora-blob" style={{
              width: '55%', height: '160%', top: '-40%', right: '-8%',
              background: `radial-gradient(${business.primary_color ?? '#6366f1'}22, transparent 70%)`,
            }} />
            <div className="db-card-content">
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
                  className="btn-primary db-beam text-sm py-2.5 px-5"
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
          </div>

          {/* ── Stats ── */}
          <div className="grid grid-cols-3 gap-3">
            <Link href="/dashboard/reservas" className="card card-hover db-stat-card p-5" style={{ textDecoration: 'none' }}>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Citas este mes</p>
              <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                <span className="db-count" data-target={citasMes ?? 0} suppressHydrationWarning>{citasMes ?? 0}</span>
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

            <Link href="/dashboard/clientes" className="card card-hover db-stat-card p-5" style={{ textDecoration: 'none' }}>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Clientes</p>
              <p className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                <span className="db-count" data-target={totalClientes ?? 0} suppressHydrationWarning>{totalClientes ?? 0}</span>
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {(totalClientes ?? 0) === 0 ? 'Aún sin clientes' : 'Ver todos →'}
              </p>
            </Link>

            <Link href="/dashboard/upgrade" className="card card-hover db-stat-card p-5" style={{ textDecoration: 'none' }}>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Plan actual</p>
              <p className={`text-2xl font-semibold capitalize${plan !== 'free' ? ' db-shimmer' : ''}`}
                 style={{ color: plan === 'free' ? 'var(--text-primary)' : undefined }}>
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
                {(proximasCitas as { booking_date: string; booking_time: string; service_name: string; client_name: string; status: string }[]).map((cita, i) => {
                  const fecha = new Date(cita.booking_date + 'T12:00:00')
                  const label = fecha.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })
                  const hora  = cita.booking_time?.slice(0, 5)
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
                            {cita.client_name}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {cita.service_name} · {label}{hora ? ` · ${hora}` : ''}
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
