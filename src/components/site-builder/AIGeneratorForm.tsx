'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SiteContent } from '@/types/database'

const CATEGORIES = [
  'Barbería','Pastelería','Clínica','Restaurante','Cafetería',
  'Salón de belleza','Gimnasio','Veterinaria','Tienda de ropa',
  'Ferretería','Consultora','Agencia de marketing','Otro',
]

const TONES = [
  { value: 'profesional y confiable',    label: 'Profesional',    desc: 'Serio, formal, genera confianza' },
  { value: 'cercano y amigable',         label: 'Amigable',       desc: 'Cálido, cercano, como un amigo' },
  { value: 'moderno y juvenil',          label: 'Moderno',        desc: 'Fresco, dinámico, directo' },
  { value: 'elegante y exclusivo',       label: 'Elegante',       desc: 'Premium, sofisticado, aspiracional' },
]

const COLORS = [
  { value: '#6366f1', label: 'Índigo' },
  { value: '#8b5cf6', label: 'Violeta' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#10b981', label: 'Esmeralda' },
  { value: '#f59e0b', label: 'Ámbar' },
  { value: '#ef4444', label: 'Rojo' },
  { value: '#1e40af', label: 'Azul' },
  { value: '#111827', label: 'Negro' },
]

interface Props {
  existingBusiness?: {
    id: string
    name: string
    slug: string
    category: string
    description: string | null
    primary_color: string | null
    is_published: boolean
    sites?: { content: SiteContent | null; status: string }[]
  } | null
}

type Step = 'form' | 'generating' | 'preview'

export default function AIGeneratorForm({ existingBusiness }: Props) {
  const router = useRouter()

  const [form, setForm] = useState({
    name:          existingBusiness?.name ?? '',
    slug:          existingBusiness?.slug ?? '',
    category:      existingBusiness?.category ?? '',
    description:   existingBusiness?.description ?? '',
    primary_color: existingBusiness?.primary_color ?? '#6366f1',
    tone:          'profesional y confiable',
    services:      '',
  })

  const [step, setStep]                   = useState<Step>(
    existingBusiness?.sites?.[0]?.content ? 'preview' : 'form'
  )
  const [error, setError]                 = useState<string | null>(null)
  const [generatedContent, setGenerated]  = useState<SiteContent | null>(
    existingBusiness?.sites?.[0]?.content ?? null
  )
  const [businessId, setBusinessId]       = useState<string | null>(existingBusiness?.id ?? null)
  const [publishing, setPublishing]       = useState(false)
  const [published, setPublished]         = useState(existingBusiness?.is_published ?? false)
  const [generatingMsg, setGeneratingMsg] = useState('')

  const msgs = [
    'Analizando tu negocio...',
    'Creando el contenido con IA...',
    'Diseñando las secciones...',
    'Redactando los textos...',
    'Revisando el resultado...',
    'Últimos toques...',
  ]

  const generateSlug = (name: string) =>
    name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setStep('generating')

    // Rotar mensajes de generación
    let i = 0
    setGeneratingMsg(msgs[0])
    const interval = setInterval(() => {
      i = (i + 1) % msgs.length
      setGeneratingMsg(msgs[i])
    }, 1800)

    try {
      const res = await fetch('/api/ai/generate-site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      clearInterval(interval)

      if (!res.ok) {
        setError(data.error ?? 'Error al generar el sitio')
        setStep('form')
        return
      }

      setGenerated(data.content)
      setBusinessId(data.business.id)
      setStep('preview')
      router.refresh()
    } catch {
      clearInterval(interval)
      setError('Error de conexión. Intenta nuevamente.')
      setStep('form')
    }
  }

  const handlePublish = async () => {
    if (!businessId) return
    setPublishing(true)
    const res = await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_id: businessId }),
    })
    if (res.ok) { setPublished(true); router.refresh() }
    setPublishing(false)
  }

  // ── STEP: GENERATING ──────────────────────────────────────────
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
        {/* Anillo pulsante */}
        <div className="absolute inset-0 rounded-2xl animate-ping opacity-20"
             style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }} />
      </div>

      <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
        Generando tu sitio web
      </h2>
      <p className="text-sm mb-8 transition-all duration-500" style={{ color: 'var(--text-secondary)' }}>
        {generatingMsg}
      </p>

      {/* Progress bar */}
      <div className="w-64 h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
        <div className="h-full rounded-full animate-pulse"
             style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', width: '70%' }} />
      </div>
    </div>
  )

  // ── STEP: PREVIEW ─────────────────────────────────────────────
  if (step === 'preview' && generatedContent) return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full" style={{ background: published ? '#10b981' : '#f59e0b' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {published ? 'Publicado' : 'Vista previa generada'}
          </span>
          {published && (
            <a href={`/sitio/${form.slug}`} target="_blank"
               className="text-xs mono" style={{ color: 'var(--accent-light)' }}>
              /sitio/{form.slug} ↗
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setStep('form')} className="btn-ghost text-xs">
            ← Editar datos
          </button>
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
            <span className="badge-success">✓ En vivo</span>
          )}
        </div>
      </div>

      {/* Preview del sitio renderizado */}
      <div className="card overflow-hidden">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-3"
             style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: '#ef4444' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: '#f59e0b' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: '#10b981' }} />
          </div>
          <div className="flex-1 mx-3 px-3 py-1 rounded-md text-xs mono text-center"
               style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
            amelia.app/sitio/{form.slug}
          </div>
        </div>

        {/* Site preview */}
        <div style={{ fontFamily: 'Inter, sans-serif' }}>
          {/* Hero */}
          <div className="px-8 py-16 text-center text-white relative overflow-hidden"
               style={{ background: `linear-gradient(135deg, ${form.primary_color}dd, ${form.primary_color}99)` }}>
            <div className="absolute inset-0 opacity-10"
                 style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            <div className="relative">
              <h1 className="text-3xl font-bold mb-3 text-white">{generatedContent.hero.title}</h1>
              <p className="text-lg mb-6 opacity-85 max-w-xl mx-auto">{generatedContent.hero.subtitle}</p>
              <span className="inline-block px-6 py-3 rounded-full font-semibold text-sm cursor-default"
                    style={{ background: 'white', color: form.primary_color }}>
                {generatedContent.hero.cta}
              </span>
            </div>
          </div>

          {/* About */}
          <div className="px-8 py-10 text-center" style={{ background: '#fafafa' }}>
            <h2 className="text-xl font-bold mb-3 text-gray-900">{form.name}</h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-sm leading-relaxed">
              {generatedContent.about.text}
            </p>
          </div>

          {/* Services */}
          <div className="px-8 py-10" style={{ background: 'white' }}>
            <h2 className="text-xl font-bold text-center mb-6 text-gray-900">Nuestros servicios</h2>
            <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
              {generatedContent.services.slice(0, 4).map((s, i) => (
                <div key={i} className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                  <div className="w-8 h-8 rounded-lg mb-3 flex items-center justify-center"
                       style={{ background: `${form.primary_color}20` }}>
                    <div className="w-3 h-3 rounded-sm" style={{ background: form.primary_color }} />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{s.name}</h3>
                  <p className="text-gray-500 text-xs">{s.description}</p>
                  {s.price && (
                    <p className="text-sm font-bold mt-2" style={{ color: form.primary_color }}>{s.price}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 text-center text-white"
               style={{ background: form.primary_color }}>
            <p className="font-semibold">{form.name}</p>
            <p className="text-sm opacity-75 mt-1">{generatedContent.footer.tagline}</p>
          </div>
        </div>
      </div>

      {/* Content cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Hero
          </p>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            {generatedContent.hero.title}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {generatedContent.hero.subtitle}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Tagline
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            "{generatedContent.footer.tagline}"
          </p>
        </div>
      </div>
    </div>
  )

  // ── STEP: FORM ────────────────────────────────────────────────
  return (
    <form onSubmit={handleGenerate} className="space-y-6">
      {error && (
        <div className="alert-error">
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}

      {/* Sección 1: Info básica */}
      <div className="card p-6 space-y-4">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Información del negocio
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Nombre del negocio *
            </label>
            <input
              type="text" value={form.name} required
              onChange={e => setForm(f => ({
                ...f, name: e.target.value,
                slug: existingBusiness ? f.slug : generateSlug(e.target.value)
              }))}
              placeholder="Ej: Barbería El Corte"
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              URL del sitio *
            </label>
            <div className="flex items-center rounded-xl overflow-hidden"
                 style={{ background: 'var(--bg-elevated)', border: '1.5px solid var(--border)' }}>
              <span className="px-3 text-xs mono shrink-0" style={{
                color: 'var(--text-muted)',
                borderRight: '1px solid var(--border)',
                padding: '0.75rem 0.75rem',
              }}>
                /sitio/
              </span>
              <input
                type="text" value={form.slug} required
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="mi-negocio"
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)',
                         outline: 'none', padding: '0.75rem', fontSize: '0.875rem',
                         fontFamily: 'JetBrains Mono, monospace', width: '100%' }}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Rubro *
          </label>
          <select value={form.category} required
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="input-field"
                  style={{ appearance: 'none', cursor: 'pointer' }}>
            <option value="">Selecciona el rubro...</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Descripción del negocio *
          </label>
          <textarea
            value={form.description} required rows={3}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Describe tu negocio: qué haces, quiénes son tus clientes, qué te hace especial..."
            className="input-field resize-none"
          />
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Cuanto más detallado, mejor será el resultado de la IA.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Servicios o productos principales
            <span className="ml-1.5 font-normal" style={{ color: 'var(--text-muted)' }}>(opcional)</span>
          </label>
          <input
            type="text" value={form.services}
            onChange={e => setForm(f => ({ ...f, services: e.target.value }))}
            placeholder="Ej: Corte de pelo, Afeitado, Tratamiento de barba"
            className="input-field"
          />
        </div>
      </div>

      {/* Sección 2: Personalización */}
      <div className="card p-6 space-y-5">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Personalización
        </h3>

        {/* Color */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            Color principal del sitio
          </label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button key={c.value} type="button"
                      onClick={() => setForm(f => ({ ...f, primary_color: c.value }))}
                      title={c.label}
                      className="w-9 h-9 rounded-xl transition-all hover:scale-110"
                      style={{
                        background: c.value,
                        border: form.primary_color === c.value
                          ? '3px solid var(--accent-light)'
                          : '2px solid rgba(255,255,255,0.1)',
                        transform: form.primary_color === c.value ? 'scale(1.15)' : undefined,
                        boxShadow: form.primary_color === c.value
                          ? `0 0 16px ${c.value}88` : 'none',
                      }} />
            ))}
          </div>
        </div>

        {/* Tono */}
        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            Tono de comunicación
          </label>
          <div className="grid grid-cols-2 gap-2">
            {TONES.map(t => (
              <button key={t.value} type="button"
                      onClick={() => setForm(f => ({ ...f, tone: t.value }))}
                      className="p-3 rounded-xl text-left transition-all"
                      style={{
                        background: form.tone === t.value ? 'rgba(99,102,241,0.12)' : 'var(--bg-elevated)',
                        border: form.tone === t.value ? '1.5px solid rgba(99,102,241,0.4)' : '1.5px solid var(--border)',
                      }}>
                <p className="text-xs font-semibold" style={{ color: form.tone === t.value ? 'var(--accent-light)' : 'var(--text-primary)' }}>
                  {t.label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{t.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preview del color elegido */}
      <div className="rounded-xl p-4 flex items-center gap-4"
           style={{ background: `${form.primary_color}15`, border: `1px solid ${form.primary_color}30` }}>
        <div className="w-10 h-10 rounded-xl shrink-0" style={{ background: form.primary_color }} />
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            Tu sitio usará este color
          </p>
          <p className="text-xs mono" style={{ color: 'var(--text-muted)' }}>{form.primary_color}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Tono</p>
          <p className="text-xs font-medium capitalize" style={{ color: 'var(--text-secondary)' }}>
            {TONES.find(t => t.value === form.tone)?.label}
          </p>
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
