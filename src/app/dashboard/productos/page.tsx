import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function ProductosPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('owner_id', user!.id)
    .single()

  const { data: products } = business
    ? await supabase
        .from('products')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
    : { data: [] }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Productos y Servicios</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {products?.length ?? 0} items registrados
          </p>
        </div>
        <Link
          href="/dashboard/productos/nuevo"
          className="bg-sky-500 hover:bg-sky-600 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + Agregar
        </Link>
      </div>

      {!products || products.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">Sin productos aún</p>
          <p className="text-sm">Agrega tu primer producto o servicio</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((p: { id: string; name: string; price: number | null; description: string | null }) => (
            <div
              key={p.id}
              className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-5 py-4"
            >
              <div>
                <p className="font-medium text-gray-800">{p.name}</p>
                {p.description && (
                  <p className="text-sm text-gray-500 mt-0.5">{p.description}</p>
                )}
              </div>
              {p.price != null && (
                <span className="text-sm font-semibold text-sky-600">
                  ${p.price.toLocaleString('es-CL')}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
