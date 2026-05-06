'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const CATEGORIES = [
  'Barbería','Pastelería','Clínica','Restaurante','Cafetería',
  'Salón de belleza','Gimnasio','Veterinaria','Tienda de ropa',
  'Consultoría','Agencia','Otro',
]

const toSlug = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
   .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')

function genPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function SuccessScreen({ email, password, onContinue }: {
  email: string; password: string; onContinue: () => void
}) {
  const [copied, setCopied] = useState(false)

  const credentials = `Acceso a tu panel Amelia:\nEmail: ${email}\nContraseña: ${password}\nURL: ${window.location.origin}/auth/login`

  const copy = async () => {
    await navigator.clipboard.writeText(credentials)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-8 max-w-lg">
      <div className="card p-8">
        <p className="text-3xl mb-3 text-center">✅</p>
        <p className="font-semibold text-lg mb-1 text-center" style={{ color: 'var(--text-primary)' }}>
          Cliente creado
        </p>
        <p className="text-sm mb-6 text-center" style={{ color: 'var(--text-muted)' }}>
          Comparte estas credenciales con el cliente por WhatsApp o email.
        </p>

        <div className="rounded-xl p-4 mb-4 space-y-2"
             style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Email</span>
            <span className="text-sm font-medium mono" style={{ color: 'var(--text-primary)' }}>{email}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Contraseña</span>
            <span className="text-sm font-bold mono" style={{ color: 'var(--accent-light)' }}>{password}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>URL login</span>
            <span className="text-xs mono" style={{ color: 'var(--text-secondary)' }}>/auth/login</span>
          </div>
        </div>

        <button onClick={copy} className="btn-primary w-full mb-3" style={{ fontFamily: 'inherit' }}>
          {copied ? '✓ Copiado' : '📋 Copiar credenciales'}
        </button>
        <p className="text-xs text-center mb-5" style={{ color: 'var(--text-muted)' }}>
          El cliente puede cambiar su contraseña desde Ajustes una vez que ingrese.
        </p>

        <button onClick={onContinue} className="btn-ghost text-sm w-full" style={{ fontFamily: 'inherit' }}>
          Ir a lista de clientes →
        </button>
      </div>
    </div>
  )
}

export default function NuevoClientePage() {
  const router = useRouter()
  const [form, setForm] = useState({
    email: '', full_name: '', business_name: '', category: '', slug: '',
    password: genPassword(),
  })
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)
  const [showPass, setShowPass] = useState(false)

  const set = (k: string, v: string) =>
    setForm(p => ({ ...p, [k]: v, ...(k === 'business_name' ? { slug: toSlug(v) } : {}) }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(null)
    const res  = await fetch('/api/admin/create-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Error desconocido'); setLoading(false); return }
    setSuccess(true)
  }

  if (success) return (
    <SuccessScreen
      email={form.email}
      password={form.password}
      onContinue={() => router.push('/admin/clientes')}
    />
  )

  return (
    <div className="p-8 max-w-lg">
      <div className="mb-6">
        <Link href="/admin/clientes" className="text-xs mb-2 inline-block"
              style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          ← Volver
        </Link>
        <h1 className="text-2xl font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>
          Nuevo cliente
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Datos de acceso */}
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Datos de acceso</h2>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Email *</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                   placeholder="cliente@email.com" required className="input-field w-full" />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Nombre completo</label>
            <input type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)}
                   placeholder="Juan Pérez" className="input-field w-full" />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
              Contraseña temporal
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  required minLength={8}
                  className="input-field w-full mono"
                  style={{ paddingRight: '2.5rem' }}
                />
                <button type="button" onClick={() => setShowPass(p => !p)}
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                 background: 'none', border: 'none', cursor: 'pointer', fontSize: 14,
                                 color: 'var(--text-muted)' }}>
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
              <button type="button" onClick={() => set('password', genPassword())}
                      className="btn-ghost text-xs px-3" style={{ fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                🔄 Nueva
              </button>
            </div>
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
              Se la compartirás al cliente. Podrá cambiarla desde Ajustes.
            </p>
          </div>
        </div>

        {/* Negocio */}
        <div className="card p-6 space-y-4">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Negocio</h2>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Nombre del negocio *</label>
            <input type="text" value={form.business_name} onChange={e => set('business_name', e.target.value)}
                   placeholder="Pastelería La Dulce" required className="input-field w-full" />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>URL del sitio</label>
            <div className="flex items-center rounded-xl overflow-hidden"
                 style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
              <span className="px-3 text-xs mono py-2.5"
                    style={{ color: 'var(--text-muted)', borderRight: '1px solid var(--border)' }}>/sitio/</span>
              <input type="text" value={form.slug} onChange={e => set('slug', e.target.value)}
                     placeholder="pasteleria-la-dulce"
                     className="flex-1 px-3 py-2.5 text-sm mono outline-none"
                     style={{ background: 'transparent', color: 'var(--text-primary)' }} />
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Rubro</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}
                    className="input-field w-full">
              <option value="">Seleccionar...</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {error && (
          <div className="alert-error text-sm">{error}</div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full py-3"
                style={{ fontFamily: 'inherit', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Creando cuenta...' : 'Crear cliente'}
        </button>
      </form>
    </div>
  )
}
