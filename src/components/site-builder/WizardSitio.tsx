'use client'

import { useRef, useState } from 'react'
import type { SiteContent } from '@/types/database'

interface Props {
  name: string; onName: (v: string) => void
  logo: string | null; onLogo: (f: File) => Promise<void>; onLogoRemove: () => void
  template: string; onTemplate: (t: string) => void
  color: string; onColor: (c: string) => void
  content: SiteContent
  onEdit: (path: string, v: string) => void
  onSvc: (i: number, field: 'name' | 'price', v: string) => void
  published: boolean; publishing: boolean; onPublish: () => void
  slug: string; saveState: 'saved' | 'saving' | 'unsaved'
  onAdvanced: () => void
}

const ESTILOS = [
  { id: 'moderna',  nombre: 'Moderno',  desc: 'Limpio, claro y fácil de leer', bg: '#ffffff', fg: '#111827' },
  { id: 'elegante', nombre: 'Elegante', desc: 'Sobrio, con letra fina',        bg: '#faf9f7', fg: '#1f2937' },
  { id: 'dark',     nombre: 'Oscuro',   desc: 'Fondo negro, muy moderno',      bg: '#0a0a0f', fg: '#ffffff' },
  { id: 'sunset',   nombre: 'Colorido', desc: 'Llamativo, con degradados',     bg: 'linear-gradient(135deg,#f97316,#e11d48)', fg: '#ffffff' },
]
const COLORES = [
  { c: '#0284c7', n: 'Azul' }, { c: '#059669', n: 'Verde' }, { c: '#ea580c', n: 'Naranja' },
  { c: '#7c3aed', n: 'Violeta' }, { c: '#db2777', n: 'Rosa' }, { c: '#dc2626', n: 'Rojo' },
]
const PASOS = ['Tu negocio', 'Estilo', 'Textos', 'Publicar']

const lbl: React.CSSProperties = { display: 'block', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }
const hint: React.CSSProperties = { fontSize: '0.9375rem', color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }
const input: React.CSSProperties = { width: '100%', fontSize: '1.0625rem', padding: '0.75rem 0.875rem', borderRadius: 12, border: '1.5px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none' }

