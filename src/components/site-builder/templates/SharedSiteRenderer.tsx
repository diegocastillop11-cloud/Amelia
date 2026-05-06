'use client'

import { useRef } from 'react'
import type { SiteContent } from '@/types/database'
import { type TemplateId, type Service } from './SiteRenderer'

export type { TemplateId, Service }

export interface SharedSiteRendererProps {
  content: SiteContent
  color: string
  template: TemplateId
  name: string
  logo?: string | null
  cover?: string | null
  gallery?: string[]
  fontFamily?: string
  sections: Record<string, boolean>
  onEdit: (path: string, v: string) => void
  onNameChange: (v: string) => void
  onServiceChange: (i: number, field: keyof Service, val: string) => void
  onServiceImageUpload: (i: number, file: File) => void
  onServiceRemove: (i: number) => void
  onServiceAdd: () => void
}

// ── Estilos de edición ────────────────────────────────────────
const editHover = {
  onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget
    if (document.activeElement !== el)
      el.style.boxShadow = '0 0 0 1.5px rgba(99,102,241,0.35)'
  },
  onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
    const el = e.currentTarget
    if (document.activeElement !== el) el.style.boxShadow = ''
  },
  onFocus: (e: React.FocusEvent<HTMLElement>) => {
    const el = e.currentTarget
    el.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.55)'
    el.style.background = 'rgba(99,102,241,0.07)'
  },
}

function editBlur(onSave: (v: string) => void) {
  return (e: React.FocusEvent<HTMLElement>) => {
    const el = e.currentTarget
    el.style.boxShadow = ''
    el.style.background = ''
    onSave(el.innerText.trim())
  }
}

const baseEditStyle: React.CSSProperties = {
  outline: 'none',
  cursor: 'text',
  borderRadius: 4,
  transition: 'box-shadow 0.15s, background 0.15s',
}

