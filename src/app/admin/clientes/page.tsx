import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function ClientesPage() {
  const supabase = createClient()

  const { data: businesses } = await supabase
    .from('businesses')
    .select('*, owners(full_name, email)')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Clientes</h1>
          <p className="text-gray-400 mt-1 text-sm">
            {businesses?.length ?? 0} negocios registrados
          </p>
        </div>
        <Link
          href="/admin/clientes/nuevo"
          className="bg-violet-600 hover:bg-violet-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + Nuevo cliente
        </Link>
      </div>

      {!businesses || businesses.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p>Sin clientes aún</p>
        </div>
      ) : (
        <div className="space-y-2">
          {businesses.map((b: {
            id: string
            name: string
            category: string
            slug: string
            is_published: boolean
            owners: { full_name: string | null; email: string } | null
          }) => (
            <Link
              key={b.id}
              href={`/admin/clientes/${b.id}`}
              className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 hover:border-gray-600 transition-colors"
            >
              <div>
                <p className="font-medium text-white">{b.name}</p>
                <p className="text-sm text-gray-400 mt-0.5">
                  {b.category} · {b.owners?.email ?? '—'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    b.is_published
                      ? 'bg-green-900/50 text-green-400'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {b.is_published ? 'Publicado' : 'Borrador'}
                </span>
                <span className="text-gray-600 text-sm">/{b.slug}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
