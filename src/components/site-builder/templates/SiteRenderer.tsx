import type React from 'react'
import type { SiteContent } from '@/types/database'

const LOGO_SIZE_MAP: Record<string,number> = { sm:32, md:52, lg:70, xl:96 }

function galleryFrameStyle(frame: string, color: string): React.CSSProperties {
  switch(frame) {
    case 'square':   return { borderRadius:0,    overflow:'hidden', aspectRatio:'1' }
    case 'circle':   return { borderRadius:'50%', overflow:'hidden', aspectRatio:'1', boxShadow:'0 4px 20px rgba(0,0,0,0.25)' }
    case 'shadow':   return { borderRadius:12,   overflow:'hidden', aspectRatio:'1', boxShadow:'0 20px 60px rgba(0,0,0,0.55)' }
    case 'border':   return { borderRadius:12,   overflow:'hidden', aspectRatio:'1', outline:`3px solid ${color}`, outlineOffset:3 }
    case 'polaroid': return { background:'white', padding:'8px 8px 36px', borderRadius:4, boxShadow:'0 8px 32px rgba(0,0,0,0.35)' }
    default:         return { borderRadius:16,   overflow:'hidden', aspectRatio:'1', boxShadow:'0 4px 16px rgba(0,0,0,0.12)' }
  }
}
function galleryImgStyle(frame: string): React.CSSProperties {
  return frame==='polaroid'
    ? { width:'100%', height:180, objectFit:'cover', display:'block', borderRadius:2 }
    : { width:'100%', height:'100%', objectFit:'cover' }
}
function logoImgStyle(shape: string, size: number): React.CSSProperties {
  const base: React.CSSProperties = { height:size, objectFit:'contain', display:'block' }
  if (shape==='circle')  return { ...base, width:size, borderRadius:'50%', objectFit:'cover' }
  if (shape==='rounded') return { ...base, maxWidth:size*4, borderRadius:Math.round(size*0.18) }
  if (shape==='square')  return { ...base, width:size, objectFit:'cover', borderRadius:4 }
  return { ...base, maxWidth:size*4 }
}

export type TemplateId =
  | 'moderna' | 'clasica' | 'dark' | 'vibrante' | 'elegante' | 'minimalista'
  | 'bold' | 'sunset' | 'glass'

export interface Service {
  name: string; description: string; price: string; image?: string
}

export interface SiteRendererProps {
  content: SiteContent; color: string; template: TemplateId
  name: string; logo?: string | null; cover?: string | null
  gallery?: string[]; fontFamily?: string
}

function getTheme(tpl: TemplateId, color: string, hasCover: boolean) {
  const dark  = tpl === 'dark'
  const vib   = tpl === 'vibrante' || tpl === 'sunset'
  const eleg  = tpl === 'elegante'
  const mini  = tpl === 'minimalista'
  const bold  = tpl === 'bold'
  const glass = tpl === 'glass'
  const over  = hasCover || dark || vib || glass
  return {
    dark, vib, eleg, mini, bold, glass, over,
    pageBg: dark   ? '#0a0a0f'
           : vib   ? `linear-gradient(160deg, ${color}ee, ${color}99)`
           : glass ? `linear-gradient(135deg, #0f172a, #1e1b4b)`
           : bold  ? '#111827'
           : eleg  ? '#faf9f7'
           : '#fff',
    fg:     (over || bold) ? 'white' : '#111827',
    muted:  dark   ? 'rgba(255,255,255,0.5)'
           : (vib || glass || bold) ? 'rgba(255,255,255,0.72)'
           : '#6b7280',
    border: (dark || glass || bold) ? 'rgba(255,255,255,0.1)' : '#f0f0f0',
    sectBg: dark   ? 'rgba(255,255,255,0.02)'
           : glass ? 'rgba(255,255,255,0.05)'
           : bold  ? 'rgba(255,255,255,0.04)'
           : vib   ? 'rgba(0,0,0,0.08)'
           : '#f9fafb',
    navBg:  dark   ? 'rgba(0,0,0,0.65)'
           : glass ? 'rgba(255,255,255,0.08)'
           : (vib || bold) ? 'rgba(0,0,0,0.15)'
           : 'white',
  }
}