export default function WizardSitio(p: Props) {
  const [paso, setPaso] = useState(0)
  const [subiendo, setSubiendo] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const enlace = typeof window !== 'undefined' ? `${window.location.origin}/sitio/${p.slug}` : `/sitio/${p.slug}`

  async function subirLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    setSubiendo(true); await p.onLogo(f); setSubiendo(false)
    if (fileRef.current) fileRef.current.value = ''
  }
  async function copiar() {
    try { await navigator.clipboard.writeText(enlace); setCopiado(true); setTimeout(() => setCopiado(false), 2500) } catch {}
  }

  return (
    <div style={{ width: 380, flexShrink: 0, background: 'var(--bg-surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '1.25rem 1.25rem 0.75rem' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {PASOS.map((n, i) => (
            <button key={n} onClick={() => setPaso(i)} title={n}
                    style={{ flex: 1, height: 8, borderRadius: 8, border: 'none', cursor: 'pointer', background: i <= paso ? 'var(--accent)' : 'var(--bg-hover)' }} />
          ))}
        </div>
        <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent-light)' }}>Paso {paso + 1} de {PASOS.length}</p>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          {['Cuéntanos de tu negocio', 'Elige cómo se verá', 'Revisa tus textos', 'Publica tu sitio'][paso]}
        </h2>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 1.25rem 1rem' }}>
        {paso === 0 && (
          <div>
            <p style={hint}>Escribe el nombre que verán tus clientes.</p>
            <label style={lbl}>Nombre de tu negocio</label>
            <input style={input} value={p.name} onChange={e => p.onName(e.target.value)} placeholder="Ej: Peluquería Luna" />

            <label style={{ ...lbl, marginTop: 22 }}>Tu logo (opcional)</label>
            <p style={hint}>Es la imagen de tu negocio. Puedes tomarla desde tu celular o computador.</p>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={subirLogo} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {p.logo && <img src={p.logo} alt="Tu logo" style={{ width: 72, height: 72, objectFit: 'contain', borderRadius: 12, border: '1px solid var(--border)', background: '#fff' }} />}
              <button className="btn-primary" style={{ fontSize: '1.0625rem', padding: '0.875rem 1.25rem' }} onClick={() => fileRef.current?.click()} disabled={subiendo}>
                {subiendo ? 'Subiendo…' : p.logo ? '🔄 Cambiar logo' : '📷 Subir mi logo'}
              </button>
              {p.logo && <button className="btn-ghost" style={{ fontSize: '0.9375rem' }} onClick={p.onLogoRemove}>Quitar</button>}
            </div>
          </div>
        )}

        {paso === 1 && (
          <div>
            <p style={hint}>Toca el que más te guste. Verás el cambio al lado, en tu sitio.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {ESTILOS.map(e => {
                const activo = p.template === e.id
                return (
                  <button key={e.id} onClick={() => p.onTemplate(e.id)}
                          style={{ textAlign: 'left', padding: 8, borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
                                   border: `2.5px solid ${activo ? 'var(--accent)' : 'var(--border)'}`, background: activo ? 'var(--accent-glow)' : 'var(--bg-surface)' }}>
                    <div style={{ height: 54, borderRadius: 8, background: e.bg, border: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ width: 34, height: 6, borderRadius: 3, background: p.color }} />
                    </div>
                    <p style={{ fontSize: '1.0625rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 8 }}>{activo ? '✓ ' : ''}{e.nombre}</p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>{e.desc}</p>
                  </button>
                )
              })}
            </div>

            <label style={{ ...lbl, marginTop: 22 }}>Color principal</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {COLORES.map(c => {
                const activo = p.color.toLowerCase() === c.c
                return (
                  <button key={c.c} onClick={() => p.onColor(c.c)}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.625rem', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                                   fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', background: 'var(--bg-surface)',
                                   border: `2.5px solid ${activo ? c.c : 'var(--border)'}` }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: c.c, flexShrink: 0 }} />{c.n}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {paso === 2 && (
          <div>
            <p style={hint}>Cambia lo que quieras. Si estás de acuerdo con lo que escribimos, avanza.</p>
            <label style={lbl}>Título principal</label>
            <input style={input} value={p.content.hero?.title ?? ''} onChange={e => p.onEdit('hero.title', e.target.value)} />
            <label style={{ ...lbl, marginTop: 16 }}>Frase de apoyo</label>
            <textarea style={{ ...input, minHeight: 84, resize: 'vertical' }} value={p.content.hero?.subtitle ?? ''} onChange={e => p.onEdit('hero.subtitle', e.target.value)} />
            <label style={{ ...lbl, marginTop: 16 }}>Sobre tu negocio</label>
            <textarea style={{ ...input, minHeight: 110, resize: 'vertical' }} value={p.content.about?.text ?? ''} onChange={e => p.onEdit('about.text', e.target.value)} />

            {(p.content.services ?? []).length > 0 && (
              <>
                <label style={{ ...lbl, marginTop: 22 }}>Tus servicios y precios</label>
                <p style={hint}>Escribe el precio de cada uno. Ejemplo: $15.000</p>
                {p.content.services.slice(0, 8).map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input style={{ ...input, flex: 2 }} value={s.name} onChange={e => p.onSvc(i, 'name', e.target.value)} aria-label={`Nombre del servicio ${i + 1}`} />
                    <input style={{ ...input, flex: 1, minWidth: 0 }} value={s.price ?? ''} placeholder="$0" onChange={e => p.onSvc(i, 'price', e.target.value)} aria-label={`Precio del servicio ${i + 1}`} />
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {paso === 3 && (
          <div>
            <p style={hint}>
              {p.published
                ? 'Tu sitio ya está en internet. Si hiciste cambios, publícalos para que tus clientes los vean.'
                : 'Cuando estés conforme, publícalo. Así tus clientes podrán verlo y reservar contigo.'}
            </p>
            <button className="btn-primary" onClick={p.onPublish} disabled={p.publishing}
                    style={{ width: '100%', fontSize: '1.1875rem', padding: '1.125rem', borderRadius: 14 }}>
              {p.publishing ? 'Publicando…' : p.published ? '✓ Publicar mis cambios' : '🚀 Publicar mi sitio'}
            </button>
            {p.published && (
              <div style={{ marginTop: 18, padding: '1rem', borderRadius: 14, background: 'var(--bg-base)' }}>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>El enlace de tu sitio</p>
                <p className="mono" style={{ fontSize: '0.875rem', color: 'var(--accent-light)', wordBreak: 'break-all', marginBottom: 12 }}>{enlace}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn-secondary" style={{ fontSize: '1rem', padding: '0.75rem 1.125rem' }} onClick={copiar}>{copiado ? '✓ ¡Copiado!' : '📋 Copiar enlace'}</button>
                  <a className="btn-secondary" style={{ fontSize: '1rem', padding: '0.75rem 1.125rem', textDecoration: 'none' }} href={enlace} target="_blank" rel="noreferrer">Ver mi sitio</a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ padding: '0.875rem 1.25rem', borderTop: '1px solid var(--border)' }}>
        <p style={{ fontSize: '0.875rem', textAlign: 'center', marginBottom: 10, fontWeight: 600,
                    color: p.saveState === 'saved' ? '#1e8449' : p.saveState === 'saving' ? 'var(--text-secondary)' : 'var(--warn-text)' }}>
          {p.saveState === 'saved' ? '✓ Todo guardado' : p.saveState === 'saving' ? 'Guardando…' : p.published ? 'Tienes cambios sin publicar' : 'Guardando tus cambios…'}
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          {paso > 0 && <button className="btn-secondary" style={{ flex: 1, fontSize: '1.0625rem', padding: '0.875rem' }} onClick={() => setPaso(paso - 1)}>← Atrás</button>}
          {paso < PASOS.length - 1 && <button className="btn-primary" style={{ flex: 2, fontSize: '1.0625rem', padding: '0.875rem' }} onClick={() => setPaso(paso + 1)}>Siguiente →</button>}
        </div>
        <button onClick={p.onAdvanced} style={{ display: 'block', margin: '12px auto 0', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}>
          Usar el editor avanzado
        </button>
      </div>
    </div>
  )
}
