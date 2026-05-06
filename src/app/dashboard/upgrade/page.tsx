'use client'

import { useState } from 'react'
import { MODULES_CONFIG, PLAN_DEFAULTS } from '@/lib/modules'

const PLANES = [
  {
    id: 'free',
    nombre: 'Free',
    precio: '$0',
    periodo: 'siempre gratis',
    descripcion: 'Para empezar a digitalizarte.',
    color: '#6b7280',
    extras: ['Sitio web generado con IA', 'Chat Amelia para clientes'],
  },
  {
    id: 'pro',
    nombre: 'Pro',
    precio: '$9.990',
    periodo: 'CLP / mes',
    descripcion: 'Para negocios que quieren crecer.',
    color: '#6366f1',
    popular: true,
    extras: ['Citas ilimitadas', 'Galería ilimitada', 'Soporte prioritario'],
  },
  {
    id: 'premium',
    nombre: 'Premium',
    precio: '$19.990',
    periodo: 'CLP / mes',
    descripcion: 'Presencia profesional completa.',
    color: '#f59e0b',
    extras: ['Dominio personalizado', 'Reportes mensuales', 'Soporte 24/7'],
  },
]

export default function UpgradePage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [solicitado, setSolicitado] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function solicitar(plan: string) {
    setLoading(plan)
    setError(null)
    try {
      const res = await fetch('/api/notify-upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      if (!res.ok) throw new Error()
      setSolicitado(plan)
    } catch {
      setError('Hubo un problema. Intenta de nuevo.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <p className="text-sm mb-0.5" style={{ color: 'var(--text-muted)' }}>Planes</p>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Elige tu plan
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Sin contratos. Cancela cuando quieras.
        </p>
      </div>

      {error && (
        <div className="alert-error mb-6 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {PLANES.map(plan => {
          const esSolicitado = solicitado === plan.id
          const cargando     = loading === plan.id

          return (
            <div
              key={plan.id}
              className="card"
              style={{
                padding: '1.75rem',
                position: 'relative',
                border: plan.popular
                  ? `1.5px solid ${plan.color}60`
                  : '1px solid var(--border)',
                background: plan.popular
                  ? `linear-gradient(160deg, ${plan.color}0a, var(--bg-surface))`
                  : 'var(--bg-surface)',
              }}
            >
              {/* Badge popular */}
              {plan.popular && (
                <div style={{
                  position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                  background: plan.color, color: 'white', fontSize: '0.6875rem', fontWeight: 800,
                  padding: '3px 14px', borderRadius: 20, letterSpacing: '0.05em',
                  textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}>
                  Más popular
                </div>
              )}

              {/* Header */}
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg font-bold" style={{ color: plan.color }}>{plan.nombre}</span>
                </div>
                <div className="flex items-end gap-1.5 mb-1">
                  <span className="text-3xl font-bold" style={{ color: 'var(--text-primary)', lineHeight: 1 }}>
                    {plan.precio}
                  </span>
                  <span className="text-xs pb-0.5" style={{ color: 'var(--text-muted)' }}>
                    {plan.periodo}
                  </span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {plan.descripcion}
                </p>
              </div>

              {/* CTA */}
              {plan.id === 'free' ? (
                <div
                  className="w-full text-center text-sm font-semibold py-2.5 rounded-xl mb-5"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                  }}
                >
                  Plan actual
                </div>
              ) : esSolicitado ? (
                <div
                  className="w-full text-center text-sm font-semibold py-2.5 rounded-xl mb-5"
                  style={{
                    background: `${plan.color}18`,
                    border: `1px solid ${plan.color}40`,
                    color: plan.color,
                  }}
                >
                  ✓ Solicitud enviada
                </div>
              ) : (
                <button
                  onClick={() => solicitar(plan.id)}
                  disabled={!!cargando}
                  className="w-full text-sm font-bold py-2.5 rounded-xl mb-5 transition-opacity"
                  style={{
                    background: plan.color,
                    color: 'white',
                    border: 'none',
                    cursor: cargando ? 'wait' : 'pointer',
                    opacity: cargando ? 0.7 : 1,
                    fontFamily: 'inherit',
                  }}
                >
                  {cargando ? 'Enviando...' : `Quiero el plan ${plan.nombre}`}
                </button>
              )}

              {/* Módulos incluidos */}
              <div className="mb-3">
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Módulos
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {MODULES_CONFIG.map(m => {
                    const included = PLAN_DEFAULTS[plan.id]?.[m.key] ?? false
                    return (
                      <div key={m.key} className="flex items-center gap-1.5"
                           style={{ opacity: included ? 1 : 0.35 }}>
                        <span style={{ fontSize: '0.8rem' }}>{included ? '✓' : '✗'}</span>
                        <span className="text-xs" style={{ color: included ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                          {m.icon} {m.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Extras */}
              <ul className="space-y-1.5">
                {(plan as { extras?: string[] }).extras?.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm"
                      style={{ color: 'var(--text-secondary)' }}>
                    <span style={{ color: plan.color, marginTop: 1, flexShrink: 0 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      {solicitado && (
        <div className="mt-6 p-4 rounded-xl text-sm" style={{
          background: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.2)',
          color: 'var(--text-secondary)',
        }}>
          ✅ Recibimos tu solicitud para el plan <strong style={{ color: 'var(--text-primary)' }}>
            {PLANES.find(p => p.id === solicitado)?.nombre}
          </strong>. Te contactaremos pronto al correo registrado para activarlo.
        </div>
      )}

      <p className="text-xs mt-8" style={{ color: 'var(--text-muted)' }}>
        Los precios son en CLP e incluyen IVA. El pago se gestiona manualmente por ahora —
        te contactamos al confirmar tu solicitud.
      </p>
    </div>
  )
}
