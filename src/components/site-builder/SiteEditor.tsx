'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { TEMPLATES, type TemplateId } from './templates'
import type { SiteContent } from '@/types/database'

const COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#06b6d4',
  '#10b981','#f59e0b','#ef4444','#1e40af','#111827',
]

const FONTS = [
  { id: 'inter',    label: 'Inter',    style: 'Inter, sans-serif' },
  { id: 'sora',     label: 'Sora',     style: "'Sora', sans-serif" },
  { id: 'playfair', label: 'Playfair', style: "'Playfair Display', serif" },
  { id: 'space',    label: 'Space Gr.', style: "'Space Grotesk', sans-serif" },
]

interface Props {
  business: {
    id: string
    name: string
    slug: string
    category: string
    primary_color: string | null
    logo_url: string | null
    cover_url: string | null
    is_published: boolean
    sites: { content: SiteContent; status: string }[]
  }
}

// ── Set a value deep in an object by dot-path ────────────────
function setDeep<T extends object>(obj: T, path: string, value: string): T {
  const keys = path.split('.')
  const result = JSON.parse(JSON.stringify(obj)) as Record<string, unknown>
  let cur = result
  for (let i = 0; i < keys.length - 1; i++) {
    cur = cur[keys[i]] as Record<string, unknown>
  }
  cur[keys[keys.length - 1]] = value
  return result as T
}