const ctaScript = `
window.__ameliaOpen = function(service) {
  var btn = document.getElementById('amelia-trigger');
  if (btn) { window.__ameliaService = service||null; btn.click(); }
};
window.__ameliaLightbox = function(src) {
  var lb = document.getElementById('amelia-lb');
  if (!lb) return;
  lb.querySelector('img').src = src;
  lb.style.display = 'flex';
  document.body.style.overflow = 'hidden';
};
window.__ameliaLbClose = function() {
  var lb = document.getElementById('amelia-lb');
  if (lb) { lb.style.display = 'none'; document.body.style.overflow = ''; }
};
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') window.__ameliaLbClose?.();
});`

export function SiteRenderer({
  content, color, template, name, logo, cover, gallery = [],
  fontFamily = 'Inter, sans-serif',
}: SiteRendererProps) {
  const hasCover = !!(cover && cover.trim().length > 5)
  const t = getTheme(template, color, hasCover)

  // Optional theme overrides from content.theme (set in editor)
  const themeH  = content.theme?.headingColor
  const themeT  = content.theme?.textColor
  const themeBg = content.theme?.bgColor
  const fg      = themeH ?? t.fg
  const muted   = themeT ?? t.muted
  const pageBgOverride = themeBg ?? t.pageBg

  // Logo customization
  const logoSz    = LOGO_SIZE_MAP[content.theme?.logoSize ?? 'md']
  const logoSh    = content.theme?.logoShape ?? 'default'
  const galFrame  = content.theme?.galleryFrame ?? 'rounded'
  const needsBg   = t.dark || t.vib || t.glass || t.bold

  const heroBg = hasCover
    ? `linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.45)), url(${cover}) center/cover no-repeat`
    : t.dark  ? `radial-gradient(ellipse at 50% 0%, ${color}35, transparent 70%)`
    : t.glass ? `radial-gradient(ellipse at 30% 20%, ${color}40, transparent 60%), radial-gradient(ellipse at 70% 80%, ${color}20, transparent 60%)`
    : t.bold  ? `linear-gradient(135deg, #111827 0%, #1f2937 100%)`
    : t.vib   ? `linear-gradient(135deg, ${color}, ${color}aa)`
    : t.mini  ? 'white'
    : `linear-gradient(135deg, ${color}18, ${color}06)`

  const ctaBg = t.over ? 'white' : color
  const ctaFg = t.over ? color   : 'white'
  const openAmelia = `onclick="window.__ameliaOpen?.(null)"`
  const openSvc    = (s: string) => `onclick="window.__ameliaOpen?.('${s.replace(/'/g, "\\'")}')"`

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: ctaScript }} />
      <div style={{ fontFamily, background: pageBgOverride, minHeight: '100vh', color: fg }}>

        {/* ── NAV ── */}
        <nav style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: t.mini ? '1.25rem 3rem' : '0.875rem 2rem',
          background: t.mini ? 'transparent' : t.navBg,
          borderBottom: (t.mini || t.bold || t.glass) ? 'none' : `1px solid ${t.border}`,
          backdropFilter: (t.dark || t.vib || t.glass || t.bold) ? 'blur(16px)' : 'none',
          position: 'sticky', top: 0, zIndex: 10,
          boxShadow: (t.glass || t.bold) ? '0 1px 0 rgba(255,255,255,0.08)' : 'none',
        }}>
          {logo
            ? (
              <div style={{
                display: 'inline-flex', alignItems: 'center',
                padding: needsBg ? '5px 8px' : 0,
                background: needsBg ? 'rgba(255,255,255,0.14)' : 'transparent',
                borderRadius: needsBg ? 10 : 0,
                backdropFilter: needsBg ? 'blur(4px)' : 'none',
              }}>
                <img src={logo} alt={name} style={logoImgStyle(logoSh, logoSz)} />
              </div>
            )
            : <span style={{
                fontWeight: t.mini ? 400 : 800,
                fontSize: t.mini ? '0.75rem' : t.bold ? '1.25rem' : '1.0625rem',
                color: t.fg,
                textTransform: t.mini ? 'uppercase' : 'none',
                letterSpacing: t.mini ? '0.15em' : t.bold ? '-0.02em' : 'normal',
              }}>{name}</span>
          }
          <span dangerouslySetInnerHTML={{ __html:
            `<span ${openAmelia} style="background:${t.mini ? 'transparent' : ctaBg};color:${t.mini ? t.muted : ctaFg};padding:${t.mini ? '0' : '0.5rem 1.25rem'};border-radius:8px;font-size:0.875rem;font-weight:700;cursor:pointer;display:inline-block;transition:opacity 0.15s" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">${content.contact?.cta ?? 'Reservar'}</span>`
          }} />
        </nav>

        {/* ── HERO ── */}
        <div style={{ background: heroBg, padding: t.mini ? '5rem 3rem' : t.bold ? '6rem 2rem' : '5rem 2rem',
                      position: 'relative', overflow: 'hidden' }}>
          {/* Dot grid para moderna */}
          {!hasCover && !t.dark && !t.vib && !t.mini && !t.bold && !t.glass && (
            <div style={{ position: 'absolute', inset: 0, opacity: 0.15, pointerEvents: 'none',
                          backgroundImage: `radial-gradient(${color}80 1px, transparent 1px)`,
                          backgroundSize: '28px 28px' }} />
          )}
          {/* Glassmorphism blob */}
          {t.glass && (
            <>
              <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '60%', height: '60%', borderRadius: '50%',
                             background: `radial-gradient(${color}50, transparent 70%)`, filter: 'blur(60px)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '50%', height: '50%', borderRadius: '50%',
                             background: `radial-gradient(${color}30, transparent 70%)`, filter: 'blur(60px)', pointerEvents: 'none' }} />
            </>
          )}

          <div style={{ position: 'relative', maxWidth: t.mini ? '640px' : '760px',
                        margin: t.mini ? '0' : '0 auto', textAlign: t.mini ? 'left' : 'center' }}>

            {/* Logo en hero — solo si no hay logo en nav ya visible, o si tiene cover */}
            {logo && (hasCover || t.bold || t.glass) && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: needsBg ? '6px 10px' : 0,
                  background: needsBg ? 'rgba(255,255,255,0.14)' : 'transparent',
                  borderRadius: needsBg ? 12 : 0,
                  backdropFilter: needsBg ? 'blur(4px)' : 'none',
                }}>
                  <img src={logo} alt={name} style={{
                    ...logoImgStyle(logoSh, logoSz * 1.3 | 0),
                    filter: t.over ? 'drop-shadow(0 2px 12px rgba(0,0,0,0.3))' : 'none',
                  }} />
                </div>
              </div>
            )}

            {/* Badge nombre */}
            {!t.mini && !t.bold && (
              <div style={{ display: 'inline-block', marginBottom: '1.25rem',
                             background: t.over ? 'rgba(255,255,255,0.18)' : `${color}18`,
                             border: `1px solid ${t.over ? 'rgba(255,255,255,0.3)' : color+'30'}`,
                             padding: '3px 16px', borderRadius: 20, backdropFilter: 'blur(4px)' }}>
                <span style={{ fontSize: 11, fontWeight: 700,
                                color: t.over ? 'rgba(255,255,255,0.9)' : color }}>{name}</span>
              </div>
            )}

            <h1 style={{
              fontSize: t.mini ? 'clamp(2.5rem,5vw,4rem)'
                       : t.bold ? 'clamp(2.5rem,6vw,4.5rem)'
                       : t.glass ? 'clamp(2rem,5vw,3.5rem)'
                       : 'clamp(1.875rem,4vw,2.875rem)',
              fontWeight: 900, lineHeight: 1.08,
              color: themeH ?? (t.over || t.bold || t.glass ? 'white' : '#111827'),
              marginBottom: '1rem',
              letterSpacing: (t.mini || t.bold) ? '-0.03em' : 'normal',
              fontFamily: t.eleg ? 'Georgia, serif' : 'inherit',
            }}>
              {content.hero.title}
            </h1>

            {t.mini && <div style={{ width: 48, height: 4, background: color, borderRadius: 2, marginBottom: '1.25rem' }} />}
            {t.bold && <div style={{ width: 64, height: 4, background: color, borderRadius: 2, margin: '0 auto 1.5rem' }} />}

            <p style={{
              fontSize: t.mini ? '1.125rem' : '1.0625rem',
              color: muted,
              marginBottom: '2.25rem', lineHeight: 1.75,
              maxWidth: t.mini ? '500px' : '600px',
              margin: t.mini ? '0 0 2rem' : '0 auto 2.25rem',
            }}>
              {content.hero.subtitle}
            </p>

            <span dangerouslySetInnerHTML={{ __html:
              `<span ${openAmelia} style="display:inline-block;background:${ctaBg};color:${ctaFg};padding:0.9rem 2.5rem;border-radius:${t.bold?'6px':'12px'};font-weight:700;font-size:1rem;box-shadow:0 6px 24px ${color}45;cursor:pointer;transition:transform 0.15s,box-shadow 0.15s;letter-spacing:${t.bold?'-0.01em':'normal'}" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 12px 32px ${color}55'" onmouseout="this.style.transform='';this.style.boxShadow='0 6px 24px ${color}45'">${content.hero.cta}</span>`
            }} />
            {t.mini && <span style={{ fontSize: '0.875rem', color: t.muted, marginLeft: '1rem' }}>Sin compromiso</span>}
          </div>
        </div>

        {/* ── NOSOTROS ── */}
        <div style={{
          padding: t.mini ? '4rem 3rem' : '4.5rem 2rem',
          textAlign: t.mini ? 'left' : 'center',
          background: t.dark   ? '#0d0d14'
                    : t.vib   ? 'rgba(0,0,0,0.12)'
                    : t.glass ? 'rgba(255,255,255,0.04)'
                    : t.bold  ? 'rgba(255,255,255,0.03)'
                    : 'white',
        }}>
          {!t.mini && !t.bold && <div style={{ width: 44, height: 3, background: color, borderRadius: 2, margin: '0 auto 1.25rem' }} />}
          {t.bold && <p style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color, marginBottom: '0.75rem', textAlign: 'center' }}>QUIÉNES SOMOS</p>}
          <p style={{
            color: muted, lineHeight: 1.9, fontSize: '1.0625rem',
            maxWidth: '680px', margin: t.mini ? '0' : '0 auto',
          }}>
            {content.about.text}
          </p>
        </div>

        {/* ── SERVICIOS ── */}
        <div style={{ padding: t.mini ? '3rem 3rem' : '4rem 2rem', background: t.sectBg }}>
          {t.mini ? (
            <div style={{ maxWidth: '700px' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 800, color: t.muted,
                           letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
                Lo que hacemos
              </p>
              {(content.services as Service[]).map((s, i) => (
                <div key={i} dangerouslySetInnerHTML={{ __html:
                  `<div ${openSvc(s.name)} style="display:flex;justify-content:space-between;align-items:flex-start;padding:1.25rem 8px;border-bottom:1px solid ${t.border};cursor:pointer;transition:background 0.15s;border-radius:8px;margin-left:-8px" onmouseover="this.style.background='${color}08'" onmouseout="this.style.background='transparent'">
                     <div style="flex:1"><p style="font-weight:700;color:#111827;margin:0 0 0.25rem">${s.name}</p><p style="color:${t.muted};font-size:0.875rem;margin:0">${s.description}</p></div>
                     ${s.price ? `<span style="color:${color};font-weight:700;margin-left:1.5rem;flex-shrink:0">${s.price}</span>` : ''}
                   </div>`
                }} />
              ))}
            </div>
          ) : (
            <>
              {!t.bold && <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: fg, margin: '0 0 0.5rem',
                              fontFamily: t.eleg ? 'Georgia, serif' : 'inherit' }}>Servicios</h2>
                <p style={{ color: t.muted, fontSize: 13, margin: 0 }}>Haz clic en un servicio para reservar</p>
              </div>}
              {t.bold && <p style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color, marginBottom: '2rem', textAlign: 'center' }}>LO QUE HACEMOS</p>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))',
                             gap: '1.25rem', maxWidth: '960px', margin: '0 auto' }}>
                {(content.services as Service[]).map((s, i) => {
                  const cardBg  = t.dark  ? 'rgba(255,255,255,0.04)'
                                : t.glass ? 'rgba(255,255,255,0.07)'
                                : t.bold  ? 'rgba(255,255,255,0.06)'
                                : t.vib   ? 'rgba(255,255,255,0.15)' : 'white'
                  const cardBrd = (t.dark || t.glass || t.bold) ? 'rgba(255,255,255,0.1)' : '#f0f0f0'
                  const fg2     = (t.dark || t.vib || t.glass || t.bold) ? 'white' : '#111827'
                  return (
                    <div key={i} dangerouslySetInnerHTML={{ __html:
                      `<div ${openSvc(s.name)} style="background:${cardBg};border:1px solid ${cardBrd};border-radius:16px;overflow:hidden;cursor:pointer;transition:transform 0.18s,box-shadow 0.18s;backdrop-filter:blur(4px)" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 12px 32px rgba(0,0,0,0.15)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
                          ${s.image ? `<div style="height:140px;background:url('${s.image}') center/cover no-repeat"></div>` : `<div style="height:6px;background:${color}"></div>`}
                          <div style="padding:1.125rem 1.25rem">
                            <p style="font-weight:700;color:${fg2};margin:0 0 0.375rem;font-size:0.9375rem">${s.name}</p>
                            <p style="color:${t.muted};font-size:0.8125rem;line-height:1.6;margin:0 0 ${s.price?'0.625rem':'0.75rem'}">${s.description}</p>
                            ${s.price ? `<p style="color:${color};font-weight:800;font-size:1rem;margin:0 0 0.75rem">${s.price}</p>` : ''}
                            <div style="display:inline-flex;align-items:center;gap:4px;background:${color}18;color:${color};padding:5px 13px;border-radius:20px;font-size:11px;font-weight:700">Reservar →</div>
                          </div>
                        </div>`
                    }} />
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* ── GALERÍA ── */}
        {gallery.length > 0 && (
          <div style={{ padding: '4rem 2rem', background: t.dark ? '#0d0d14' : t.glass ? 'rgba(255,255,255,0.03)' : t.bold ? 'rgba(255,255,255,0.02)' : 'white' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', marginBottom: '2.5rem', color: fg }}>
              Nuestros trabajos
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))',
                           gap: galFrame === 'polaroid' ? '1.5rem' : '0.75rem', maxWidth: '960px', margin: '0 auto' }}>
              {gallery.map((url, i) => {
                const frameS = galleryFrameStyle(galFrame, color)
                const imgS   = galleryImgStyle(galFrame)
                const fStr   = Object.entries(frameS).map(([k,v])=>`${k.replace(/([A-Z])/g,'-$1').toLowerCase()}:${v}`).join(';')
                const iStr   = Object.entries(imgS).map(([k,v])=>`${k.replace(/([A-Z])/g,'-$1').toLowerCase()}:${v}`).join(';')
                return (
                  <div key={i} dangerouslySetInnerHTML={{ __html:
                    `<div onclick="window.__ameliaLightbox('${url.replace(/'/g,"\\'")}')"
                          style="${fStr};cursor:zoom-in;transition:transform 0.2s,box-shadow 0.2s"
                          onmouseover="this.style.transform='scale(1.03)';this.style.zIndex='1'"
                          onmouseout="this.style.transform='';this.style.zIndex=''">
                       <img src="${url}" alt="" style="${iStr}" loading="lazy" />
                     </div>`
                  }} />
                )
              })}
            </div>
          </div>
        )}

        {/* ── RESEÑAS ── */}
        {content.reviews && content.reviews.length > 0 && (
          <div style={{ padding: '4rem 2rem', background: t.sectBg }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', marginBottom: '2.5rem', color: fg }}>
              Lo que dicen nuestros clientes
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))',
                           gap: '1.25rem', maxWidth: '960px', margin: '0 auto' }}>
              {content.reviews.map((r, i) => (
                <div key={i} style={{
                  background: (t.dark || t.glass || t.bold) ? 'rgba(255,255,255,0.05)' : 'white',
                  border: `1px solid ${t.border}`, borderRadius: 16, padding: '1.625rem',
                  backdropFilter: (t.glass || t.bold) ? 'blur(8px)' : 'none',
                }}>
                  <p style={{ color: '#f59e0b', fontSize: '1.125rem', margin: '0 0 0.875rem', letterSpacing: 2 }}>
                    {'★'.repeat(r.rating ?? 5)}
                  </p>
                  <p style={{ color: t.muted, fontSize: '0.9375rem', lineHeight: 1.75, fontStyle: 'italic', margin: '0 0 1rem' }}>
                    "{r.text}"
                  </p>
                  <p style={{ fontWeight: 700, color: t.fg, fontSize: '0.875rem', margin: 0 }}>{r.author}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CONTACTO CTA ── */}
        {(() => {
          const c = content.contact
          const phone   = c?.phone?.trim()
          const wa      = c?.whatsapp?.trim()
          const address = c?.address?.trim()
          const ig      = c?.instagram?.trim()
          const hasInfo = !!(phone || wa || address || ig)
          const sectionBg = t.bold?'rgba(255,255,255,0.04)':t.dark?'#0d0d14':t.glass?'rgba(255,255,255,0.04)':t.vib?'rgba(0,0,0,0.15)':'#f9fafb'
          const cardBg  = (t.dark||t.glass||t.bold) ? 'rgba(255,255,255,0.05)' : 'white'
          const cardBrd = (t.dark||t.glass||t.bold) ? 'rgba(255,255,255,0.1)' : '#f0f0f0'
          const waUrl   = wa ? `https://wa.me/${wa.replace(/\D/g,'')}` : null
          const igUrl   = ig ? `https://instagram.com/${ig.replace('@','')}` : null

          return (
            <div style={{ padding: '5rem 2rem', background: sectionBg }}>
              <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
                <h2 style={{ fontSize: 'clamp(1.625rem,4vw,2.25rem)', fontWeight: 900, color: fg,
                              margin: '0 0 0.75rem', letterSpacing: t.bold ? '-0.02em' : 'normal' }}>
                  {c?.cta ?? '¿Listo para comenzar?'}
                </h2>
                <p style={{ color: muted, fontSize: '1.0625rem', margin: '0 auto 2.25rem',
                             maxWidth: 480, lineHeight: 1.7 }}>
                  Agenda en minutos, sin llamadas ni esperas.
                </p>
                <span dangerouslySetInnerHTML={{ __html:
                  `<span ${openAmelia} style="display:inline-block;background:${color};color:white;padding:1rem 2.75rem;border-radius:12px;font-weight:800;font-size:1.0625rem;cursor:pointer;box-shadow:0 8px 28px ${color}45;transition:transform 0.15s,box-shadow 0.15s;letter-spacing:-0.01em" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 14px 36px ${color}55'" onmouseout="this.style.transform='';this.style.boxShadow='0 8px 28px ${color}45'">${content.hero.cta} ahora</span>`
                }} />

                {hasInfo && (
                  <div style={{ marginTop: '3rem', display: 'grid',
                                gridTemplateColumns: `repeat(auto-fit,minmax(180px,1fr))`,
                                gap: '1rem', textAlign: 'left' }}>
                    {phone && (
                      <a href={`tel:${phone.replace(/\s/g,'')}`} style={{ textDecoration: 'none' }}>
                        <div style={{ background: cardBg, border: `1px solid ${cardBrd}`, borderRadius: 14,
                                       padding: '1.125rem 1.25rem', display: 'flex', alignItems: 'center',
                                       gap: '0.75rem', backdropFilter: t.glass?'blur(8px)':'none' }}>
                          <span style={{ fontSize: '1.375rem' }}>📞</span>
                          <div>
                            <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: muted,
                                         textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>Teléfono</p>
                            <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: fg, margin: 0 }}>{phone}</p>
                          </div>
                        </div>
                      </a>
                    )}
                    {wa && waUrl && (
                      <a href={waUrl} target="_blank" rel="noopener" style={{ textDecoration: 'none' }}>
                        <div style={{ background: cardBg, border: `1px solid ${cardBrd}`, borderRadius: 14,
                                       padding: '1.125rem 1.25rem', display: 'flex', alignItems: 'center',
                                       gap: '0.75rem', backdropFilter: t.glass?'blur(8px)':'none' }}>
                          <span style={{ fontSize: '1.375rem' }}>💬</span>
                          <div>
                            <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: muted,
                                         textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>WhatsApp</p>
                            <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: fg, margin: 0 }}>{wa}</p>
                          </div>
                        </div>
                      </a>
                    )}
                    {address && (
                      <div style={{ background: cardBg, border: `1px solid ${cardBrd}`, borderRadius: 14,
                                     padding: '1.125rem 1.25rem', display: 'flex', alignItems: 'center',
                                     gap: '0.75rem', backdropFilter: t.glass?'blur(8px)':'none' }}>
                        <span style={{ fontSize: '1.375rem' }}>📍</span>
                        <div>
                          <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: muted,
                                       textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>Dirección</p>
                          <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: fg, margin: 0 }}>{address}</p>
                        </div>
                      </div>
                    )}
                    {ig && igUrl && (
                      <a href={igUrl} target="_blank" rel="noopener" style={{ textDecoration: 'none' }}>
                        <div style={{ background: cardBg, border: `1px solid ${cardBrd}`, borderRadius: 14,
                                       padding: '1.125rem 1.25rem', display: 'flex', alignItems: 'center',
                                       gap: '0.75rem', backdropFilter: t.glass?'blur(8px)':'none' }}>
                          <span style={{ fontSize: '1.375rem' }}>📸</span>
                          <div>
                            <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: muted,
                                         textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>Instagram</p>
                            <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: fg, margin: 0 }}>{ig}</p>
                          </div>
                        </div>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* ── FOOTER ── */}
        <div style={{ background: t.dark ? '#050508' : '#111827', padding: '3rem 2rem', textAlign: 'center' }}>
          {logo && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <img src={logo} alt={name} style={{
                ...logoImgStyle(logoSh, logoSz),
                opacity: 0.9,
                filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.2))',
              }} />
            </div>
          )}
          <p style={{ fontWeight: 800, color: themeH ?? 'white', fontSize: '1.0625rem', margin: '0 0 0.375rem' }}>{name}</p>
          <p style={{ color: themeT ?? '#9ca3af', fontSize: '0.875rem', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
            {content.footer.tagline}
          </p>
          <p style={{ color: '#374151', fontSize: '0.75rem', margin: 0 }}>
            Sitio creado con <span style={{ color }}> Amelia</span>
          </p>
        </div>

        {/* ── LIGHTBOX ── */}
        <div dangerouslySetInnerHTML={{ __html:
          `<div id="amelia-lb" onclick="if(event.target===this)window.__ameliaLbClose()"
                style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.88);backdrop-filter:blur(6px);align-items:center;justify-content:center;padding:1.5rem">
             <button onclick="window.__ameliaLbClose()"
                     style="position:fixed;top:1.25rem;right:1.5rem;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);color:white;width:40px;height:40px;border-radius:50%;font-size:1.25rem;cursor:pointer;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);transition:background 0.15s"
                     onmouseover="this.style.background='rgba(255,255,255,0.22)'"
                     onmouseout="this.style.background='rgba(255,255,255,0.12)'">✕</button>
             <img src="" alt="" style="max-width:min(92vw,900px);max-height:88vh;object-fit:contain;border-radius:12px;box-shadow:0 32px 80px rgba(0,0,0,0.7);display:block" />
           </div>`
        }} />

      </div>
    </>
  )
}
