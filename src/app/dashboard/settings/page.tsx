import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: owner } = await supabase
    .from('owners')
    .select('*')
    .eq('id', user!.id)
    .single()

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user!.id)
    .single()

  return (
    <div style={{ padding: '2rem', maxWidth: 640 }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '2rem' }}>
        Ajustes
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Perfil */}
        <section style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem 1.5rem' }}>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Tu perfil</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Nombre</span>
              <span style={{ color: 'var(--text-primary)' }}>{owner?.full_name ?? '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Email</span>
              <span style={{ color: 'var(--text-primary)' }}>{user?.email}</span>
            </div>
          </div>
        </section>

        {/* Negocio */}
        {business && (
          <section style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem 1.5rem' }}>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Tu negocio</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Nombre</span>
                <span style={{ color: 'var(--text-primary)' }}>{business.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Rubro</span>
                <span style={{ color: 'var(--text-primary)' }}>{business.category}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>URL pública</span>
                <span style={{ color: 'var(--accent-light)' }}>/sitio/{business.slug}</span>
              </div>
            </div>
          </section>
        )}

        {/* Personalización visual */}
        <Link href="/dashboard/settings/personalizacion"
          style={{
            display: 'block', background: 'var(--bg-elevated)',
            border: '1px solid var(--border)', borderRadius: 16,
            padding: '1.25rem 1.5rem', textDecoration: 'none',
          }}
        >
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            Personalización visual →
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Colores, logo y apariencia de tu sitio público
          </p>
        </Link>

      </div>
    </div>
  )
}