export default function SiteEditor({ business }: Props) {
  const router = useRouter()
  const site = business.sites[0]

  const [content, setContent]         = useState<SiteContent>(site.content)
  const [templateId, setTemplateId]   = useState<TemplateId>('moderna')
  const [color, setColor]             = useState(business.primary_color ?? '#6366f1')
  const [activeFont, setActiveFont]   = useState('inter')
  const [viewport, setViewport]       = useState<'desktop' | 'mobile'>('desktop')
  const [sections, setSections]       = useState({
    hero: true, about: true, services: true,
    gallery: true, reviews: true, contact: true,
  })
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(true)
  const [publishing, setPublishing]   = useState(false)
  const [published, setPublished]     = useState(business.is_published)
  const [logo, setLogo]               = useState<string | null>(business.logo_url)
  const [cover, setCover]             = useState<string | null>(business.cover_url)
  const [gallery, setGallery]         = useState<string[]>(
    (site.content.gallery ?? []) as string[]
  )
  const [activePanel, setActivePanel] = useState<'design' | 'sections' | 'reviews'>('design')

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logoRef   = useRef<HTMLInputElement>(null)
  const coverRef  = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  // ── Edición inline ────────────────────────────────────────
  const handleEdit = useCallback((path: string, value: string) => {
    setContent(prev => setDeep(prev, path, value))
    setSaved(false)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => autoSave(), 1500)
  }, [])

  // ── Auto-save ─────────────────────────────────────────────
  const autoSave = useCallback(async () => {
    setSaving(true)
    try {
      await fetch('/api/save-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: business.id,
          content: { ...content, gallery },
          template_id: templateId,
          primary_color: color,
        }),
      })
      setSaved(true)
    } catch (e) {
      console.error('Auto-save error:', e)
    } finally {
      setSaving(false)
    }
  }, [content, gallery, templateId, color, business.id])

  // ── Upload imagen ─────────────────────────────────────────
  const uploadImage = async (file: File, type: 'logo' | 'cover' | 'gallery') => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('type', type)
    const res = await fetch('/api/upload-image', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) { alert(data.error); return null }
    return data.url as string
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadImage(file, 'logo')
    if (url) { setLogo(url); setSaved(false); setTimeout(autoSave, 100) }
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await uploadImage(file, 'cover')
    if (url) { setCover(url); setSaved(false); setTimeout(autoSave, 100) }
  }

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const urls = await Promise.all(files.map(f => uploadImage(f, 'gallery')))
    const valid = urls.filter(Boolean) as string[]
    const newGallery = [...gallery, ...valid].slice(0, 12)
    setGallery(newGallery)
    setSaved(false)
    setTimeout(autoSave, 100)
  }

  // ── Publish ───────────────────────────────────────────────
  const handlePublish = async () => {
    setPublishing(true)
    await autoSave()
    const res = await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_id: business.id }),
    })
    if (res.ok) { setPublished(true); router.refresh() }
    setPublishing(false)
  }

  // ── Agregar reseña ────────────────────────────────────────
  const addReview = () => {
    const reviews = [...(content.reviews ?? []),
      { author: 'Nombre del cliente', rating: 5, text: 'Escribe aquí la reseña del cliente...' }]
    setContent(prev => ({ ...prev, reviews }))
    setSaved(false)
  }

  const removeReview = (i: number) => {
    const reviews = (content.reviews ?? []).filter((_, idx) => idx !== i)
    setContent(prev => ({ ...prev, reviews }))
    setSaved(false)
  }

  // ── Agregar servicio ──────────────────────────────────────
  const addService = () => {
    const services = [...content.services,
      { name: 'Nuevo servicio', description: 'Descripción del servicio', price: '' }]
    setContent(prev => ({ ...prev, services }))
    setSaved(false)
  }

  const removeService = (i: number) => {
    const services = content.services.filter((_, idx) => idx !== i)
    setContent(prev => ({ ...prev, services }))
    setSaved(false)
  }

  // ── Template actual ───────────────────────────────────────
  const TemplateComponent = TEMPLATES[templateId].component

  // ── Filtrar secciones del content ────────────────────────
  const visibleContent: SiteContent = {
    ...content,
    reviews: sections.reviews ? content.reviews : [],
    gallery: sections.gallery ? gallery : [],
  }

  return (
    <div className="flex flex-col" style={{ height: '100vh', background: 'var(--bg-base)' }}>

      {/* ── TOP BAR ──────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 shrink-0"
           style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => router.push('/dashboard/sitio')}
                className="btn-ghost text-xs py-1.5 px-3">
          ← Volver
        </button>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: published ? '#10b981' : '#f59e0b' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {business.name}
          </span>
          <span className="text-xs mono" style={{ color: 'var(--text-muted)' }}>
            /sitio/{business.slug}
          </span>
        </div>

        <div className="flex-1" />

        {/* Viewport toggle */}
        <div className="flex rounded-lg overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
          {(['desktop','mobile'] as const).map(v => (
            <button key={v} onClick={() => setViewport(v)}
                    className="px-3 py-1.5 text-xs font-medium transition-all"
                    style={{
                      background: viewport === v ? 'rgba(99,102,241,0.25)' : 'transparent',
                      color: viewport === v ? 'var(--accent-light)' : 'var(--text-muted)',
                    }}>
              {v === 'desktop' ? '🖥' : '📱'} {v === 'desktop' ? 'Desktop' : 'Móvil'}
            </button>
          ))}
        </div>

        {/* Save indicator */}
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
          {saving
            ? <><svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>Guardando...</>
            : saved
              ? <><span style={{ color: '#10b981' }}>●</span> Guardado</>
              : <><span style={{ color: '#f59e0b' }}>●</span> Sin guardar</>
          }
        </div>

        {published && (
          <a href={`/sitio/${business.slug}`} target="_blank" className="btn-ghost text-xs py-1.5 px-3">
            Ver sitio ↗
          </a>
        )}

        <button onClick={handlePublish} disabled={publishing} className="btn-primary text-xs py-2 px-4">
          {publishing
            ? <><svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>Publicando...</>
            : published ? '✓ Republicar' : '🚀 Publicar sitio'}
        </button>
      </div>

      {/* ── BODY ─────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── PANEL IZQUIERDO: Diseño ──────────────────────── */}
        <div className="shrink-0 flex flex-col overflow-y-auto"
             style={{ width: '220px', background: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}>

          {/* Tab selector */}
          <div className="flex p-2 gap-1" style={{ borderBottom: '1px solid var(--border)' }}>
            {([
              ['design', 'Diseño'],
              ['sections', 'Secciones'],
              ['reviews', 'Reseñas'],
            ] as const).map(([id, label]) => (
              <button key={id} onClick={() => setActivePanel(id)}
                      className="flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all"
                      style={{
                        background: activePanel === id ? 'rgba(99,102,241,0.2)' : 'transparent',
                        color: activePanel === id ? 'var(--accent-light)' : 'var(--text-muted)',
                      }}>
                {label}
              </button>
            ))}
          </div>

          {/* Panel: Diseño */}
          {activePanel === 'design' && (
            <div className="p-3 space-y-5">
              {/* Plantillas */}
              <div>
                <p className="section-label">Plantilla</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.entries(TEMPLATES) as [TemplateId, typeof TEMPLATES[TemplateId]][]).map(([id, t]) => (
                    <button key={id} onClick={() => { setTemplateId(id); setSaved(false) }}
                            className="rounded-lg p-2 text-left transition-all"
                            style={{
                              background: templateId === id ? 'rgba(99,102,241,0.12)' : 'var(--bg-elevated)',
                              border: templateId === id ? '1.5px solid rgba(99,102,241,0.4)' : '1.5px solid var(--border)',
                            }}>
                      {/* Mini thumb */}
                      <div className="h-10 rounded-md mb-1.5 overflow-hidden"
                           style={{ background: id === 'oscura' || id === 'tech' ? '#0a0a0f'
                             : id === 'vibrante' ? `linear-gradient(135deg,${color},${color}bb)`
                             : id === 'elegante' ? '#faf9f7' : 'white',
                             border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ height: '4px', background: id === 'minimalista' ? 'transparent' : color,
                                      marginBottom: '3px', opacity: 0.8 }} />
                        <div style={{ height: '3px', background: 'rgba(128,128,128,0.2)', margin: '0 6px 2px' }} />
                        <div style={{ height: '2px', background: 'rgba(128,128,128,0.15)', margin: '0 10px' }} />
                      </div>
                      <p className="text-xs font-semibold"
                         style={{ color: templateId === id ? 'var(--accent-light)' : 'var(--text-secondary)' }}>
                        {t.name}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Colores */}
              <div>
                <p className="section-label">Color principal</p>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => { setColor(c); setSaved(false) }}
                            className="w-8 h-8 rounded-lg transition-all hover:scale-110"
                            style={{
                              background: c,
                              border: color === c ? '3px solid var(--accent-light)' : '2px solid rgba(255,255,255,0.1)',
                              transform: color === c ? 'scale(1.15)' : undefined,
                              boxShadow: color === c ? `0 0 12px ${c}88` : 'none',
                            }} />
                  ))}
                </div>
              </div>

              {/* Fuentes */}
              <div>
                <p className="section-label">Fuente</p>
                <div className="space-y-1">
                  {FONTS.map(f => (
                    <button key={f.id} onClick={() => setActiveFont(f.id)}
                            className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all"
                            style={{
                              fontFamily: f.style,
                              background: activeFont === f.id ? 'rgba(99,102,241,0.12)' : 'var(--bg-elevated)',
                              border: activeFont === f.id ? '1px solid rgba(99,102,241,0.35)' : '1px solid var(--border)',
                              color: activeFont === f.id ? 'var(--accent-light)' : 'var(--text-secondary)',
                            }}>
                      {f.label} — Aa
                    </button>
                  ))}
                </div>
              </div>

              {/* Imágenes */}
              <div>
                <p className="section-label">Imágenes</p>
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />

                <div className="space-y-2">
                  {/* Logo */}
                  <button onClick={() => logoRef.current?.click()}
                          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs transition-all"
                          style={{ background: 'var(--bg-elevated)', border: `1.5px dashed ${logo ? 'var(--accent)' : 'var(--border)'}` }}>
                    {logo
                      ? <img src={logo} alt="" className="w-6 h-6 object-contain rounded" />
                      : <div className="w-6 h-6 rounded flex items-center justify-center text-base"
                             style={{ background: 'rgba(99,102,241,0.1)' }}>🏷</div>
                    }
                    <span style={{ color: logo ? 'var(--accent-light)' : 'var(--text-muted)' }}>
                      {logo ? 'Cambiar logo' : 'Subir logo'}
                    </span>
                  </button>

                  {/* Portada */}
                  <button onClick={() => coverRef.current?.click()}
                          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs transition-all"
                          style={{ background: 'var(--bg-elevated)', border: `1.5px dashed ${cover ? 'var(--accent)' : 'var(--border)'}` }}>
                    {cover
                      ? <img src={cover} alt="" className="w-6 h-6 object-cover rounded" />
                      : <div className="w-6 h-6 rounded flex items-center justify-center text-base"
                             style={{ background: 'rgba(99,102,241,0.1)' }}>🖼</div>
                    }
                    <span style={{ color: cover ? 'var(--accent-light)' : 'var(--text-muted)' }}>
                      {cover ? 'Cambiar portada' : 'Foto de portada'}
                    </span>
                  </button>

                  {/* Galería */}
                  <button onClick={() => galleryRef.current?.click()}
                          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs transition-all"
                          style={{ background: 'var(--bg-elevated)', border: `1.5px dashed ${gallery.length > 0 ? 'var(--accent)' : 'var(--border)'}` }}>
                    <div className="w-6 h-6 rounded flex items-center justify-center text-base"
                         style={{ background: 'rgba(99,102,241,0.1)' }}>📸</div>
                    <span style={{ color: gallery.length > 0 ? 'var(--accent-light)' : 'var(--text-muted)' }}>
                      {gallery.length > 0 ? `${gallery.length} foto${gallery.length > 1 ? 's' : ''} · Agregar` : 'Galería de trabajos'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Servicios */}
              <div>
                <p className="section-label">Servicios</p>
                <div className="space-y-1.5">
                  {content.services.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                         style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      <span className="flex-1 text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                        {s.name}
                      </span>
                      <button onClick={() => removeService(i)}
                              className="text-xs transition-colors hover:text-red-400"
                              style={{ color: 'var(--text-muted)' }}>✕</button>
                    </div>
                  ))}
                  <button onClick={addService}
                          className="w-full text-xs py-2 rounded-lg transition-all"
                          style={{ background: 'rgba(99,102,241,0.08)', color: 'var(--accent-light)',
                                   border: '1px dashed rgba(99,102,241,0.3)' }}>
                    + Agregar servicio
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Panel: Secciones */}
          {activePanel === 'sections' && (
            <div className="p-3">
              <p className="section-label">Secciones visibles</p>
              <div className="space-y-1">
                {(Object.entries(sections) as [keyof typeof sections, boolean][]).map(([key, val]) => {
                  const labels: Record<string, string> = {
                    hero: 'Hero principal', about: 'Sobre nosotros', services: 'Servicios',
                    gallery: 'Galería de trabajos', reviews: 'Reseñas de clientes', contact: 'Contacto',
                  }
                  return (
                    <div key={key} className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                         style={{ background: 'var(--bg-elevated)' }}>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {labels[key]}
                      </span>
                      <div onClick={() => setSections(prev => ({ ...prev, [key]: !prev[key] }))}
                           className="w-9 h-5 rounded-full relative cursor-pointer transition-all"
                           style={{ background: val ? 'var(--accent)' : 'rgba(255,255,255,0.1)' }}>
                        <div className="w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all"
                             style={{ left: val ? '18px' : '3px' }} />
                      </div>
                    </div>
                  )
                })}
              </div>

              <p className="section-label mt-5">Acciones rápidas</p>
              <div className="space-y-1.5">
                <button onClick={() => router.push(`/dashboard/sitio`)}
                        className="w-full text-left text-xs px-3 py-2 rounded-lg transition-all"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
                                 border: '1px solid var(--border)' }}>
                  🔄 Regenerar con IA
                </button>
                <button onClick={autoSave}
                        className="w-full text-left text-xs px-3 py-2 rounded-lg transition-all"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
                                 border: '1px solid var(--border)' }}>
                  💾 Guardar ahora
                </button>
              </div>
            </div>
          )}

          {/* Panel: Reseñas */}
          {activePanel === 'reviews' && (
            <div className="p-3">
              <p className="section-label">Reseñas de clientes</p>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                Se muestran en el sitio con nombre y estrellas
              </p>
              <div className="space-y-2">
                {(content.reviews ?? []).map((r, i) => (
                  <div key={i} className="rounded-xl p-3"
                       style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <input
                        defaultValue={r.author}
                        onBlur={e => {
                          const reviews = [...(content.reviews ?? [])]
                          reviews[i] = { ...reviews[i], author: e.target.value }
                          setContent(prev => ({ ...prev, reviews }))
                          setSaved(false)
                        }}
                        className="text-xs font-semibold bg-transparent border-none outline-none flex-1"
                        style={{ color: 'var(--text-primary)' }}
                      />
                      <div className="flex items-center gap-1">
                        {[1,2,3,4,5].map(star => (
                          <button key={star} type="button"
                                  onClick={() => {
                                    const reviews = [...(content.reviews ?? [])]
                                    reviews[i] = { ...reviews[i], rating: star }
                                    setContent(prev => ({ ...prev, reviews }))
                                    setSaved(false)
                                  }}
                                  style={{ color: star <= r.rating ? '#f59e0b' : 'var(--text-muted)',
                                           fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer' }}>
                            ★
                          </button>
                        ))}
                        <button onClick={() => removeReview(i)}
                                className="ml-1 text-xs"
                                style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                          ✕
                        </button>
                      </div>
                    </div>
                    <textarea
                      defaultValue={r.text}
                      rows={2}
                      onBlur={e => {
                        const reviews = [...(content.reviews ?? [])]
                        reviews[i] = { ...reviews[i], text: e.target.value }
                        setContent(prev => ({ ...prev, reviews }))
                        setSaved(false)
                      }}
                      className="w-full text-xs bg-transparent border-none outline-none resize-none"
                      style={{ color: 'var(--text-secondary)', fontFamily: 'inherit' }}
                    />
                  </div>
                ))}
                <button onClick={addReview}
                        className="w-full text-xs py-2.5 rounded-xl transition-all"
                        style={{ background: 'rgba(99,102,241,0.08)', color: 'var(--accent-light)',
                                 border: '1px dashed rgba(99,102,241,0.3)' }}>
                  + Agregar reseña
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── PREVIEW CENTRAL ─────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden"
             style={{ background: '#1a1a2e' }}>

          {/* Edit hint */}
          <div className="flex items-center justify-center gap-2 py-2 text-xs"
               style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent-light)',
                        borderBottom: '1px solid rgba(99,102,241,0.2)' }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Haz clic en cualquier texto para editarlo directamente
          </div>

          {/* Site preview */}
          <div className="flex-1 overflow-y-auto p-6 flex justify-center">
            <div style={{
              width: viewport === 'mobile' ? '390px' : '100%',
              maxWidth: '1200px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
              borderRadius: '12px',
              overflow: 'hidden',
              fontFamily: FONTS.find(f => f.id === activeFont)?.style,
            }}>
              <TemplateComponent
                content={visibleContent}
                color={color}
                name={business.name}
                logo={logo}
                cover={cover}
                gallery={sections.gallery ? gallery : []}
                editMode={true}
                onEdit={handleEdit}
              />
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex items-center px-4 py-2 text-xs"
               style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-muted)' }}>
              Plantilla: <span style={{ color: 'var(--accent-light)' }}>{TEMPLATES[templateId].name}</span>
            </span>
            <div className="flex-1" />
            <span className="mono" style={{ color: 'var(--text-muted)' }}>
              amelia.app/sitio/{business.slug}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
