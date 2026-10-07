'use client'

import Link from 'next/link'
import { useState } from 'react'

interface Paso { titulo: string; detalle: string; hecho: boolean; href: string; boton: string }

export default function PrimerosPasos({ pasos, enlace }: { pasos: Paso[]; enlace: string | null }) {
  const [copiado, setCopiado] = useState(false)
  const hechos = pasos.filter(p => p.hecho).length
  const siguiente = pasos.findIndex(p => !p.hecho)
  const completo = siguiente === -1

  async function copiar() {
    if (!enlace) return
    try { await navigator.clipboard.writeText(enlace); setCopiado(true); setTimeout(() => setCopiado(false), 2500) } catch {}
  }

  return (
    <div className="card mb-6" style={{ padding: '1.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          {completo ? '🎉 ¡Tu sitio está listo y publicado!' : 'Primeros pasos'}
        </h2>
        <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--accent-light)' }}>{hechos} de {pasos.length} listos</span>
      </div>
      <div style={{ height: 8, borderRadius: 8, background: 'var(--bg-hover)', overflow: 'hidden', marginBottom: 18 }}>
        <div style={{ width: `${(hechos / pasos.length) * 100}%`, height: '100%', background: 'var(--brand-grad)', transition: 'width .4s' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {pasos.map((p, i) => {
          const actual = i === siguiente
          return (
            <div key={p.titulo} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '1rem 1.125rem', borderRadius: 14,
              border: `1.5px solid ${actual ? 'var(--accent)' : 'var(--border)'}`,
              background: actual ? 'var(--accent-glow)' : 'transparent', flexWrap: 'wrap',
            }}>
              <span style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '1rem', color: '#fff', background: p.hecho ? '#27ae60' : actual ? 'var(--accent)' : 'var(--text-muted)',
              }}>{p.hecho ? '✓' : i + 1}</span>
              <div style={{ flex: 1, minWidth: 180 }}>
                <p style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)' }}>{p.titulo}</p>
                <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', marginTop: 2 }}>{p.detalle}</p>
              </div>
              {!p.hecho && (
                <Link href={p.href} className={actual ? 'btn-primary' : 'btn-secondary'}
                      style={{ fontSize: '1rem', padding: '0.75rem 1.5rem', textDecoration: 'none' }}>
                  {p.boton}
                </Link>
              )}
            </div>
          )
        })}
      </div>

      {enlace && (
        <div style={{ marginTop: 18, padding: '1rem 1.125rem', borderRadius: 14, background: 'var(--bg-base)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>4. Comparte el enlace de tu sitio</p>
            <p className="mono" style={{ fontSize: '0.875rem', color: 'var(--accent-light)', wordBreak: 'break-all', marginTop: 2 }}>{enlace}</p>
          </div>
          <button onClick={copiar} className="btn-primary" style={{ fontSize: '1rem', padding: '0.75rem 1.5rem' }}>
            {copiado ? '✓ ¡Copiado!' : '📋 Copiar enlace'}
          </button>
          <a href={enlace} target="_blank" rel="noreferrer" className="btn-secondary" style={{ fontSize: '1rem', padding: '0.75rem 1.5rem', textDecoration: 'none' }}>
            Ver mi sitio
          </a>
        </div>
      )}
    </div>
  )
}
