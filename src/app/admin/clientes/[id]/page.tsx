import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function ClienteDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('*, owners(full_name, email)')
    .eq('id', params.id)
    .single()

  if (!business) notFound()

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold text-white mb-2">{business.name}</h1>
      <p className="text-gray-400 text-sm mb-8">ID: {business.id}</p>

      <div className="space-y-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-sm font-medium text-gray-400 mb-4">Información del negocio</h2>
          <dl className="space-y-3 text-sm">
            {[
              ['Rubro', business.category],
              ['Slug', `/${business.slug}`],
              ['Estado', business.is_published ? 'Publicado' : 'Borrador'],
              ['Propietario', (business.owners as { full_name: string | null; email: string } | null)?.email ?? '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <dt className="text-gray-500">{label}</dt>
                <dd className="text-gray-200">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  )
}
