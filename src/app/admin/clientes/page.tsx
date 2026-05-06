import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function ClientesPage() {
  const supabase = createClient()

  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, name, slug, category, is_published, primary_color, created_at, owners(full_name, email)')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-sm mb-0.5" style={{ color: 'var(--text-muted)' }}>Panel admin</p>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Clientes</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {businesses?.length ?? 0} negocios registrados
          </p>
        </div>
        <Link href="/admin/clientes/nuevo" className="btn-primary text-sm" style={{ textDecoration: 'none' }}>
          + Nuevo cliente
        </Link>
      </div>

      {!businesses || businesses.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-2xl mb-2">🏪</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin clientes aún</p>
        </div>
      ) : (
        <div className="space-y-2">
          {businesses.map((b: {
            id: string; name: string; category: string; slug: string
            is_published: boolean; primary_color: string | null; created_at: string
            owners: { full_name: string | null; email: string } | null
          }) => (
            <Link key={b.id} href={`/admin/clientes/${b.id}`}
                  className="card card-hover flex items-center justify-between gap-4 p-5"
                  style={{ textDecoration: 'none' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center"
                     style={{ background: `${b.primary_color ?? '#6366f1'}18`, border: `1.5px solid ${b.primary_color ?? '#6366f1'}30` }}>
                  <span style={{ fontSize: '1rem' }}>🏪</span>
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{b.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {b.category} · {(b.owners as { email: string } | null)?.email ?? '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{
                        background: b.is_published ? 'rgba(110,231,183,0.1)' : 'rgba(255,255,255,0.05)',
                        color: b.is_published ? '#6ee7b7' : 'var(--text-muted)',
                        border: `1px solid ${b.is_published ? 'rgba(110,231,183,0.2)' : 'var(--border)'}`,
                      }}>
                  {b.is_published ? 'Publicado' : 'Borrador'}
                </span>
                <span className="text-xs mono" style={{ color: 'var(--text-muted)' }}>/{b.slug}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
