import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function SettingsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-8">Ajustes</h1>

      <div className="space-y-6">
        <section className="bg-white border border-gray-100 rounded-xl p-6">
          <h2 className="font-semibold text-gray-800 mb-4">Tu perfil</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Nombre</span>
              <span className="text-gray-800">{owner?.full_name ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Email</span>
              <span className="text-gray-800">{user?.email}</span>
            </div>
          </div>
        </section>

        {business && (
          <section className="bg-white border border-gray-100 rounded-xl p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Tu negocio</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Nombre</span>
                <span className="text-gray-800">{business.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Rubro</span>
                <span className="text-gray-800">{business.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">URL pública</span>
                <span className="text-sky-600">/sitio/{business.slug}</span>
              </div>
            </div>
          </section>
        )}

        <Link
          href="/dashboard/settings/personalizacion"
          className="block bg-white border border-gray-100 rounded-xl p-6 hover:border-sky-200 transition-colors"
        >
          <h2 className="font-semibold text-gray-800">Personalización visual</h2>
          <p className="text-sm text-gray-500 mt-1">
            Colores, logo y apariencia de tu sitio →
          </p>
        </Link>
      </div>
    </div>
  )
}
