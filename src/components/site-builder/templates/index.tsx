import type { SiteContent } from '@/types/database'

export interface TemplateProps {
  content: SiteContent
  color: string
  name: string
  logo?: string | null
  cover?: string | null
  gallery?: string[]
  editMode?: boolean
  onEdit?: (path: string, value: string) => void
}

// ── Helper: texto editable inline ───────────────────────────
function Editable({
  value, path, onEdit, tag = 'span', className = '', style = {},
  placeholder = 'Clic para editar...'
}: {
  value: string; path: string; onEdit?: (path: string, value: string) => void
  tag?: string; className?: string; style?: React.CSSProperties; placeholder?: string
}) {
  if (!onEdit) {
    const Tag = tag as keyof JSX.IntrinsicElements
    return <Tag className={className} style={style}>{value}</Tag>
  }
  const Tag = tag as keyof JSX.IntrinsicElements
  return (
    <Tag
      contentEditable suppressContentEditableWarning
      className={className}
      style={{
        ...style,
        outline: 'none',
        borderRadius: '4px',
        cursor: 'text',
        transition: 'all 0.15s',
      }}
      onFocus={e => {
        ;(e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.08)'
        ;(e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 2px rgba(99,102,241,0.4)'
      }}
      onBlur={e => {
        const el = e.currentTarget as HTMLElement
        el.style.background = ''
        el.style.boxShadow = ''
        onEdit(path, el.innerText)
      }}
      onMouseEnter={e => {
        if (document.activeElement !== e.currentTarget) {
          ;(e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.05)'
        }
      }}
      onMouseLeave={e => {
        if (document.activeElement !== e.currentTarget) {
          ;(e.currentTarget as HTMLElement).style.background = ''
        }
      }}
    >
      {value || placeholder}
    </Tag>
  )
}

// ── Sección de reseñas (compartida) ─────────────────────────
function ReviewsSection({ content, color }: { content: SiteContent; color: string }) {
  if (!content.reviews || content.reviews.length === 0) return null
  return (
    <div style={{ padding: '4rem 2rem', background: '#f9fafb' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827',
                   textAlign: 'center', marginBottom: '2rem' }}>
        Lo que dicen nuestros clientes
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',
                    gap: '1rem', maxWidth: '960px', margin: '0 auto' }}>
        {content.reviews.map((r, i) => (
          <div key={i} style={{ background: 'white', border: '1px solid #f0f0f0',
                                borderRadius: '16px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.875rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>
                {r.author?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div>
                <p style={{ fontWeight: 700, color: '#111827', fontSize: '0.9375rem' }}>{r.author}</p>
                <p style={{ color: '#f59e0b', fontSize: '0.875rem' }}>{'★'.repeat(r.rating ?? 5)}</p>
              </div>
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.7, fontStyle: 'italic' }}>
              "{r.text}"
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Galería (compartida) ─────────────────────────────────────
function GallerySection({ gallery, color }: { gallery?: string[]; color: string }) {
  if (!gallery || gallery.length === 0) return null
  return (
    <div style={{ padding: '4rem 2rem', background: 'white' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827',
                   textAlign: 'center', marginBottom: '2rem' }}>
        Nuestros trabajos
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))',
                    gap: '0.75rem', maxWidth: '960px', margin: '0 auto' }}>
        {gallery.map((url, i) => (
          <div key={i} style={{ aspectRatio: '1', borderRadius: '12px', overflow: 'hidden' }}>
            <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// T1: MODERNA — Hero centrado + imagen
// ══════════════════════════════════════════════════════════════
export function TemplateModerna({ content, color, name, logo, cover, gallery, editMode, onEdit }: TemplateProps) {
  return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: '#fff', minHeight: '100vh' }}>
      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '1rem 2rem', background: 'white', borderBottom: '1px solid #f0f0f0',
                    position: 'sticky', top: 0, zIndex: 10 }}>
        {logo
          ? <img src={logo} alt="Logo" style={{ height: '36px', objectFit: 'contain' }} />
          : <span style={{ fontWeight: 800, fontSize: '1.125rem', color: '#111827' }}>{name}</span>}
        <a href="#contacto" style={{ background: color, color: 'white', padding: '0.5rem 1.25rem',
                                     borderRadius: '8px', fontSize: '0.875rem', fontWeight: 700,
                                     textDecoration: 'none' }}>
          {content.contact.cta}
        </a>
      </nav>

      {/* Hero */}
      <div style={{ padding: '5rem 2rem', textAlign: 'center', position: 'relative', overflow: 'hidden',
                    background: cover ? `linear-gradient(rgba(0,0,0,0.5),rgba(0,0,0,0.4)), url(${cover}) center/cover` : `linear-gradient(135deg,${color}15,${color}05)` }}>
        {!cover && <div style={{ position: 'absolute', inset: 0, opacity: 0.25,
                                  backgroundImage: `radial-gradient(${color}50 1px,transparent 1px)`,
                                  backgroundSize: '24px 24px' }} />}
        <div style={{ position: 'relative', maxWidth: '700px', margin: '0 auto' }}>
          <span style={{ display: 'inline-block', background: cover ? 'rgba(255,255,255,0.15)' : `${color}20`,
                          color: cover ? 'white' : color, border: `1px solid ${cover ? 'rgba(255,255,255,0.3)' : color+'40'}`,
                          padding: '0.25rem 1rem', borderRadius: '20px',
                          fontSize: '0.75rem', fontWeight: 700, marginBottom: '1.5rem' }}>
            {name}
          </span>
          <Editable value={content.hero.title} path="hero.title" onEdit={onEdit} tag="h1"
            style={{ fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 800,
                     color: cover ? 'white' : '#111827', lineHeight: 1.15, marginBottom: '1rem', display: 'block' }} />
          <Editable value={content.hero.subtitle} path="hero.subtitle" onEdit={onEdit} tag="p"
            style={{ fontSize: '1.125rem', color: cover ? 'rgba(255,255,255,0.85)' : '#6b7280',
                     marginBottom: '2.5rem', lineHeight: 1.7, display: 'block' }} />
          <Editable value={content.hero.cta} path="hero.cta" onEdit={onEdit} tag="span"
            style={{ display: 'inline-block', background: cover ? 'white' : color,
                     color: cover ? color : 'white', padding: '1rem 2.5rem',
                     borderRadius: '12px', fontWeight: 700, fontSize: '1rem',
                     boxShadow: `0 8px 30px ${color}40`, cursor: editMode ? 'text' : 'pointer' }} />
        </div>
      </div>

      {/* About */}
      <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'white' }}>
        <div style={{ width: '48px', height: '4px', background: color, borderRadius: '2px', margin: '0 auto 1.5rem' }} />
        <Editable value={content.about.text} path="about.text" onEdit={onEdit} tag="p"
          style={{ color: '#6b7280', lineHeight: 1.8, fontSize: '1.0625rem',
                   maxWidth: '650px', margin: '0 auto', display: 'block' }} />
      </div>

      {/* Services */}
      <div style={{ padding: '4rem 2rem', background: '#f9fafb' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827',
                     textAlign: 'center', marginBottom: '2.5rem' }}>Servicios</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
                      gap: '1.25rem', maxWidth: '960px', margin: '0 auto' }}>
          {content.services.map((s, i) => (
            <div key={i} style={{ background: 'white', border: '1px solid #f0f0f0',
                                  borderRadius: '16px', padding: '1.5rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${color}20`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '4px', background: color }} />
              </div>
              <p style={{ fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>{s.name}</p>
              <p style={{ color: '#9ca3af', fontSize: '0.875rem', lineHeight: 1.6 }}>{s.description}</p>
              {s.price && <p style={{ color, fontWeight: 700, marginTop: '0.75rem' }}>{s.price}</p>}
            </div>
          ))}
        </div>
      </div>

      <GallerySection gallery={gallery} color={color} />
      <ReviewsSection content={content} color={color} />

      {/* Contact */}
      <div id="contacto" style={{ padding: '4rem 2rem', textAlign: 'center',
                                   background: `linear-gradient(135deg,${color}10,${color}05)` }}>
        <Editable value={content.contact.cta} path="contact.cta" onEdit={onEdit} tag="h2"
          style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827',
                   marginBottom: '1rem', display: 'block' }} />
        <a href="mailto:contacto@negocio.com"
           style={{ display: 'inline-block', background: color, color: 'white',
                    padding: '1rem 2.5rem', borderRadius: '12px', fontWeight: 700,
                    textDecoration: 'none', boxShadow: `0 8px 30px ${color}40` }}>
          Contáctanos →
        </a>
      </div>

      {/* Footer */}
      <div style={{ background: '#111827', color: 'white', padding: '2.5rem 2rem', textAlign: 'center' }}>
        <p style={{ fontWeight: 700, marginBottom: '0.375rem' }}>{name}</p>
        <Editable value={content.footer.tagline} path="footer.tagline" onEdit={onEdit} tag="p"
          style={{ color: '#9ca3af', fontSize: '0.875rem', display: 'block' }} />
        <p style={{ color: '#374151', fontSize: '0.75rem', marginTop: '1rem' }}>
          Sitio creado con <span style={{ color }}>Amelia</span>
        </p>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// T2: OSCURA — Dark premium
// ══════════════════════════════════════════════════════════════
export function TemplateOscura({ content, color, name, logo, cover, gallery, editMode, onEdit }: TemplateProps) {
  return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: '#0a0a0f', minHeight: '100vh' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '1.25rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {logo
          ? <img src={logo} alt="Logo" style={{ height: '32px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
          : <span style={{ fontWeight: 800, color: 'white', fontSize: '1.125rem' }}>{name}</span>}
        <a href="#contacto" style={{ background: `linear-gradient(135deg,${color},${color}cc)`,
                                     color: 'white', padding: '0.5rem 1.25rem',
                                     borderRadius: '8px', fontSize: '0.875rem', fontWeight: 700,
                                     textDecoration: 'none', boxShadow: `0 4px 16px ${color}50` }}>
          {content.contact.cta}
        </a>
      </nav>

      {/* Hero */}
      <div style={{ padding: '6rem 2rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: cover
          ? `linear-gradient(rgba(0,0,0,0.7),rgba(0,0,0,0.8)), url(${cover}) center/cover`
          : `radial-gradient(ellipse at 50% 0%, ${color}25 0%, transparent 60%)` }} />
        <div style={{ position: 'relative', maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px',
                          background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)',
                          padding: '0.25rem 1rem', borderRadius: '20px',
                          fontSize: '0.75rem', fontWeight: 600, marginBottom: '1.5rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
            {name}
          </span>
          <Editable value={content.hero.title} path="hero.title" onEdit={onEdit} tag="h1"
            style={{ fontSize: 'clamp(2.25rem,5vw,3.5rem)', fontWeight: 800, color: 'white',
                     lineHeight: 1.1, marginBottom: '1.25rem', display: 'block' }} />
          <Editable value={content.hero.subtitle} path="hero.subtitle" onEdit={onEdit} tag="p"
            style={{ fontSize: '1.125rem', color: 'rgba(255,255,255,0.6)',
                     marginBottom: '2.5rem', lineHeight: 1.7, display: 'block' }} />
          <Editable value={content.hero.cta} path="hero.cta" onEdit={onEdit} tag="span"
            style={{ display: 'inline-block', background: `linear-gradient(135deg,${color},${color}bb)`,
                     color: 'white', padding: '1rem 2.5rem', borderRadius: '12px', fontWeight: 700,
                     boxShadow: `0 8px 30px ${color}50`, cursor: editMode ? 'text' : 'pointer' }} />
        </div>
      </div>

      {/* About */}
      <div style={{ padding: '4rem 2rem', textAlign: 'center',
                    background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ width: '40px', height: '3px', background: color, borderRadius: '2px', margin: '0 auto 1.5rem' }} />
        <Editable value={content.about.text} path="about.text" onEdit={onEdit} tag="p"
          style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, fontSize: '1.0625rem',
                   maxWidth: '600px', margin: '0 auto', display: 'block' }} />
      </div>

      {/* Services */}
      <div style={{ padding: '4rem 2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white',
                     textAlign: 'center', marginBottom: '2.5rem' }}>Servicios</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
                      gap: '1rem', maxWidth: '960px', margin: '0 auto' }}>
          {content.services.map((s, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)',
                                  border: '1px solid rgba(255,255,255,0.07)',
                                  borderRadius: '16px', padding: '1.5rem',
                                  transition: 'all 0.2s' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px',
                            background: `${color}20`, border: `1px solid ${color}30`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: color }} />
              </div>
              <p style={{ fontWeight: 700, color: 'white', marginBottom: '0.5rem' }}>{s.name}</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', lineHeight: 1.6 }}>{s.description}</p>
              {s.price && <p style={{ color, fontWeight: 700, marginTop: '0.75rem' }}>{s.price}</p>}
            </div>
          ))}
        </div>
      </div>

      <GallerySection gallery={gallery} color={color} />
      <ReviewsSection content={content} color={color} />

      {/* Footer */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '2.5rem 2rem', textAlign: 'center' }}>
        <p style={{ fontWeight: 700, color: 'white', marginBottom: '0.375rem' }}>{name}</p>
        <Editable value={content.footer.tagline} path="footer.tagline" onEdit={onEdit} tag="p"
          style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem', display: 'block' }} />
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// T3: ELEGANTE — Serif luxury con imagen lateral
// ══════════════════════════════════════════════════════════════
export function TemplateElegante({ content, color, name, logo, cover, gallery, editMode, onEdit }: TemplateProps) {
  return (
    <div style={{ fontFamily: "'Georgia',serif", background: '#faf9f7', minHeight: '100vh' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '1.25rem 3rem', background: 'white', borderBottom: '1px solid #e8e4de' }}>
        {logo
          ? <img src={logo} alt="Logo" style={{ height: '40px', objectFit: 'contain' }} />
          : <span style={{ fontFamily: "'Georgia',serif", fontWeight: 700, fontSize: '1.25rem', color: '#1c1917' }}>{name}</span>}
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.875rem', color: '#78716c', cursor: 'pointer' }}>Servicios</span>
          <span style={{ fontSize: '0.875rem', color: '#78716c', cursor: 'pointer' }}>Nosotros</span>
          <a href="#contacto" style={{ border: `1.5px solid #1c1917`, color: '#1c1917',
                                       padding: '0.5rem 1.25rem', fontSize: '0.8125rem', fontWeight: 700,
                                       letterSpacing: '0.05em', textTransform: 'uppercase', textDecoration: 'none' }}>
            Contactar
          </a>
        </div>
      </nav>

      {/* Hero split */}
      <div style={{ display: 'grid', gridTemplateColumns: cover ? '1fr 1fr' : '1fr',
                    minHeight: '520px', maxWidth: cover ? '100%' : '900px', margin: '0 auto' }}>
        <div style={{ padding: '5rem 3rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ width: '40px', height: '3px', background: color, marginBottom: '1.5rem' }} />
          <Editable value={content.hero.title} path="hero.title" onEdit={onEdit} tag="h1"
            style={{ fontFamily: "'Georgia',serif", fontSize: 'clamp(2rem,4vw,3rem)',
                     fontWeight: 700, color: '#1c1917', lineHeight: 1.25, marginBottom: '1.25rem', display: 'block' }} />
          <Editable value={content.hero.subtitle} path="hero.subtitle" onEdit={onEdit} tag="p"
            style={{ fontSize: '1.0625rem', color: '#78716c', lineHeight: 1.8,
                     marginBottom: '2.5rem', display: 'block' }} />
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Editable value={content.hero.cta} path="hero.cta" onEdit={onEdit} tag="span"
              style={{ display: 'inline-block', background: '#1c1917', color: 'white',
                       padding: '0.875rem 2rem', fontSize: '0.8125rem', fontWeight: 700,
                       letterSpacing: '0.05em', textTransform: 'uppercase', cursor: editMode ? 'text' : 'pointer' }} />
          </div>
        </div>
        {cover && (
          <div style={{ background: `url(${cover}) center/cover`, minHeight: '400px' }} />
        )}
      </div>

      {/* About */}
      <div style={{ padding: '5rem 3rem', background: 'white', textAlign: 'center' }}>
        <h2 style={{ fontFamily: "'Georgia',serif", fontSize: '1.75rem', fontWeight: 700,
                     color: '#1c1917', marginBottom: '1.25rem' }}>{name}</h2>
        <Editable value={content.about.text} path="about.text" onEdit={onEdit} tag="p"
          style={{ color: '#78716c', lineHeight: 1.9, fontSize: '1.0625rem',
                   maxWidth: '600px', margin: '0 auto', display: 'block' }} />
      </div>

      {/* Services */}
      <div style={{ padding: '5rem 3rem' }}>
        <h2 style={{ fontFamily: "'Georgia',serif", fontSize: '1.5rem', fontWeight: 700,
                     color: '#1c1917', textAlign: 'center', marginBottom: '3rem',
                     letterSpacing: '0.02em' }}>Nuestros servicios</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
                      gap: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
          {content.services.map((s, i) => (
            <div key={i} style={{ padding: '2rem', borderTop: `2px solid ${color}`, background: 'white' }}>
              <p style={{ fontFamily: "'Georgia',serif", fontWeight: 700, color: '#1c1917',
                          marginBottom: '0.75rem', fontSize: '1.0625rem' }}>{s.name}</p>
              <p style={{ color: '#a8a29e', fontSize: '0.875rem', lineHeight: 1.7 }}>{s.description}</p>
              {s.price && <p style={{ color, fontWeight: 700, marginTop: '1rem', fontSize: '1.0625rem' }}>{s.price}</p>}
            </div>
          ))}
        </div>
      </div>

      <GallerySection gallery={gallery} color={color} />
      <ReviewsSection content={content} color={color} />

      <div style={{ padding: '3rem', textAlign: 'center', background: '#1c1917', color: 'white' }}>
        <p style={{ fontFamily: "'Georgia',serif", fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.5rem' }}>{name}</p>
        <Editable value={content.footer.tagline} path="footer.tagline" onEdit={onEdit} tag="p"
          style={{ color: '#78716c', fontSize: '0.875rem', display: 'block' }} />
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// T4: MINIMALISTA — Mucho espacio, tipografía protagonista
// ══════════════════════════════════════════════════════════════
export function TemplateMinimalista({ content, color, name, logo, cover, gallery, onEdit }: TemplateProps) {
  return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: 'white', minHeight: '100vh' }}>
      <nav style={{ padding: '1.5rem 3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {logo
          ? <img src={logo} alt="Logo" style={{ height: '28px', objectFit: 'contain' }} />
          : <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af',
                            letterSpacing: '0.2em', textTransform: 'uppercase' }}>{name}</span>}
        <a href="#contacto" style={{ fontSize: '0.8125rem', color: '#6b7280', textDecoration: 'none' }}>
          Contacto →
        </a>
      </nav>

      {/* Hero */}
      <div style={{ padding: '6rem 3rem 4rem', maxWidth: '800px' }}>
        {cover && (
          <div style={{ height: '280px', borderRadius: '16px', overflow: 'hidden',
                        marginBottom: '3rem', background: `url(${cover}) center/cover` }} />
        )}
        <Editable value={content.hero.title} path="hero.title" onEdit={onEdit} tag="h1"
          style={{ fontSize: 'clamp(2.5rem,6vw,4.5rem)', fontWeight: 800, color: '#111827',
                   lineHeight: 1.05, marginBottom: '1.5rem', display: 'block',
                   letterSpacing: '-0.02em' }} />
        <span style={{ display: 'inline-block', width: '48px', height: '4px',
                        background: color, borderRadius: '2px', marginBottom: '1.5rem' }} />
        <Editable value={content.hero.subtitle} path="hero.subtitle" onEdit={onEdit} tag="p"
          style={{ fontSize: '1.125rem', color: '#9ca3af', lineHeight: 1.7,
                   marginBottom: '2.5rem', maxWidth: '500px', display: 'block' }} />
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Editable value={content.hero.cta} path="hero.cta" onEdit={onEdit} tag="span"
            style={{ display: 'inline-block', background: '#111827', color: 'white',
                     padding: '0.875rem 2rem', borderRadius: '8px', fontWeight: 700 }} />
          <span style={{ color: '#d1d5db', fontSize: '1.25rem' }}>|</span>
          <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Sin compromiso</span>
        </div>
      </div>

      {/* Services como lista limpia */}
      <div style={{ padding: '4rem 3rem', background: '#f9fafb' }}>
        <div style={{ maxWidth: '700px' }}>
          <h2 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af',
                       letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '2rem' }}>
            Lo que hacemos
          </h2>
          {content.services.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                                  padding: '1.25rem 0', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, color: '#111827', marginBottom: '0.25rem' }}>{s.name}</p>
                <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>{s.description}</p>
              </div>
              {s.price && <span style={{ color, fontWeight: 700, marginLeft: '1rem', flexShrink: 0 }}>{s.price}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* About */}
      <div style={{ padding: '5rem 3rem', maxWidth: '600px' }}>
        <Editable value={content.about.text} path="about.text" onEdit={onEdit} tag="p"
          style={{ color: '#6b7280', lineHeight: 1.9, fontSize: '1.125rem', display: 'block' }} />
      </div>

      <GallerySection gallery={gallery} color={color} />
      <ReviewsSection content={content} color={color} />

      <div id="contacto" style={{ padding: '4rem 3rem', borderTop: '1px solid #f0f0f0' }}>
        <Editable value={content.footer.tagline} path="footer.tagline" onEdit={onEdit} tag="p"
          style={{ color: '#9ca3af', fontSize: '0.875rem', display: 'block' }} />
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// T5: VIBRANTE — Gradiente full, energética
// ══════════════════════════════════════════════════════════════
export function TemplateVibrante({ content, color, name, logo, cover, gallery, editMode, onEdit }: TemplateProps) {
  const color2 = color + 'bb'
  return (
    <div style={{ fontFamily: "'Inter',sans-serif", minHeight: '100vh' }}>
      {/* Hero con gradiente completo */}
      <div style={{ background: cover
        ? `linear-gradient(135deg,${color}ee,${color2}dd), url(${cover}) center/cover`
        : `linear-gradient(135deg, ${color} 0%, ${color2} 100%)`,
        padding: '2rem 2rem 5rem', minHeight: '520px' }}>
        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4rem' }}>
          {logo
            ? <img src={logo} alt="Logo" style={{ height: '36px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
            : <span style={{ fontWeight: 800, color: 'white', fontSize: '1.25rem' }}>{name}</span>}
          <a href="#contacto" style={{ background: 'rgba(255,255,255,0.2)', color: 'white',
                                       padding: '0.5rem 1.25rem', borderRadius: '20px',
                                       fontSize: '0.875rem', fontWeight: 700, textDecoration: 'none',
                                       backdropFilter: 'blur(10px)' }}>
            {content.contact.cta}
          </a>
        </nav>
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
          <Editable value={content.hero.title} path="hero.title" onEdit={onEdit} tag="h1"
            style={{ fontSize: 'clamp(2.5rem,6vw,3.5rem)', fontWeight: 900, color: 'white',
                     lineHeight: 1.1, marginBottom: '1.25rem', display: 'block' }} />
          <Editable value={content.hero.subtitle} path="hero.subtitle" onEdit={onEdit} tag="p"
            style={{ fontSize: '1.125rem', color: 'rgba(255,255,255,0.8)',
                     marginBottom: '2.5rem', lineHeight: 1.7, display: 'block' }} />
          <Editable value={content.hero.cta} path="hero.cta" onEdit={onEdit} tag="span"
            style={{ display: 'inline-block', background: 'white', color,
                     padding: '1rem 2.5rem', borderRadius: '50px', fontWeight: 800,
                     fontSize: '1rem', cursor: editMode ? 'text' : 'pointer' }} />
        </div>
      </div>

      {/* Services cards flotantes */}
      <div style={{ padding: '0 2rem', marginTop: '-2.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
                      gap: '1rem', maxWidth: '960px', margin: '0 auto' }}>
          {content.services.map((s, i) => (
            <div key={i} style={{ background: 'white', borderRadius: '16px', padding: '1.5rem',
                                  boxShadow: '0 10px 40px rgba(0,0,0,0.12)' }}>
              <p style={{ fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>{s.name}</p>
              <p style={{ color: '#9ca3af', fontSize: '0.8125rem', lineHeight: 1.5 }}>{s.description}</p>
              {s.price && <p style={{ color, fontWeight: 800, marginTop: '0.75rem', fontSize: '1.0625rem' }}>{s.price}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* About */}
      <div style={{ padding: '4rem 2rem', textAlign: 'center', background: '#f9fafb' }}>
        <Editable value={content.about.text} path="about.text" onEdit={onEdit} tag="p"
          style={{ color: '#6b7280', lineHeight: 1.8, fontSize: '1.0625rem',
                   maxWidth: '600px', margin: '0 auto', display: 'block' }} />
      </div>

      <GallerySection gallery={gallery} color={color} />
      <ReviewsSection content={content} color={color} />

      <div style={{ background: `linear-gradient(135deg,${color},${color2})`,
                    padding: '3rem 2rem', textAlign: 'center' }}>
        <p style={{ fontWeight: 800, color: 'white', fontSize: '1.125rem', marginBottom: '0.375rem' }}>{name}</p>
        <Editable value={content.footer.tagline} path="footer.tagline" onEdit={onEdit} tag="p"
          style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', display: 'block' }} />
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// T6: TECH — Stats, datos, confianza
// ══════════════════════════════════════════════════════════════
export function TemplateTech({ content, color, name, logo, cover, gallery, editMode, onEdit }: TemplateProps) {
  return (
    <div style={{ fontFamily: "'Inter',sans-serif", background: '#0d0d16', minHeight: '100vh' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '1.25rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {logo
          ? <img src={logo} alt="Logo" style={{ height: '32px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
          : <span style={{ fontWeight: 800, color: 'white', fontSize: '1rem', letterSpacing: '-0.01em' }}>{name}</span>}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ background: `${color}20`, color, border: `1px solid ${color}40`,
                          padding: '0.25rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
            Nuevo
          </span>
          <a href="#contacto" style={{ background: `linear-gradient(135deg,${color},${color}cc)`,
                                       color: 'white', padding: '0.5rem 1.25rem',
                                       borderRadius: '8px', fontSize: '0.875rem', fontWeight: 700,
                                       textDecoration: 'none' }}>
            Comenzar
          </a>
        </div>
      </nav>

      {/* Hero grid */}
      <div style={{ display: 'grid', gridTemplateColumns: cover ? '1fr 1fr' : '1fr',
                    gap: '3rem', padding: '5rem 2rem', alignItems: 'center',
                    maxWidth: '1100px', margin: '0 auto' }}>
        <div>
          <Editable value={content.hero.title} path="hero.title" onEdit={onEdit} tag="h1"
            style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 800, color: 'white',
                     lineHeight: 1.15, marginBottom: '1.25rem', display: 'block' }} />
          <Editable value={content.hero.subtitle} path="hero.subtitle" onEdit={onEdit} tag="p"
            style={{ fontSize: '1.0625rem', color: 'rgba(255,255,255,0.5)',
                     lineHeight: 1.7, marginBottom: '2.5rem', display: 'block' }} />
          <Editable value={content.hero.cta} path="hero.cta" onEdit={onEdit} tag="span"
            style={{ display: 'inline-block', background: `linear-gradient(135deg,${color},${color}cc)`,
                     color: 'white', padding: '1rem 2rem', borderRadius: '10px', fontWeight: 700,
                     boxShadow: `0 8px 30px ${color}50`, cursor: editMode ? 'text' : 'pointer' }} />
        </div>
        {cover
          ? <div style={{ borderRadius: '16px', overflow: 'hidden', border: `1px solid ${color}30` }}>
              <img src={cover} alt="Portada" style={{ width: '100%', display: 'block' }} />
            </div>
          : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {['200+\nClientes', '5★\nCalificación', '10+\nAños', '24/7\nSoporte'].map((stat, i) => {
                const [val, label] = stat.split('\n')
                return (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid rgba(255,255,255,0.07)',
                                        borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '1.5rem', fontWeight: 800, color, marginBottom: '0.25rem' }}>{val}</p>
                    <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.4)' }}>{label}</p>
                  </div>
                )
              })}
            </div>
          )
        }
      </div>

      {/* About */}
      <div style={{ padding: '4rem 2rem', borderTop: '1px solid rgba(255,255,255,0.06)',
                    textAlign: 'center' }}>
        <Editable value={content.about.text} path="about.text" onEdit={onEdit} tag="p"
          style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.8,
                   maxWidth: '600px', margin: '0 auto', display: 'block' }} />
      </div>

      {/* Services */}
      <div style={{ padding: '4rem 2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
                      gap: '1px', background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px',
                      overflow: 'hidden', maxWidth: '960px', margin: '0 auto' }}>
          {content.services.map((s, i) => (
            <div key={i} style={{ background: '#0d0d16', padding: '1.75rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%',
                            background: color, marginBottom: '1rem' }} />
              <p style={{ fontWeight: 700, color: 'white', marginBottom: '0.5rem' }}>{s.name}</p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem', lineHeight: 1.6 }}>{s.description}</p>
              {s.price && <p style={{ color, fontWeight: 700, marginTop: '0.875rem' }}>{s.price}</p>}
            </div>
          ))}
        </div>
      </div>

      <GallerySection gallery={gallery} color={color} />
      <ReviewsSection content={content} color={color} />

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)',
                    padding: '2.5rem 2rem', textAlign: 'center' }}>
        <p style={{ fontWeight: 700, color: 'white', marginBottom: '0.375rem' }}>{name}</p>
        <Editable value={content.footer.tagline} path="footer.tagline" onEdit={onEdit} tag="p"
          style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.875rem', display: 'block' }} />
      </div>
    </div>
  )
}

// ── Mapa de plantillas ────────────────────────────────────────
export const TEMPLATES = {
  moderna:     { name: 'Moderna',     component: TemplateModerna,     desc: 'Limpia · Profesional · Con imagen' },
  oscura:      { name: 'Oscura',      component: TemplateOscura,      desc: 'Premium · Impactante · Nocturna' },
  elegante:    { name: 'Elegante',    component: TemplateElegante,    desc: 'Serif · Luxury · Sofisticada' },
  minimalista: { name: 'Minimalista', component: TemplateMinimalista, desc: 'Limpia · Sin ruido · Directa' },
  vibrante:    { name: 'Vibrante',    component: TemplateVibrante,    desc: 'Colorida · Juvenil · Enérgica' },
  tech:        { name: 'Tech',        component: TemplateTech,        desc: 'Moderna · Stats · Confianza' },
} as const

export type TemplateId = keyof typeof TEMPLATES
