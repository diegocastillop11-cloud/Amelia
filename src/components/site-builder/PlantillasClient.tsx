'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SiteRenderer } from '@/components/site-builder/templates/SiteRenderer'
import type { TemplateId } from '@/components/site-builder/templates/SiteRenderer'
import type { SiteContent } from '@/types/database'

const TEMPLATES = [
  { id: 'moderna',     label: 'Moderna',     free: true  },
  { id: 'clasica',     label: 'Clásica',     free: true  },
  { id: 'minimalista', label: 'Minimalista', free: true  },
  { id: 'vibrante',    label: 'Vibrante',    free: true  },
  { id: 'bold',        label: 'Bold',        free: true  },
  { id: 'sunset',      label: 'Sunset',      free: true  },
  { id: 'glass',       label: 'Glass',       free: false },
  { id: 'elegante',    label: 'Elegante',    free: false },
  { id: 'dark',        label: 'Dark',        free: false },
]

const THUMB_BG: Record<string, string> = {
  dark:      '#0a0a0f',
  vibrante:  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  sunset:    'linear-gradient(135deg,#f97316,#ec4899)',
  glass:     'linear-gradient(135deg,#0f172a,#1e1b4b)',
  bold:      '#111827',
  elegante:  '#faf9f7',
}

function makeDefaultContent(name: string): SiteContent {
  return {
    hero: {
      title: `Bienvenidos a ${name}`,
      subtitle: 'Somos expertos comprometidos con tu satisfacción. Agenda tu cita en minutos, sin llamadas ni esperas.',
      cta: 'Reservar hora',
    },
    about: {
      text: 'Nuestro equipo profesional está listo para atenderte con la mejor calidad y dedicación. Más de 5 años de experiencia nos respaldan. Nos especializamos en brindarte una atención personalizada y resultados que superan tus expectativas.',
    },
    services: [
      { name: 'Servicio Premium', description: 'Atención personalizada de primer nivel con los mejores resultados', price: '$25.000' },
      { name: 'Servicio Estándar', description: 'La opción perfecta para el día a día con excelente relación calidad-precio', price: '$15.000' },
      { name: 'Consultoría', description: 'Asesoría experta para tus necesidades específicas', price: '$20.000' },
    ],
    reviews: [
      { author: 'María González', rating: 5, text: 'Excelente atención, quedé muy satisfecha con el resultado. Definitivamente volvería.' },
      { author: 'Carlos Pérez', rating: 5, text: 'Profesionales de primera. El mejor servicio que he recibido.' },
    ],
    contact: { cta: 'Reservar ahora' },
    footer: { tagline: 'Tu bienestar es nuestra prioridad · Santiago, Chile' },
  }
}

