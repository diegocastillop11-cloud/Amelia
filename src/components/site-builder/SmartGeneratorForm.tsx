'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { SiteContent } from '@/types/database'

interface UploadedImage {
  url: string
  name: string
  type: 'logo' | 'gallery' | 'cover'
}

interface GeneratorState {
  freeText: string
  name: string
  slug: string
  category: string
  primary_color: string
  hasGoogleReviews: boolean
  reviews: string
  logo: UploadedImage | null
  coverImage: UploadedImage | null
  galleryImages: UploadedImage[]
}

const COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#06b6d4',
  '#10b981','#f59e0b','#ef4444','#1e40af','#111827',
]

const CATEGORIES = [
  'Barbería','Pastelería','Clínica','Restaurante','Cafetería',
  'Salón de belleza','Gimnasio','Veterinaria','Tienda de ropa',
  'Consultora','Agencia','Otro',
]

const GENERATING_MSGS = [
  'Leyendo todo lo que nos diste...',
  'Analizando el negocio con IA...',
  'Extrayendo servicios y tono...',
  'Seleccionando las mejores reseñas...',
  'Creando el contenido del sitio...',
  'Diseñando las secciones...',
  'Verificando el guardado...',
]

const generateSlug = (name: string) =>
  name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')

export default function SmartGeneratorForm({
  existingBusiness,
}: {
  existingBusiness?: {
    id: string; name: string; slug: string; category: string
    description: string | null; primary_color: string | null
    logo_url: string | null; cover_url: string | null
    is_published: boolean
    sites?: { content: SiteContent | null }[]
  } | null
}) {
  const router = useRouter()

  const existingGallery = (existingBusiness?.sites?.[0]?.content?.gallery ?? []) as string[]

  const [state, setState] = useState<GeneratorState>({
    freeText: existingBusiness?.description ?? '',
    name: existingBusiness?.name ?? '',
    slug: existingBusiness?.slug ?? '',
    category: existingBusiness?.category ?? '',
    primary_color: existingBusiness?.primary_color ?? '#6366f1',
    hasGoogleReviews: false,
    reviews: '',
    logo: existingBusiness?.logo_url
      ? { url: existingBusiness.logo_url, name: 'logo', type: 'logo' }
      : null,
    coverImage: existingBusiness?.cover_url
      ? { url: existingBusiness.cover_url, name: 'fondo', type: 'cover' }
      : null,
    galleryImages: existingGallery.map((url, i) => ({ url, name: `foto-${i}`, type: 'gallery' as const })),
  })

  const [step, setStep]                   = useState<'input' | 'generating' | 'done'>(
    existingBusiness?.sites?.[0]?.content ? 'done' : 'input'
  )
  const [genMsg, setGenMsg]               = useState('')
  const [error, setError]                 = useState<string | null>(null)
  const [publishing, setPublishing]       = useState(false)
  const [published, setPublished]         = useState(existingBusiness?.is_published ?? false)
  const [savedConfirmed, setSavedConfirmed] = useState(false) // ✅ confirmación de guardado
  const [generatedContent, setGenerated]  = useState<SiteContent | null>(
    existingBusiness?.sites?.[0]?.content ?? null
  )
  const [businessId, setBusinessId]       = useState<string | null>(existingBusiness?.id ?? null)
  const [currentSlug, setCurrentSlug]     = useState(existingBusiness?.slug ?? '')

  const logoRef    = useRef<HTMLInputElement>(null)
  const coverRef   = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const update = (patch: Partial<GeneratorState>) =>
    setState(prev => ({ ...prev, ...patch }))

  // ── Persistencia de freeText en localStorage ─────────────
  const lsKey = existingBusiness?.id ? `amelia_freetext_${existingBusiness.id}` : null

  useEffect(() => {
    // Si description está vacía, intentar recuperar del localStorage
    if (lsKey && !existingBusiness?.description) {
      const stored = localStorage.getItem(lsKey)
      if (stored) update({ freeText: stored })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (lsKey && state.freeText) localStorage.setItem(lsKey, state.freeText)
  }, [state.freeText, lsKey])

  // ── Verificar en BD al cargar ────────────────────────────
  useEffect(() => {
    if (existingBusiness?.sites?.[0]?.content) {
      setSavedConfirmed(true)
    }
  }, [existingBusiness])

  // ── Upload imagen ─────────────────────────────────────────
  const uploadImage = useCallback(async (file: File, type: 'logo' | 'gallery' | 'cover') => {
    const fd = new FormData()
    fd.append('file', file); fd.append('type', type)
    const r = await fetch('/api/upload-image', { method: 'POST', body: fd })
    const d = await r.json()
    if (!r.ok) { alert(d.error); return null }
    return { url: d.url, name: file.name, type } as UploadedImage
  }, [])

  // ── Generar sitio ─────────────────────────────────────────
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!state.freeText && !state.name) {
      setError('Cuéntanos algo sobre el negocio para comenzar.')
      return
    }
    setError(null)
    setSavedConfirmed(false)
    setStep('generating')

    let i = 0
    setGenMsg(GENERATING_MSGS[0])
    const interval = setInterval(() => {
      i = (i + 1) % GENERATING_MSGS.length
      setGenMsg(GENERATING_MSGS[i])
    }, 1800)

    try {
      const res = await fetch('/api/ai/generate-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          freeText:    state.freeText,
          name:        state.name,
          slug:        state.slug || generateSlug(state.name || 'mi-negocio'),
          category:    state.category,
          primary_color: state.primary_color,
          reviews:     state.hasGoogleReviews ? state.reviews : '',
          logoUrl:     state.logo?.url ?? null,
          coverUrl:    state.coverImage?.url ?? null,
          galleryUrls: state.galleryImages.map(g => g.url),
        }),
      })

      clearInterval(interval)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Error al generar el sitio. Intenta nuevamente.')
        setStep('input')
        return
      }

      // ✅ El API confirma que se guardó en BD
      if (!data.saved) {
        setError('El sitio fue generado pero no se pudo guardar. Intenta nuevamente.')
        setStep('input')
        return
      }

      setGenerated(data.content)
      setBusinessId(data.business.id)
      setCurrentSlug(data.business.slug)
      setSavedConfirmed(true) // ✅ confirmado por el servidor
      update({ name: data.business.name, slug: data.business.slug })
      setStep('done')
      router.refresh()

    } catch (e) {
      clearInterval(interval)
      setError('Error de conexión. Intenta nuevamente.')
      setStep('input')
    }
  }

  const handlePublish = async () => {
    if (!businessId) return
    setPublishing(true)
    const r = await fetch('/api/publish', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_id: businessId }),
    })
    if (r.ok) { setPublished(true); router.refresh() }
    setPublishing(false)
  }

  // ── PANTALLA: Generando ───────────────────────────────────
  if (step === 'generating') return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
             style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 60px rgba(99,102,241,0.5)' }}>
          <svg className="w-10 h-10 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <div className="absolute inset-0 rounded-2xl animate-ping opacity-20"
             style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }} />
      </div>
      <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
        Generando tu sitio web
      </h2>
      <p className="text-sm mb-8 min-h-[20px]" style={{ color: 'var(--text-secondary)' }}>
        {genMsg}
      </p>
      <div className="w-64 h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
        <div className="h-full rounded-full animate-pulse"
             style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', width: '70%' }} />
      </div>
    </div>
  )

  // ── PANTALLA: Listo ───────────────────────────────────────
  if (step === 'done' && generatedContent) return (
    <div className="space-y-4">

      {/* ✅ Banner de confirmación de guardado */}
      {savedConfirmed && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
             style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <svg className="w-5 h-5 shrink-0" style={{ color: '#6ee7b7' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium" style={{ color: '#6ee7b7' }}>
              ✓ Sitio guardado correctamente en la base de datos
            </p>
            <p className="text-xs" style={{ color: 'rgba(110,231,183,0.7)' }}>
              Puedes cerrar la página y volver cuando quieras — tu sitio estará aquí.
            </p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="card p-4 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full"
               style={{ background: published ? '#10b981' : '#f59e0b' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {published ? 'Publicado' : 'Guardado como borrador'}
          </span>
          {currentSlug && (
            <span className="mono text-xs" style={{ color: 'var(--text-muted)' }}>
              /sitio/{currentSlug}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => { setStep('input'); setError(null) }} className="btn-ghost text-xs">
            ← Editar datos
          </button>
          {businessId && (
            <a href={`/dashboard/sitio/editor?id=${businessId}`} className="btn-secondary text-xs"
               style={{ textDecoration: 'none' }}>
              ✏️ Abrir editor visual
            </a>
          )}
          {!published ? (
            <button onClick={handlePublish} disabled={publishing} className="btn-primary text-xs py-2 px-4">
              {publishing
                ? <><svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>Publicando...</>
                : '🚀 Publicar sitio'}
            </button>
          ) : (
            <a href={`/sitio/${currentSlug}`} target="_blank"
               className="text-xs font-medium px-3 py-1.5 rounded-lg"
               style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7',
                         border: '1px solid rgba(16,185,129,0.3)', textDecoration: 'none' }}>
              ✓ Ver sitio en vivo →
            </a>
          )}
        </div>
      </div>

      {/* Preview del sitio */}
      <div className="card overflow-hidden">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-3"
             style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex gap-1.5">
            {['#ef4444','#f59e0b','#10b981'].map(c => (
              <div key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />
            ))}
          </div>
          <div className="flex-1 mx-3 px-3 py-1 rounded-md text-xs mono text-center"
               style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
            amelia.app/sitio/{currentSlug}
          </div>
        </div>

        {/* Site preview */}
        <div style={{ fontFamily: 'Inter, sans-serif', background: '#fff' }}>
          {/* Hero */}
          <div style={{
            background: state.coverImage?.url
              ? `linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.45)), url(${state.coverImage.url}) center/cover`
              : `linear-gradient(135deg, ${state.primary_color}18, ${state.primary_color}08)`,
            padding: '3rem 2rem', textAlign: 'center', position: 'relative', overflow: 'hidden',
          }}>
            {!state.coverImage && (
              <div style={{ position: 'absolute', inset: 0, opacity: 0.2,
                             backgroundImage: `radial-gradient(${state.primary_color}50 1px,transparent 1px)`,
                             backgroundSize: '24px 24px' }} />
            )}
            <div style={{ position: 'relative' }}>
              {state.logo && (
                <img src={state.logo.url} alt="" style={{ height: 48, margin: '0 auto 1rem', objectFit: 'contain',
                                                           filter: state.coverImage ? 'brightness(0) invert(1)' : 'none' }} />
              )}
              <h1 style={{ fontSize: 'clamp(1.5rem,4vw,2.5rem)', fontWeight: 800,
                            color: state.coverImage ? 'white' : '#111827',
                            lineHeight: 1.15, marginBottom: '0.75rem' }}>
                {generatedContent.hero.title}
              </h1>
              <p style={{ color: state.coverImage ? 'rgba(255,255,255,0.85)' : '#6b7280',
                           marginBottom: '1.5rem', fontSize: '1rem', lineHeight: 1.7 }}>
                {generatedContent.hero.subtitle}
              </p>
              <span style={{
                display: 'inline-block',
                background: state.coverImage ? 'white' : state.primary_color,
                color: state.coverImage ? state.primary_color : 'white',
                padding: '0.75rem 2rem', borderRadius: '10px', fontWeight: 700, fontSize: '0.9375rem',
              }}>
                {generatedContent.hero.cta}
              </span>
            </div>
          </div>

          {/* About */}
          <div style={{ padding: '2.5rem 2rem', textAlign: 'center', background: 'white' }}>
            <div style={{ width: 40, height: 3, background: state.primary_color, borderRadius: 2, margin: '0 auto 1rem' }} />
            <p style={{ color: '#6b7280', lineHeight: 1.8, maxWidth: '600px', margin: '0 auto' }}>
              {generatedContent.about.text}
            </p>
          </div>

          {/* Services */}
          <div style={{ padding: '2rem', background: '#f9fafb' }}>
            <h2 style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.25rem', color: '#111827', marginBottom: '1.5rem' }}>
              Servicios
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem', maxWidth: '800px', margin: '0 auto' }}>
              {generatedContent.services.slice(0,4).map((s, i) => (
                <div key={i} style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '12px', padding: '1.25rem' }}>
                  <p style={{ fontWeight: 700, color: '#111827', marginBottom: '0.375rem' }}>{s.name}</p>
                  <p style={{ color: '#9ca3af', fontSize: '0.8125rem', lineHeight: 1.5 }}>{s.description}</p>
                  {s.price && <p style={{ color: state.primary_color, fontWeight: 700, marginTop: '0.5rem' }}>{s.price}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Reseñas si hay */}
          {generatedContent.reviews && generatedContent.reviews.length > 0 && (
            <div style={{ padding: '2rem', background: 'white' }}>
              <h2 style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.25rem', color: '#111827', marginBottom: '1.5rem' }}>
                Lo que dicen nuestros clientes
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1rem', maxWidth: '800px', margin: '0 auto' }}>
                {generatedContent.reviews.slice(0,3).map((r, i) => (
                  <div key={i} style={{ background: '#f9fafb', border: '1px solid #f0f0f0', borderRadius: '12px', padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: state.primary_color, flexShrink: 0,
                                     display: 'flex', alignItems: 'center', justifyContent: 'center',
                                     color: 'white', fontWeight: 700, fontSize: 13 }}>
                        {r.author?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{r.author}</p>
                        <p style={{ color: '#f59e0b', fontSize: 12 }}>{'★'.repeat(r.rating)}</p>
                      </div>
                    </div>
                    <p style={{ color: '#6b7280', fontSize: 12, lineHeight: 1.6, fontStyle: 'italic' }}>"{r.text}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ background: '#111827', padding: '2rem', textAlign: 'center' }}>
            <p style={{ fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>{state.name}</p>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>{generatedContent.footer.tagline}</p>
          </div>
        </div>
      </div>
    </div>
  )

  // ── PANTALLA: Input ───────────────────────────────────────
  return (
    <form onSubmit={handleGenerate} className="space-y-4">
      {error && (
        <div className="alert-error">
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}

      {/* Campo inteligente */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Cuéntanos sobre el negocio
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Pega lo que tengas — reseñas de Google, descripción, publicaciones, o simplemente escribe tu idea
            </p>
          </div>
          <span className="badge-free text-xs">IA</span>
        </div>
        <textarea
          value={state.freeText}
          onChange={e => update({ freeText: e.target.value })}
          rows={6}
          placeholder={`Ejemplos:\n\n• "Barbería El Corte, 10 años en Santiago, especialistas en cortes clásicos..."\n• Reseñas copiadas de Google Maps\n• Descripción de Instagram/Facebook\n• "Quiero una web para mi pastelería en Valparaíso"`}
          className="input-field resize-none text-sm"
          style={{ minHeight: '140px' }}
        />
        <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
          💡 La IA extrae todo automáticamente — nombre, servicios, tono y reseñas.
        </p>
      </div>

      {/* Datos básicos */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Datos básicos
          <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
            {state.freeText ? '(opcionales si escribiste arriba)' : '(completa al menos el nombre)'}
          </span>
        </h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Nombre del negocio
            </label>
            <input type="text" value={state.name}
                   onChange={e => update({ name: e.target.value, slug: generateSlug(e.target.value) })}
                   placeholder="Ej: Barbería El Corte" className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              URL del sitio
            </label>
            <div className="flex items-center rounded-xl overflow-hidden"
                 style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border)' }}>
              <span className="px-3 py-3 text-xs mono shrink-0"
                    style={{ color: 'var(--text-muted)', borderRight: '1px solid var(--border)' }}>
                /sitio/
              </span>
              <input type="text" value={state.slug} onChange={e => update({ slug: e.target.value })}
                     placeholder="mi-negocio"
                     style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)',
                               outline: 'none', padding: '0.75rem', fontSize: '0.8125rem',
                               fontFamily: 'JetBrains Mono, monospace', width: '100%' }} />
            </div>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Rubro
          </label>
          <select value={state.category} onChange={e => update({ category: e.target.value })}
                  className="input-field" style={{ appearance: 'none', cursor: 'pointer' }}>
            <option value="">La IA lo detecta automáticamente...</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            Color principal
          </label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => update({ primary_color: c })}
                      className="w-8 h-8 rounded-lg transition-all hover:scale-110"
                      style={{ background: c,
                                border: state.primary_color === c ? '3px solid var(--accent-light)' : '2px solid rgba(255,255,255,0.1)',
                                transform: state.primary_color === c ? 'scale(1.15)' : undefined,
                                boxShadow: state.primary_color === c ? `0 0 14px ${c}88` : 'none' }} />
            ))}
          </div>
        </div>
      </div>

      {/* Reseñas de Google */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Reseñas de Google
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              La IA las selecciona y las integra en el sitio
            </p>
          </div>
          <div onClick={() => update({ hasGoogleReviews: !state.hasGoogleReviews })}
               className="w-10 h-6 rounded-full relative cursor-pointer transition-all"
               style={{ background: state.hasGoogleReviews ? 'var(--accent)' : 'rgba(255,255,255,0.1)' }}>
            <div className="w-4 h-4 bg-white rounded-full absolute top-1 transition-all"
                 style={{ left: state.hasGoogleReviews ? '22px' : '4px' }} />
          </div>
        </div>
        {state.hasGoogleReviews && (
          <textarea value={state.reviews} onChange={e => update({ reviews: e.target.value })}
                    rows={4} placeholder={`"Juan P. ⭐⭐⭐⭐⭐ - Excelente servicio..."\n"María G. ⭐⭐⭐⭐⭐ - La mejor barbería del barrio..."`}
                    className="input-field resize-none text-sm" />
        )}
      </div>

      {/* Imágenes */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Imágenes del negocio
        </h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Opcionales — si no tienes, el sitio usa diseños estándar atractivos
        </p>
        <input ref={logoRef} type="file" accept="image/*" className="hidden"
               onChange={async e => { const f=e.target.files?.[0]; if(!f) return; const u=await uploadImage(f,'logo'); if(u) update({logo:u}) }} />
        <input ref={coverRef} type="file" accept="image/*" className="hidden"
               onChange={async e => { const f=e.target.files?.[0]; if(!f) return; const u=await uploadImage(f,'cover'); if(u) update({coverImage:u}) }} />
        <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden"
               onChange={async e => {
                 const files=Array.from(e.target.files??[])
                 const ups=(await Promise.all(files.map(f=>uploadImage(f,'gallery')))).filter(Boolean) as UploadedImage[]
                 update({ galleryImages: [...state.galleryImages,...ups].slice(0,12) })
               }} />
        <div className="grid grid-cols-3 gap-3">
          {[
            { label:'Logo', icon:'🏷', state:state.logo, ref:logoRef },
            { label:'Imagen de fondo', icon:'🖼', state:state.coverImage, ref:coverRef },
          ].map(item => (
            <div key={item.label}>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>{item.label}</p>
              <button type="button" onClick={() => item.ref.current?.click()}
                      className="w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-2 transition-all"
                      style={{ background: item.state ? 'transparent' : 'var(--bg-elevated)',
                                border: `2px dashed ${item.state ? 'var(--accent)' : 'var(--border)'}`,
                                padding: 0, overflow: 'hidden' }}>
                {item.state
                  ? <img src={item.state.url} alt="" className="w-full h-full object-cover" />
                  : <><span className="text-2xl">{item.icon}</span>
                     <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Subir {item.label.toLowerCase()}</span></>}
              </button>
            </div>
          ))}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Galería</p>
            <button type="button" onClick={() => galleryRef.current?.click()}
                    className="w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-2 transition-all relative"
                    style={{ background: 'var(--bg-elevated)',
                              border: `2px dashed ${state.galleryImages.length>0 ? 'var(--accent)' : 'var(--border)'}` }}>
              {state.galleryImages.length > 0
                ? <div className="absolute inset-0 grid grid-cols-2 gap-0.5 p-1 rounded-xl overflow-hidden">
                    {state.galleryImages.slice(0,4).map((img,i) => (
                      <img key={i} src={img.url} alt="" className="w-full h-full object-cover rounded-sm" />
                    ))}
                  </div>
                : <><span className="text-2xl">📸</span>
                   <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Fotos de trabajos</span></>}
              {state.galleryImages.length > 0 && (
                <div className="absolute bottom-1 right-1 text-xs font-bold text-white rounded-full w-5 h-5 flex items-center justify-center"
                     style={{ background: 'var(--accent)' }}>
                  {state.galleryImages.length}
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      <button type="submit" className="btn-primary w-full py-4 text-base">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        {existingBusiness?.sites?.[0] ? 'Regenerar sitio con IA' : 'Generar mi sitio con IA'}
      </button>
    </form>
  )
}
