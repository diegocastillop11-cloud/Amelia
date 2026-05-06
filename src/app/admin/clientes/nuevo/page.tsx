'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const CATEGORIES = [
  'Barbería','Pastelería','Clínica','Restaurante','Cafetería',
  'Salón de belleza','Gimnasio','Veterinaria','Tienda de ropa',
  'Consultora','Agencia','Otro',
]

const toSlug = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
   .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')

export default function NuevoClientePage() {
  const router = useRouter()
  const [form, setForm] = useState({
    email: '', full_name: '', business_name: '', category: '', slug: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const set = (k: string, v: string) =>
    setForm(p => ({
      ...p, [k]: v,
      ...(k === 'business_name' ? { slug: toSlug(v) } : {}),
    }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(null)

    const res = await fetch('/api/admin/create-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()

    if (!res.ok) { setError(data.error ?? 'Error desconocido'); setLoading(false); return }
    setSuccess(true)
    setTimeout(() => router.push('/admin/clientes'), 1500)
  }

  if (success) return (
    <div className="p-8 max-w-lg text-center">
      <p className="text-2xl mb-2">✅</p>
      <p className="font-semibold text-white">Cliente creado exitosamente</p>
      <p className="text-sm text-gray-400 mt-1">Se enviará un email para establecer contraseña.</p>
    </div>
  )

  return (
    <div className="p-8 max-w-lg">
      <div className="mb-6">
        <Link href="/admin/clientes" className="text-sm text-gray-500 hover:text-gray-300">← Volver</Link>
        <h1 className="text-2xl font-semibold text-white mt-2">Nuevo Cliente</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-medium text-gray-400">Datos de acceso</h2>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Email *</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                   placeholder="cliente@email.com" required
                   className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Nombre completo</label>
            <input type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)}
                   placeholder="Juan Pérez"
                   className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500" />
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-medium text-gray-400">Negocio</h2>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Nombre del negocio *</label>
            <input type="text" value={form.business_name} onChange={e => set('business_name', e.target.value)}
                   placeholder="Barbería El Corte" required
                   className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">URL del sitio</label>
            <div className="flex items-center rounded-lg overflow-hidden bg-gray-800 border border-gray-700">
              <span className="px-3 text-xs text-gray-500 border-r border-gray-700 py-2.5 font-mono">/sitio/</span>
              <input type="text" value={form.slug} onChange={e => set('slug', e.target.value)}
                     placeholder="barberia-el-corte"
                     className="flex-1 bg-transparent px-3 py-2.5 text-sm text-white font-mono outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Rubro</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500">
              <option value="">Seleccionar...</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button type="submit" disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl text-sm transition-colors">
          {loading ? 'Creando cuenta...' : 'Crear cliente'}
        </button>
      </form>
    </div>
  )
}