export default function PlantillasClient({
  businessId,
  currentTemplate,
  content,
  color,
  name,
  logo,
  cover,
}: {
  businessId: string | null
  currentTemplate: string
  content: SiteContent | null
  color: string
  name: string
  logo: string | null
  cover: string | null
}) {
  const router = useRouter()
  const [selected, setSelected] = useState(currentTemplate)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  const previewContent = content ?? makeDefaultContent(name)
  const previewTemplate = TEMPLATES.find(t => t.id === preview)

  const handleSelect = async (id: string) => {
    if (!businessId) return
    setSelected(id); setSaving(true); setSaved(false)

    await fetch('/api/save-site', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_id: businessId, template_id: id }),
    })

    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  const applyFromPreview = async () => {
    if (!preview) return
    await handleSelect(preview)
    setPreview(null)
  }

  return (
    <>
      {saved && (
        <p className="text-sm mb-4" style={{ color: '#6ee7b7' }}>✓ Plantilla guardada</p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {TEMPLATES.map(t => (
          <button
            key={t.id}
            onClick={() => setPreview(t.id)}
            disabled={saving}
            className="text-left transition-all group"
            style={{
              border: `2px solid ${selected === t.id ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 16,
              overflow: 'hidden',
              background: selected === t.id ? 'rgba(99,102,241,0.08)' : 'var(--bg-surface)',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {/* Thumbnail */}
            <div style={{
              height: 144,
              background: THUMB_BG[t.id] ?? '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid var(--border)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{ width: '70%', display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ height: 8, borderRadius: 3, background: color, width: '55%' }} />
                <div style={{ height: 3, borderRadius: 2, background: 'rgba(128,128,128,0.3)' }} />
                <div style={{ height: 3, borderRadius: 2, background: 'rgba(128,128,128,0.18)', width: '80%' }} />
                <div style={{ height: 3, borderRadius: 2, background: 'rgba(128,128,128,0.12)', width: '65%' }} />
                <div style={{ height: 28, borderRadius: 6, background: color, width: '45%', marginTop: 6, opacity: 0.9 }} />
              </div>
              {/* Hover overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0, transition: 'opacity 0.2s',
              }}
                className="group-hover:opacity-100"
              >
                <span style={{
                  background: 'white', color: '#111827',
                  padding: '6px 16px', borderRadius: 20,
                  fontSize: 12, fontWeight: 700,
                }}>Vista previa</span>
              </div>
            </div>

            {/* Info */}
            <div className="p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{t.label}</p>
                {selected === t.id
                  ? <span style={{ color: 'var(--accent-light)', fontSize: 11, fontWeight: 700 }}>✓ Activa</span>
                  : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Ver →</span>
                }
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {t.free ? 'Gratuita' : 'Pro'}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* ── MODAL VISTA PREVIA ── */}
      {preview && previewTemplate && (
        <div
          onClick={() => setPreview(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.78)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(8px)',
            padding: '1.25rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-base)',
              borderRadius: 20,
              width: '100%',
              maxWidth: 1100,
              height: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
            }}
          >
            {/* Modal header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '1rem 1.5rem',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0,
            }}>
              <div>
                <p style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 2px', fontSize: '1rem' }}>
                  Plantilla {previewTemplate.label}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                  {content ? 'Simulación con tu contenido real' : 'Simulación con contenido de ejemplo'}
                  {' · '}{previewTemplate.free ? 'Gratuita' : 'Pro'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {/* Nav prev/next */}
                <button
                  onClick={() => {
                    const idx = TEMPLATES.findIndex(t => t.id === preview)
                    setPreview(TEMPLATES[(idx - 1 + TEMPLATES.length) % TEMPLATES.length].id)
                  }}
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >←</button>
                <button
                  onClick={() => {
                    const idx = TEMPLATES.findIndex(t => t.id === preview)
                    setPreview(TEMPLATES[(idx + 1) % TEMPLATES.length].id)
                  }}
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >→</button>

                <div style={{ width: 1, height: 28, background: 'var(--border)' }} />

                <button
                  onClick={() => setPreview(null)}
                  style={{
                    padding: '0.4375rem 1rem',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  Cerrar
                </button>

                {selected === preview ? (
                  <span style={{
                    padding: '0.4375rem 1rem',
                    borderRadius: 8,
                    background: 'rgba(99,102,241,0.15)',
                    color: 'var(--accent-light)',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                  }}>✓ Plantilla activa</span>
                ) : (
                  <button
                    onClick={applyFromPreview}
                    disabled={saving}
                    style={{
                      padding: '0.4375rem 1.125rem',
                      borderRadius: 8,
                      background: 'var(--accent)',
                      color: 'white',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      cursor: saving ? 'not-allowed' : 'pointer',
                      border: 'none',
                      opacity: saving ? 0.6 : 1,
                    }}
                  >
                    {saving ? 'Guardando…' : 'Usar esta plantilla'}
                  </button>
                )}
              </div>
            </div>

            {/* Browser chrome */}
            <div style={{
              padding: '0.5rem 1rem',
              background: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 8,
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
              </div>
              <div style={{
                flex: 1, height: 24, borderRadius: 5,
                background: 'var(--bg-base)',
                border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', paddingLeft: 10,
                fontSize: 11, color: 'var(--text-muted)',
              }}>
                tudominio.amelia.cl
              </div>
            </div>

            {/* Scaled preview */}
            <div style={{ flex: 1, overflow: 'auto', background: '#1a1a2e' }}>
              {/* zoom affects layout (unlike transform:scale) so scrolling works correctly */}
              <div style={{ minWidth: 1440, pointerEvents: 'none', zoom: '0.56' } as React.CSSProperties}>
                <SiteRenderer
                  content={previewContent}
                  color={color}
                  template={preview as TemplateId}
                  name={name}
                  logo={logo}
                  cover={cover}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
