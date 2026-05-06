'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(null)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } },
    })
    if (error) { setError(error.message); setLoading(false); return }
    if (data.user) setSuccess(true)
    setLoading(false)
  }

  const EyeIcon = () => showPwd
    ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
    : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>

  const Logo = () => (
    <div className="text-center mb-8">
      <div className="inline-flex items-center gap-2.5 mb-5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm"
             style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}>
          A
        </div>
        <span className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Amelia</span>
      </div>
    </div>
  )

  if (success) return (
    <div className="min-h-screen dot-grid flex items-center justify-center px-4 relative overflow-hidden"
         style={{ background: 'var(--bg-base)' }}>
      <div className="glow-orb w-96 h-96 top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"
           style={{ background: 'rgba(99,102,241,0.12)' }} />
      <div className="relative w-full max-w-[420px]">
        <Logo />
        <div className="card p-8 text-center" style={{ background: 'var(--bg-surface)' }}>
          {/* Check */}
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 8px 32px rgba(99,102,241,0.5)' }}>
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            ¡Cuenta creada con éxito!
          </h2>
          <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Revisa tu email en</p>
          <p className="text-sm font-medium mono mb-6" style={{ color: 'var(--accent-light)' }}>{email}</p>

          {/* Plan card */}
          <div className="rounded-xl p-4 text-left mb-6"
               style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-accent)' }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                     style={{ background: 'rgba(99,102,241,0.2)' }}>
                  <svg className="w-4 h-4" style={{ color: 'var(--accent-light)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Plan Free activado</span>
              </div>
              <span className="badge-free">FREE</span>
            </div>
            <div className="space-y-1.5 pl-9">
              {['Generación de sitio con IA','Hasta 5 productos','Plantillas básicas'].map(f => (
                <p key={f} className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--accent-light)' }}>✓</span> {f}
                </p>
              ))}
              {['Reservas (Pro)','Dominio personalizado (Premium)'].map(f => (
                <p key={f} className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <span>○</span> {f}
                </p>
              ))}
            </div>
          </div>

          <Link href="/auth/login" className="btn-primary w-full">
            Ir al login →
          </Link>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen dot-grid flex items-center justify-center px-4 relative overflow-hidden"
         style={{ background: 'var(--bg-base)' }}>
      <div className="glow-orb w-96 h-96 top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"
           style={{ background: 'rgba(99,102,241,0.12)' }} />
      <div className="glow-orb w-64 h-64 bottom-0 right-0 translate-x-1/3 translate-y-1/3"
           style={{ background: 'rgba(139,92,246,0.08)' }} />

      <div className="relative w-full max-w-[400px]">
        <Logo />
        <div className="text-center mb-8" style={{ marginTop: '-2.5rem' }}>
          <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Crea tu cuenta</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Gratis para siempre en el plan básico</p>
        </div>

        <div className="card p-8" style={{ background: 'var(--bg-surface)' }}>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nombre completo</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                required placeholder="Juan Pérez" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                required placeholder="tu@email.com" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Contraseña</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} required minLength={6}
                  placeholder="Mínimo 6 caracteres" className="input-field pr-12" />
                <button type="button" tabIndex={-1} onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors"
                  style={{ color: 'var(--text-muted)' }}>
                  <EyeIcon />
                </button>
              </div>
            </div>

            {error && (
              <div className="alert-error">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading
                ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Creando cuenta...</>
                : 'Crear cuenta gratis'}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          ¿Ya tienes cuenta?{' '}
          <Link href="/auth/login" className="font-medium" style={{ color: 'var(--accent-light)' }}>
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
