'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function NuevoProductoPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('El nombre es requerido.'); return }
    setLoading(true); setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { data: business } = await supabase
      .from('businesses').select('id').eq('owner_id', user.id).single()

    if (!business) { setError('No tienes un negocio registrado.'); setLoading(false); return }

    const { error: insertError } = await supabase.from('products').insert({
      business_id: business.id,
      name: name.trim(),
      description: description.trim() || null,
      price: price ? parseFloat(price) : null,
    })

    if (insertError) { setError('Error al guardar. Intenta nuevamente.'); setLoading(false); return }

    router.push('/dashboard/productos')
    router.refresh()
  }

  return (
    <div className="p-8 max-w-lg">
      <div className="mb-6">
        <Link href="/dashboard/productos" className="text-sm"
              style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          ← Volver
        </Link>
        <h1 className="text-2xl font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>
          Nuevo Producto
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Nombre *
          </label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
                 placeholder="Ej: Corte de cabello" className="input-field" required />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Descripción
          </label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="Descripción breve del producto o servicio"
                    rows={3} className="input-field resize-none" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Precio (opcional)
          </label>
          <input type="number" value={price} onChange={e => setPrice(e.target.value)}
                 placeholder="0" min="0" step="0.01" className="input-field" />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Guardando...' : 'Guardar producto'}
        </button>
      </form>
    </div>
  )
}