// ── Service card editable ─────────────────────────────────────
function SvcCard({ s, i, color, dark, vib, onChange, onImg, onRemove }: {
  s: Service; i: number; color: string; dark: boolean; vib: boolean
  onChange: (i: number, f: keyof Service, v: string) => void
  onImg: (i: number, file: File) => void
  onRemove: (i: number) => void
}) {
  const imgRef = useRef<HTMLInputElement>(null)
  const fg    = dark || vib ? 'white' : '#111827'
  const muted = dark ? 'rgba(255,255,255,0.5)' : vib ? 'rgba(255,255,255,0.75)' : '#9ca3af'
  const bg    = dark ? 'rgba(255,255,255,0.04)' : vib ? 'rgba(255,255,255,0.15)' : 'white'
  const brd   = dark ? 'rgba(255,255,255,0.08)' : '#f0f0f0'

  return (
    <div style={{ background: bg, border: `1px solid ${brd}`, borderRadius: 14,
                  overflow: 'hidden', position: 'relative' }}>
      <button onClick={() => onRemove(i)}
              style={{ position: 'absolute', top: 6, right: 6, zIndex: 2, width: 22, height: 22,
                        borderRadius: '50%', border: 'none', background: 'rgba(239,68,68,0.2)',
                        color: '#fca5a5', fontSize: 11, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      <input ref={imgRef} type="file" accept="image/*" style={{ display: 'none' }}
             onChange={e => { const f = e.target.files?.[0]; if (f) onImg(i, f) }} />
      <div onClick={() => imgRef.current?.click()}
           style={{ height: s.image ? 130 : 88, cursor: 'pointer',
                     background: s.image ? `url(${s.image}) center/cover` : `${color}12`,
                     display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {!s.image && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, marginBottom: 3 }}>📷</div>
            <p style={{ fontSize: 10, color: `${color}90`, fontWeight: 600 }}>Agregar imagen</p>
          </div>
        )}
      </div>
      <div style={{ padding: '1rem 1.125rem' }}>
        <div contentEditable suppressContentEditableWarning
             style={{ fontWeight: 700, color: fg, fontSize: '0.9375rem', marginBottom: '0.375rem', ...baseEditStyle }}
             {...editHover}
             onFocus={editHover.onFocus}
             onBlur={editBlur(v => onChange(i, 'name', v))}>
          {s.name}
        </div>
        <div contentEditable suppressContentEditableWarning
             style={{ color: muted, fontSize: '0.8125rem', lineHeight: 1.6, marginBottom: '0.5rem', ...baseEditStyle }}
             {...editHover}
             onFocus={editHover.onFocus}
             onBlur={editBlur(v => onChange(i, 'description', v))}>
          {s.description}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{ fontSize: '0.75rem', color: muted }}>Precio:</span>
          <div contentEditable suppressContentEditableWarning
               style={{ color, fontWeight: 700, fontSize: '0.875rem', minWidth: 40, ...baseEditStyle }}
               {...editHover}
               onFocus={editHover.onFocus}
               onBlur={editBlur(v => onChange(i, 'price', v))}>
            {s.price || 'Agregar precio'}
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// EDITOR RENDERER — contenido directo como children (sin useRef/useEffect)
// ══════════════════════════════════════════════════════════════
export function SharedSiteRenderer({
  content, color, template, name, logo, cover, gallery = [],
  fontFamily = 'Inter, sans-serif', sections,
  onEdit, onNameChange, onServiceChange, onServiceImageUpload, onServiceRemove, onServiceAdd,
}: SharedSiteRendererProps) {
  const hasCover = !!(cover && cover.trim().length > 5)
  const dark = template === 'dark'
  const vib  = template === 'vibrante'
  const eleg = template === 'elegante'
  const mini = template === 'minimalista'
  const over = hasCover || dark || vib

  const pageBg = dark ? '#0a0a0f' : vib ? color : eleg ? '#faf9f7' : '#fff'
  const navBg  = dark ? 'rgba(0,0,0,0.65)' : vib ? 'rgba(255,255,255,0.1)' : 'white'
  const border = dark ? 'rgba(255,255,255,0.08)' : '#f0f0f0'
  const muted  = dark ? 'rgba(255,255,255,0.5)' : vib ? 'rgba(255,255,255,0.75)' : '#6b7280'
  const sectBg = dark ? 'rgba(255,255,255,0.02)' : vib ? 'rgba(0,0,0,0.08)' : '#f9fafb'
  const navFg  = dark || vib ? 'white' : '#111827'
  const heroFg = over ? 'white' : '#111827'
  const ctaBg  = over ? 'white' : color
  const ctaFg  = over ? color : 'white'

  const heroBg = hasCover
    ? `linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.45)), url(${cover}) center/cover`
    : dark ? `radial-gradient(ellipse at 50% 0%, ${color}30, transparent 70%)`
    : vib  ? `linear-gradient(135deg, ${color}, ${color}cc)`
    : mini ? 'white'
    : `linear-gradient(135deg, ${color}14, ${color}04)`

  const sec = sections

  // Shared editable props
  const E = (onSave: (v: string) => void, extra?: React.CSSProperties) => ({
    contentEditable: true as const,
    suppressContentEditableWarning: true,
    style: { ...baseEditStyle, ...extra },
    ...editHover,
    onFocus: editHover.onFocus,
    onBlur: editBlur(onSave),
  })

  return (
    <div style={{ fontFamily, background: pageBg, minHeight: '100vh', color: navFg }}>

      {/* ── NAV ─────────────────────────────────────────── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: mini ? '1.25rem 3rem' : '1rem 2rem',
        background: mini ? 'transparent' : navBg,
        borderBottom: mini ? 'none' : `1px solid ${border}`,
        backdropFilter: (dark || vib) ? 'blur(12px)' : 'none',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        {/* Logo o nombre editable */}
        {logo
          ? <img src={logo} alt={name} style={{ height: 44, maxWidth: 180, objectFit: 'contain',
              filter: (dark || vib) ? 'brightness(0) invert(1)' : 'none' }} />
          : <span {...E(onNameChange, {
              fontWeight: mini ? 400 : 800,
              fontSize: mini ? '0.75rem' : '1.125rem',
              color: navFg,
              textTransform: mini ? 'uppercase' : 'none',
              letterSpacing: mini ? '0.15em' : 'normal',
            })}>
              {name}
            </span>}

        {/* CTA nav */}
        {mini
          ? <span {...E(v => onEdit('contact.cta', v), { fontSize: '0.875rem', color: muted })}>
              {content.contact?.cta ?? 'Contacto →'}
            </span>
          : <span
              {...E(v => onEdit('contact.cta', v), {
                background: color, color: 'white',
                padding: '0.5rem 1.25rem', borderRadius: '8px',
                fontSize: '0.875rem', fontWeight: 700, display: 'inline-block',
              })}
              onBlur={e => {
                const el = e.currentTarget as HTMLElement
                el.style.boxShadow = ''
                el.style.background = color  // restaurar
                el.style.color = 'white'
                onEdit('contact.cta', el.innerText.trim())
              }}>
              {content.contact?.cta ?? 'Contactar'}
            </span>}
      </nav>

      {/* ── HERO ─────────────────────────────────────────── */}
      {sec.hero && (
        <div style={{ background: heroBg, padding: mini ? '5rem 3rem' : '5rem 2rem',
                      position: 'relative', overflow: 'hidden' }}>
          {!hasCover && !dark && !vib && !mini && (
            <div style={{ position: 'absolute', inset: 0, opacity: 0.18, pointerEvents: 'none',
                          backgroundImage: `radial-gradient(${color}70 1px, transparent 1px)`,
                          backgroundSize: '24px 24px' }} />
          )}
          <div style={{ position: 'relative', maxWidth: mini ? '640px' : '720px',
                        margin: mini ? '0' : '0 auto',
                        textAlign: mini ? 'left' : 'center' }}>
            {/* Logo grande en hero */}
            {logo && !mini && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <img src={logo} alt={name} style={{ height: 72, maxWidth: 280, objectFit: 'contain',
                                                     filter: over ? 'brightness(0) invert(1)' : 'none' }} />
              </div>
            )}

            {/* Badge nombre */}
            {!mini && (
              <div style={{ display: 'inline-block', marginBottom: '1.25rem',
                             background: over ? 'rgba(255,255,255,0.15)' : `${color}18`,
                             border: `1px solid ${over ? 'rgba(255,255,255,0.3)' : color + '30'}`,
                             padding: '3px 14px', borderRadius: 20 }}>
                <span {...E(onNameChange, { fontSize: '11px', fontWeight: 700,
                                            color: over ? 'rgba(255,255,255,0.9)' : color })}>
                  {name}
                </span>
              </div>
            )}

            {/* Título */}
            <h1 {...E(v => onEdit('hero.title', v), {
              fontSize: mini ? 'clamp(2.5rem,5vw,4rem)' : 'clamp(1.75rem,4vw,2.75rem)',
              fontWeight: mini ? 900 : 800,
              color: heroFg,
              lineHeight: 1.12, marginBottom: '1rem',
              letterSpacing: mini ? '-0.02em' : 'normal',
              display: 'block',
              fontFamily: eleg ? 'Georgia, serif' : 'inherit',
            })}>
              {content.hero.title}
            </h1>

            {mini && <div style={{ width: 48, height: 4, background: color, borderRadius: 2, marginBottom: '1.25rem' }} />}

            {/* Subtítulo */}
            <p {...E(v => onEdit('hero.subtitle', v), {
              fontSize: mini ? '1.125rem' : '1.0625rem',
              color: over ? 'rgba(255,255,255,0.82)' : muted,
              marginBottom: '2rem', lineHeight: 1.75,
              maxWidth: mini ? '500px' : 'none', display: 'block',
            })}>
              {content.hero.subtitle}
            </p>

            {/* CTA hero — onBlur restaura colores */}
            <span
              {...E(v => onEdit('hero.cta', v), {
                display: 'inline-block', background: ctaBg, color: ctaFg,
                padding: '0.875rem 2.25rem', borderRadius: 10,
                fontWeight: 700, fontSize: '1rem',
                boxShadow: `0 6px 24px ${color}40`,
              })}
              onBlur={e => {
                const el = e.currentTarget as HTMLElement
                el.style.boxShadow = `0 6px 24px ${color}40`
                el.style.background = ctaBg
                el.style.color = ctaFg
                onEdit('hero.cta', el.innerText.trim())
              }}>
              {content.hero.cta}
            </span>

            {mini && <span style={{ fontSize: '0.875rem', color: muted, marginLeft: '1rem' }}>Sin compromiso</span>}
          </div>
        </div>
      )}

      {/* ── NOSOTROS ─────────────────────────────────────── */}
      {sec.nosotros && (
        <div style={{ padding: mini ? '4rem 3rem' : '4rem 2rem',
                      textAlign: mini ? 'left' : 'center',
                      background: dark ? 'rgba(255,255,255,0.02)' : vib ? 'rgba(255,255,255,0.08)' : 'white' }}>
          {!mini && <div style={{ width: 44, height: 3, background: color, borderRadius: 2, margin: '0 auto 1.25rem' }} />}
          <span {...E(onNameChange, {
            fontSize: mini ? '0.75rem' : '1.5rem',
            fontWeight: mini ? 700 : 800,
            display: 'block', marginBottom: mini ? '0.5rem' : '1rem',
            color: mini ? muted : navFg,
            textTransform: mini ? 'uppercase' : 'none',
            letterSpacing: mini ? '0.15em' : 'normal',
            fontFamily: eleg ? 'Georgia, serif' : 'inherit',
          })}>
            {name}
          </span>
          <p {...E(v => onEdit('about.text', v), {
            color: muted, lineHeight: 1.85, fontSize: '1rem',
            maxWidth: '650px', margin: mini ? '0' : '0 auto', display: 'block',
          })}>
            {content.about.text}
          </p>
        </div>
      )}

      {/* ── SERVICIOS ────────────────────────────────────── */}
      {sec.servicios && (
        <div style={{ padding: mini ? '3rem 3rem' : '3.5rem 2rem',
                      background: mini ? '#f9fafb' : sectBg }}>
          {mini ? (
            <div style={{ maxWidth: '700px' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: muted,
                           letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
                Lo que hacemos
              </p>
              {(content.services as Service[]).map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between',
                                       alignItems: 'flex-start', padding: '1.25rem 0',
                                       borderBottom: `1px solid ${border}` }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, color: '#111827', marginBottom: '0.25rem' }}>{s.name}</p>
                    <p style={{ color: muted, fontSize: '0.875rem' }}>{s.description}</p>
                  </div>
                  {s.price && <span style={{ color, fontWeight: 700, marginLeft: '1.5rem', flexShrink: 0 }}>{s.price}</span>}
                </div>
              ))}
              <button onClick={onServiceAdd}
                      style={{ marginTop: '1rem', padding: '0.75rem 1.25rem', borderRadius: 8,
                                border: `2px dashed ${color}40`, background: 'transparent',
                                color, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                + Agregar servicio
              </button>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, textAlign: 'center',
                            marginBottom: '0.5rem', color: navFg }}>Servicios</h2>
              <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(165,180,252,0.6)', marginBottom: '1.5rem' }}>
                Clic en campo para editar · Clic en imagen para cambiarla
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))',
                             gap: '1.25rem', maxWidth: '960px', margin: '0 auto' }}>
                {(content.services as Service[]).map((s, i) => (
                  <SvcCard key={i} s={s} i={i} color={color} dark={dark} vib={vib}
                    onChange={onServiceChange} onImg={onServiceImageUpload} onRemove={onServiceRemove} />
                ))}
                <button onClick={onServiceAdd}
                        style={{ background: 'transparent',
                                  border: `2px dashed ${dark ? 'rgba(99,102,241,0.3)' : `${color}40`}`,
                                  borderRadius: 12, padding: '2rem 1rem', cursor: 'pointer',
                                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                                  justifyContent: 'center', gap: '0.5rem', minHeight: 180, fontFamily: 'inherit' }}
                        onMouseEnter={e => { e.currentTarget.style.background = `${color}10`; e.currentTarget.style.borderColor = color }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = `${color}40` }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${color}20`,
                                 display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color }}>+</div>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color }}>Agregar servicio</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── GALERÍA ──────────────────────────────────────── */}
      {sec.galeria && gallery.length > 0 && (
        <div style={{ padding: '3.5rem 2rem', background: dark ? 'rgba(255,255,255,0.02)' : 'white' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, textAlign: 'center', marginBottom: '2rem', color: navFg }}>
            Nuestros trabajos
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))',
                         gap: '0.875rem', maxWidth: '960px', margin: '0 auto' }}>
            {gallery.map((url, i) => (
              <div key={i} style={{ aspectRatio: '1', borderRadius: 12, overflow: 'hidden' }}>
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── RESEÑAS ──────────────────────────────────────── */}
      {sec.resenas && content.reviews && content.reviews.length > 0 && (
        <div style={{ padding: '3.5rem 2rem', background: sectBg }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, textAlign: 'center', marginBottom: '2rem', color: navFg }}>
            Lo que dicen nuestros clientes
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
                         gap: '1rem', maxWidth: '960px', margin: '0 auto' }}>
            {content.reviews.map((r, i) => (
              <div key={i} style={{ background: dark ? 'rgba(255,255,255,0.04)' : 'white',
                                     border: `1px solid ${border}`, borderRadius: 14, padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.875rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: color, flexShrink: 0,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  color: 'white', fontWeight: 700, fontSize: '1rem' }}>
                    {r.author?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, color: navFg, fontSize: '0.9375rem' }}>{r.author}</p>
                    <p style={{ color: '#f59e0b', fontSize: '0.875rem' }}>{'★'.repeat(r.rating ?? 5)}</p>
                  </div>
                </div>
                <p style={{ color: muted, fontSize: '0.875rem', lineHeight: 1.7, fontStyle: 'italic' }}>"{r.text}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FOOTER ───────────────────────────────────────── */}
      <div style={{ background: dark ? '#050508' : '#111827', padding: '2.5rem 2rem', textAlign: 'center' }}>
        {logo && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <img src={logo} alt="" style={{ height: 36, objectFit: 'contain',
                                             filter: 'brightness(0) invert(1)', opacity: 0.75 }} />
          </div>
        )}
        <span {...E(onNameChange, {
          fontWeight: 800, color: 'white', display: 'block',
          fontSize: '1.0625rem', marginBottom: '0.375rem',
        })}>
          {name}
        </span>
        <p {...E(v => onEdit('footer.tagline', v), {
          color: '#9ca3af', fontSize: '0.875rem', display: 'block',
        })}>
          {content.footer.tagline}
        </p>
        <p style={{ color: '#374151', fontSize: '0.75rem', marginTop: '1.25rem' }}>
          Sitio creado con <span style={{ color }}>Amelia</span>
        </p>
      </div>
    </div>
  )
}
