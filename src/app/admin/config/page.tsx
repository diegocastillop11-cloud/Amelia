import { createClient as createAdmin } from '@supabase/supabase-js'
import { PLAN_DEFAULTS, ModuleKey } from '@/lib/modules'
import ConfigClient from './ConfigClient'
import AmeliaAvatarSettings from '@/components/settings/AmeliaAvatarSettings'
import ThemeSwitcher from '@/components/settings/ThemeSwitcher'

export const dynamic = 'force-dynamic'

export default async function ConfigPage() {
  // El admin layout ya valida que sea superadmin — no duplicar la check aquí

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [{ data: businesses }, { data: licenses }] = await Promise.all([
    admin.from('businesses')
      .select('id, name, category, slug, is_published, owners(email)')
      .order('created_at', { ascending: false }),
    admin.from('licenses').select('business_id, plan, modules'),
  ])

  const licMap = new Map((licenses ?? []).map(l => [l.business_id, l]))

  const rows = (businesses ?? []).map(b => {
    const lic = licMap.get(b.id)
    const plan = lic?.plan ?? 'free'
    const modules = (lic?.modules ?? PLAN_DEFAULTS[plan]) as Record<ModuleKey, boolean>
    const ownerData = b.owners as { email: string } | null
    return {
      id: b.id,
      name: b.name,
      category: b.category,
      slug: b.slug,
      is_published: b.is_published,
      email: ownerData?.email ?? '—',
      plan,
      modules,
    }
  })

  // Estadísticas de planes
  const planCount = { free: 0, pro: 0, premium: 0 }
  for (const r of rows) {
    if (r.plan in planCount) planCount[r.plan as keyof typeof planCount]++
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 900 }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Panel admin</p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
          Configuración del sistema
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Gestiona planes y módulos de cada cliente
        </p>
      </div>

      {/* Stats de planes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: '1.5rem' }}>
        {[
          { label: 'Free', count: planCount.free + (rows.length - planCount.free - planCount.pro - planCount.premium), color: '#a5b4fc', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)' },
          { label: 'Pro',  count: planCount.pro,     color: '#c4b5fd', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)' },
          { label: 'Premium', count: planCount.premium, color: '#fcd34d', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 14, padding: '1rem 1.25rem' }}>
            <p style={{ fontSize: '1.75rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.count}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Plan {s.label}</p>
          </div>
        ))}
      </div>

      {/* Buscador info */}
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
        {rows.length} clientes · Haz clic en un cliente para ver y editar sus módulos
      </p>

      <ConfigClient businesses={rows} />

      {/* Apariencia del panel */}
      <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 900 }}>
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem 1.5rem' }}>
          <ThemeSwitcher />
        </div>
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem 1.5rem' }}>
          <AmeliaAvatarSettings />
        </div>
      </div>
    </div>
  )
}
