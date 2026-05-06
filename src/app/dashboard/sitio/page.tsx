import { createClient } from '@/lib/supabase/server'
import SmartGeneratorForm from '@/components/site-builder/SmartGeneratorForm'
import Link from 'next/link'

export default async function SitioPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, slug, category, description, primary_color, logo_url, cover_url, is_published, sites(content)')
    .eq('owner_id', user!.id)
    .single()

  const hasSite = !!business?.sites?.[0]?.content

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
            {hasSite ? `${business.name} · ${business.category}` : 'Nuevo sitio web'}
          </p>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {hasSite ? 'Regenerar sitio con IA' : 'Crea tu sitio web con IA'}
          </h1>
          {!hasSite && (
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Pega cualquier información del negocio — la IA hace el resto.
            </p>
          )}
        </div>

        {/* ✅ Botón Editar sitio — solo si ya tiene sitio generado */}
        {hasSite && (
          <Link
            href={`/dashboard/sitio/editor?id=${business.id}`}
            className="btn-primary flex items-center gap-2 text-sm py-2.5 px-5"
            style={{ textDecoration: 'none' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar sitio
          </Link>
        )}
      </div>

      {/* Aviso de que regenerar sobreescribe */}
      {hasSite && (
        <div className="mb-6 p-4 rounded-xl" style={{
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.2)',
        }}>
          <p className="text-xs" style={{ color: '#fcd34d' }}>
            ⚠️ Regenerar creará contenido nuevo con IA y sobreescribirá el actual.
            Si solo quieres editar textos, usa el botón <strong>"Editar sitio"</strong> de arriba.
          </p>
        </div>
      )}

      <SmartGeneratorForm existingBusiness={business} />
    </div>
  )
}
