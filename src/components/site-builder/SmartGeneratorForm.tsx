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

const GENERATING_MSGS_STANDARD = [
  'Leyendo todo lo que nos diste...',
  'Analizando el negocio con IA...',
  'Extrayendo servicios y tono...',
  'Seleccionando las mejores reseñas...',
  'Creando el contenido del sitio...',
  'Diseñando las secciones...',
  'Verificando el guardado...',
]

const GENERATING_MSGS_PREMIUM = [
  'Analizando el negocio en profundidad...',
  'Diseñando la identidad visual...',
  'Creando el hero de alto impacto...',
  'Generando secciones de servicios y precios...',
  'Escribiendo FAQ y testimonios...',
  'Optimizando el diseño para móvil...',
  'Finalizando el código HTML/CSS...',
  'Guardando el sitio...',
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
  type ServiceItem = { name: string; description: string; price: string; featured?: boolean }
  const existingServices = ((existingBusiness?.sites?.[0]?.content as { services?: ServiceItem[] } | null)?.services ?? []) as ServiceItem[]

  const [state, setState] = useState<GeneratorState>({
    freeText: existingBusiness?.description ?? '',
    // No pre-cargar name/category: Claude los extrae del freeText
    // así el usuario puede regenerar con info completamente distinta
    name: '',
    slug: '',
    category: '',
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

  const isPremiumExisting = !!(existingBusiness?.sites?.[0]?.content as { htmlSite?: string } | null)?.htmlSite
  const [mode, setMode]                   = useState<'standard' | 'premium'>(isPremiumExisting ? 'premium' : 'standard')
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

    const msgs = mode === 'premium' ? GENERATING_MSGS_PREMIUM : GENERATING_MSGS_STANDARD
    let i = 0
    setGenMsg(msgs[0])
    const interval = setInterval(() => {
      i = (i + 1) % msgs.length
      setGenMsg(msgs[i])
    }, mode === 'premium' ? 3500 : 1800)

    try {
      const endpoint = mode === 'premium' ? '/api/ai/generate-site-premium' : '/api/ai/generate-site'
      const res = await fetch(endpoint, {
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
          existingServices,
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
          {businessId && !generatedContent?.htmlSite && (
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
          {generatedContent.htmlSite && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(99,102,241,0.2)', color: 'var(--accent-light)', fontSize: '0.625rem' }}>
              PREMIUM
            </span>
          )}
        </div>

        {/* Premium: iframe directo */}
        {generatedContent.htmlSite ? (
          <iframe
            srcDoc={generatedContent.htmlSite}
            style={{ width: '100%', height: '520px', border: 'none', display: 'block' }}
            title="Preview del sitio premium"
            sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
          />
        ) : (
          /* Estándar: preview simplificado */
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

            {/* Footer */}
            <div style={{ background: '#111827', padding: '2rem', textAlign: 'center' }}>
              <p style={{ fontWeight: 700, color: 'white', marginBottom: '0.25rem' }}>{state.name}</p>
              <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>{generatedContent.footer.tagline}</p>
            </div>
          </div>
        )}
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

      {/* Selector de modo */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            id: 'standard' as const,
            icon: '🎨',
            title: 'Estándar',
            desc: 'Con editor visual para personalizar después',
            badge: '',
          },
          {
            id: 'premium' as const,
            icon: '⚡',
            title: 'Premium',
            desc: 'HTML/CSS completo. Diseño de agencia profesional',
            badge: 'RECOMENDADO',
          },
        ].map(m => (
          <button key={m.id} type="button" onClick={() => setMode(m.id)}
                  className="text-left p-4 rounded-xl transition-all relative"
                  style={{
                    background: mode === m.id ? 'rgba(99,102,241,0.12)' : 'var(--bg-surface)',
                    border: `2px solid ${mode === m.id ? 'var(--accent)' : 'var(--border)'}`,
                    boxShadow: mode === m.id ? '0 0 20px rgba(99,102,241,0.15)' : 'none',
                  }}>
            {m.badge && (
              <span className="absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--accent)', color: 'white', fontSize: '0.625rem' }}>
                {m.badge}
              </span>
            )}
            <div className="text-2xl mb-2">{m.icon}</div>
            <p className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{m.title}</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{m.desc}</p>
          </button>
        ))}
      </div>

      {/* Textarea principal — protagonista */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Cuéntanos sobre tu negocio
            </h3>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Escribe o pega cualquier información — descripción, servicios, precios, horarios, redes sociales, reseñas de Google. Cuanto más detalles, mejor el resultado.
            </p>
          </div>
          <span className="badge-free text-xs ml-4 shrink-0">IA</span>
        </div>
        <textarea
          value={state.freeText}
          onChange={e => update({ freeText: e.target.value })}
          rows={10}
          placeholder={`Ejemplo — pega o escribe libremente:

Barbería El Navajero, llevamos 8 años en La Florida, Santiago.
Especialistas en cortes clásicos y fade. Atendemos de lunes a sábado de 10:00 a 20:00.

Servicios:
- Corte de cabello: $8.000
- Corte + barba: $12.000
- Afeitado clásico: $7.000

WhatsApp: +56 9 8765 4321
Instagram: @elnavajero_scl
Dirección: Av. Vicuña Mackenna 1234, La Florida

"Juan P. ⭐⭐⭐⭐⭐ - El mejor barbero del barrio, muy prolijo y rápido"`}
          className="input-field resize-none text-sm"
          style={{ minHeight: '220px', lineHeight: 1.7 }}
        />
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            💡 La IA genera automáticamente: servicios, beneficios, FAQ, precios, pasos y contacto
          </p>
          {state.freeText.length > 0 && (
            <span className="text-xs mono" style={{ color: 'var(--text-muted)' }}>
              {state.freeText.length} caracteres
            </span>
          )}
        </div>
      </div>

      {/* Opciones adicionales colapsadas */}
      <div className="card p-5">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Color principal
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => update({ primary_color: c })}
                        className="w-7 h-7 rounded-lg transition-all"
                        style={{ background: c,
                                  border: state.primary_color === c ? '3px solid var(--accent-light)' : '2px solid rgba(255,255,255,0.1)',
                                  transform: state.primary_color === c ? 'scale(1.2)' : undefined,
                                  boxShadow: state.primary_color === c ? `0 0 12px ${c}88` : 'none' }} />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              URL del sitio <span style={{ color: 'var(--text-muted)' }}>(opcional)</span>
            </label>
            <div className="flex items-center rounded-xl overflow-hidden"
                 style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border)' }}>
              <span className="px-2 py-2.5 text-xs mono shrink-0"
                    style={{ color: 'var(--text-muted)', borderRight: '1px solid var(--border)', fontSize: '0.7rem' }}>
                /sitio/
              </span>
              <input type="text" value={state.slug} onChange={e => update({ slug: e.target.value })}
                     placeholder="la-ia-lo-genera"
                     style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)',
                               outline: 'none', padding: '0.625rem 0.5rem', fontSize: '0.75rem',
                               fontFamily: 'JetBrains Mono, monospace', width: '100%' }} />
            </div>
          </div>
        </div>

        {/* Imágenes */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            Imágenes <span style={{ color: 'var(--text-muted)' }}>(opcionales)</span>
          </label>
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
          <div className="flex gap-2">
            {[
              { label: '🏷 Logo', imgState: state.logo, ref: logoRef },
              { label: '🖼 Portada', imgState: state.coverImage, ref: coverRef },
              { label: `📸 Galería${state.galleryImages.length > 0 ? ` (${state.galleryImages.length})` : ''}`, imgState: null, ref: galleryRef },
            ].map(item => (
              <button key={item.label} type="button" onClick={() => item.ref.current?.click()}
                      className="flex-1 py-2.5 rounded-xl text-xs font-medium transition-all"
                      style={{
                        background: item.imgState ? 'rgba(99,102,241,0.1)' : 'var(--bg-elevated)',
                        border: `1.5px dashed ${item.imgState ? 'var(--accent)' : 'var(--border)'}`,
                        color: item.imgState ? 'var(--accent-light)' : 'var(--text-muted)',
                      }}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button type="submit" className="btn-primary w-full py-4 text-base">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        {existingBusiness?.sites?.[0] ? 'Regenerar sitio con IA' : 'Generar mi sitio con IA →'}
      </button>
    </form>
  )
}
