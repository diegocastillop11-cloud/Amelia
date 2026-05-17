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

export interface ProductItem {
  id: string; name: string; description: string | null
  price: number | null; promo_price?: number; promo_label?: string; image_url?: string | null
  stock?: number | null
}

export interface SiteRendererProps {
  content: SiteContent; color: string; template: TemplateId
  name: string; logo?: string | null; cover?: string | null
  gallery?: string[]; fontFamily?: string; slug?: string
  products?: ProductItem[]
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
    sectFg: (dark || vib || glass || bold) ? 'white' : '#111827',
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

const contactScript = (slug: string) => `
window.__ameliaContact = function(e) {
  e.preventDefault();
  var form = document.getElementById('amelia-contact-form');
  var btn  = document.getElementById('amelia-contact-btn');
  var msg  = document.getElementById('amelia-contact-msg');
  var name = form.querySelector('[name=senderName]').value.trim();
  var email= form.querySelector('[name=senderEmail]').value.trim();
  var text = form.querySelector('[name=message]').value.trim();
  if (!name || !text) return;
  btn.disabled = true;
  btn.textContent = 'Enviando…';
  msg.textContent = '';
  msg.style.color = '';
  fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: '${slug}', senderName: name, senderEmail: email||undefined, message: text })
  }).then(function(r){ return r.json(); }).then(function(d){
    if (d.success) {
      msg.textContent = '✓ Mensaje enviado. Te responderemos pronto.';
      msg.style.color = '#6ee7b7';
      form.reset();
    } else {
      msg.textContent = 'Error al enviar. Intenta de nuevo.';
      msg.style.color = '#f87171';
    }
    btn.disabled = false;
    btn.textContent = 'Enviar mensaje';
  }).catch(function(){
    msg.textContent = 'Error al enviar. Intenta de nuevo.';
    msg.style.color = '#f87171';
    btn.disabled = false;
    btn.textContent = 'Enviar mensaje';
  });
};`

const cartScript = (slug: string) => `
(function(){
  var KEY = 'ac-${slug}';
  if (!window.__ameliaCartData) {
    try { window.__ameliaCartData = JSON.parse(localStorage.getItem(KEY)||'[]'); } catch(e){ window.__ameliaCartData=[]; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(window.__ameliaCartData)); } catch(e){}
    window.dispatchEvent(new CustomEvent('amelia-cart-update',{detail:window.__ameliaCartData.slice()}));
  }
  window.__ameliaQty = function(id, delta) {
    var el = document.getElementById('aqty-'+id);
    if (!el) return;
    var v = Math.max(1, Math.min(99, (parseInt(el.value)||1) + delta));
    el.value = v;
  };
  window.__ameliaAddToCart = function(el) {
    var p = {}; try { p = JSON.parse(decodeURIComponent(el.dataset.p)); } catch(e){ return; }
    var qtyEl = document.getElementById('aqty-'+p.id);
    var qty = qtyEl ? Math.max(1, parseInt(qtyEl.value)||1) : 1;
    var cart = window.__ameliaCartData;
    var found = -1;
    for(var i=0;i<cart.length;i++) { if(cart[i].id===p.id){ found=i; break; } }
    if(found>=0) cart[found].qty += qty;
    else cart.push({id:p.id,name:p.name,price:p.price,promo_price:p.promo_price||undefined,qty:qty,image:p.image||null});
    save();
    if(qtyEl) qtyEl.value='1';
    var orig = el.textContent;
    var origBg = el.style.background;
    el.textContent='✓ '+(qty>1?qty+' agregados':'Agregado');
    el.style.background='#059669';
    setTimeout(function(){ el.textContent=orig; el.style.background=origBg; },1500);
  };
  save();
})();`

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
  fontFamily = 'Inter, sans-serif', slug = '', products = [],
}: SiteRendererProps) {
  const hasCover = !!(cover && cover.trim().length > 5)
  const t = getTheme(template, color, hasCover)

  // Optional theme overrides from content.theme (set in editor)
  const themeH  = content.theme?.headingColor
  const themeT  = content.theme?.textColor
  const themeBg = content.theme?.bgColor
  const fg      = themeH ?? t.fg       // hero (puede ser blanco sobre cover)
  const sectFg  = themeH ?? t.sectFg   // secciones con fondo claro (ignora hasCover)
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
      {slug && <script dangerouslySetInnerHTML={{ __html: contactScript(slug) }} />}
      {slug && products.length > 0 && <script dangerouslySetInnerHTML={{ __html: cartScript(slug) }} />}
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
                color: sectFg,
                textTransform: t.mini ? 'uppercase' : 'none',
                letterSpacing: t.mini ? '0.15em' : t.bold ? '-0.02em' : 'normal',
              }}>{name}</span>
          }
          {/* Nav links + CTA */}
          {(() => {
            const defaultLinks = [
              { label: 'Inicio',      anchor: 'inicio',      visible: true },
              { label: 'Servicios',   anchor: 'servicios',   visible: true },
              { label: 'Precios',     anchor: 'precios',     visible: !!(content.pricing && content.pricing.length > 0) },
              { label: 'Testimonios', anchor: 'testimonios', visible: !!(content.reviews && content.reviews.length > 0) },
              { label: 'FAQ',         anchor: 'faq',         visible: !!(content.faq && content.faq.length > 0) },
              { label: 'Productos',   anchor: 'productos',   visible: products.length > 0 },
              { label: 'Galería',     anchor: 'galeria',     visible: gallery.length > 0 },
              { label: 'Contacto',    anchor: 'contacto',    visible: true },
            ]
            const navLinks = content.nav
              ? content.nav.filter(l => l.visible)
              : defaultLinks.filter(l => l.visible)
            const linkHtml = navLinks.map(l =>
              `<a href="#${l.anchor}" style="padding:0.4rem 0.75rem;border-radius:8px;font-size:0.8rem;font-weight:500;color:${t.muted};text-decoration:none;transition:all 0.15s" onmouseover="this.style.color='${sectFg}';this.style.background='rgba(128,128,128,0.12)'" onmouseout="this.style.color='${t.muted}';this.style.background='transparent'">${l.label}</a>`
            ).join('')
            return (
              <span dangerouslySetInnerHTML={{ __html: `
                <span style="display:flex;align-items:center;gap:4px">
                  ${linkHtml}
                  <span ${openAmelia} style="background:${t.mini ? 'transparent' : ctaBg};color:${t.mini ? t.muted : ctaFg};padding:${t.mini ? '0' : '0.5rem 1.25rem'};border-radius:8px;font-size:0.875rem;font-weight:700;cursor:pointer;display:inline-block;transition:opacity 0.15s;margin-left:0.25rem" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">${content.contact?.cta ?? 'Reservar'}</span>
                </span>
              `}} />
            )
          })()}
        </nav>

        {/* ── HERO ── */}
        <div id="inicio" style={{ background: heroBg, padding: t.mini ? '5rem 3rem' : t.bold ? '6rem 2rem' : '5rem 2rem',
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
        <div id="servicios" style={{ padding: t.mini ? '3rem 3rem' : '4rem 2rem', background: t.sectBg }}>
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
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: sectFg, margin: '0 0 0.5rem',
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


        {/* ── PRODUCTOS ── */}
        {products.length > 0 && (
          <div id="productos" style={{ padding: '4rem 2rem', background: t.dark ? '#0d0d14' : t.glass ? 'rgba(255,255,255,0.03)' : t.bold ? 'rgba(255,255,255,0.02)' : t.vib ? 'rgba(0,0,0,0.08)' : '#f9fafb' }}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: sectFg, margin: '0 0 0.5rem',
                            fontFamily: t.eleg ? 'Georgia, serif' : 'inherit' }}>Nuestros productos</h2>
              <p style={{ color: t.muted, fontSize: 13, margin: 0 }}>Agrega al carrito y coordina tu pedido</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))',
                           gap: '1.25rem', maxWidth: '960px', margin: '0 auto' }}>
              {products.map(p => {
                const cardBg  = t.dark  ? 'rgba(255,255,255,0.04)' : t.glass ? 'rgba(255,255,255,0.07)' : t.bold ? 'rgba(255,255,255,0.06)' : t.vib ? 'rgba(255,255,255,0.15)' : 'white'
                const cardBrd = (t.dark || t.glass || t.bold) ? 'rgba(255,255,255,0.1)' : '#f0f0f0'
                const fg2     = (t.dark || t.vib || t.glass || t.bold) ? 'white' : '#111827'
                const effectivePrice = p.promo_price ?? p.price
                const outOfStock = p.stock != null && p.stock === 0
                const lowStock   = p.stock != null && p.stock > 0 && p.stock <= 3
                const pd = encodeURIComponent(JSON.stringify({
                  id: p.id, name: p.name,
                  price: p.price ?? 0, promo_price: p.promo_price,
                  image: p.image_url ?? null,
                }))
                return (
                  <div key={p.id} style={{ background: cardBg, border: `1px solid ${cardBrd}`, borderRadius: 16,
                                            overflow: 'hidden', backdropFilter: 'blur(4px)',
                                            display: 'flex', flexDirection: 'column',
                                            opacity: outOfStock ? 0.7 : 1 }}>
                    {p.image_url
                      ? <div style={{ height: 160, background: `url('${p.image_url}') center/cover no-repeat`, position: 'relative' }}>
                          {p.promo_label && (
                            <span style={{ position: 'absolute', top: 10, left: 10, background: '#ef4444',
                                            color: 'white', fontSize: 11, fontWeight: 800, padding: '3px 10px',
                                            borderRadius: 20, letterSpacing: '0.03em' }}>
                              {p.promo_label}
                            </span>
                          )}
                          {outOfStock && (
                            <span style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.7)',
                                            color: '#f87171', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20 }}>
                              Sin stock
                            </span>
                          )}
                          {lowStock && (
                            <span style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.7)',
                                            color: '#f59e0b', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20 }}>
                              ¡Últimas {p.stock}!
                            </span>
                          )}
                        </div>
                      : <div style={{ height: 6, background: outOfStock ? '#6b7280' : color }} />
                    }
                    <div style={{ padding: '1rem 1.125rem', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {!p.image_url && p.promo_label && (
                        <span style={{ alignSelf: 'flex-start', background: '#ef4444', color: 'white',
                                        fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 20 }}>
                          {p.promo_label}
                        </span>
                      )}
                      {!p.image_url && outOfStock && (
                        <span style={{ alignSelf: 'flex-start', background: 'rgba(239,68,68,0.15)', color: '#f87171',
                                        fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 20 }}>
                          Sin stock
                        </span>
                      )}
                      {!p.image_url && lowStock && (
                        <span style={{ alignSelf: 'flex-start', background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                                        fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 20 }}>
                          ¡Últimas {p.stock}!
                        </span>
                      )}
                      <p style={{ fontWeight: 700, color: fg2, margin: 0, fontSize: '0.9375rem' }}>{p.name}</p>
                      {p.description && <p style={{ color: t.muted, fontSize: '0.8125rem', lineHeight: 1.6, margin: 0, flex: 1 }}>{p.description}</p>}

                      {/* Precio */}
                      {p.price != null && (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                          {p.promo_price != null && (
                            <span style={{ fontSize: '0.8125rem', color: t.muted, textDecoration: 'line-through' }}>
                              ${p.price.toLocaleString('es-CL')}
                            </span>
                          )}
                          <span style={{ fontWeight: 800, fontSize: '1.125rem', color: p.promo_price != null ? '#6ee7b7' : color }}>
                            ${(effectivePrice ?? 0).toLocaleString('es-CL')}
                          </span>
                        </div>
                      )}

                      {/* Selector cantidad + botón */}
                      {outOfStock
                        ? <button disabled style={{ marginTop:8, width:'100%', padding:'9px', borderRadius:'9px', border:'none',
                                                     background:'rgba(255,255,255,0.08)', color:'#9ca3af', fontSize:13,
                                                     fontWeight:700, cursor:'not-allowed', fontFamily:'inherit' }}>
                            Sin stock
                          </button>
                        : <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }} dangerouslySetInnerHTML={{ __html:
                            `<div style="display:flex;align-items:center;gap:6px">
                               <button onclick="window.__ameliaQty('${p.id}',-1)"
                                 style="width:30px;height:30px;border-radius:8px;border:1px solid ${cardBrd};background:${t.dark||t.glass||t.bold?'rgba(255,255,255,0.06)':'#f3f4f6'};color:${fg2};font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:inherit;line-height:1">−</button>
                               <input id="aqty-${p.id}" type="number" value="1" min="1" max="${p.stock ?? 99}"
                                 style="width:44px;height:30px;border-radius:8px;border:1px solid ${cardBrd};background:${t.dark||t.glass||t.bold?'rgba(255,255,255,0.06)':'#f9fafb'};color:${fg2};font-size:13px;font-weight:700;text-align:center;font-family:inherit;outline:none" />
                               <button onclick="window.__ameliaQty('${p.id}',1)"
                                 style="width:30px;height:30px;border-radius:8px;border:1px solid ${cardBrd};background:${t.dark||t.glass||t.bold?'rgba(255,255,255,0.06)':'#f3f4f6'};color:${fg2};font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:inherit;line-height:1">+</button>
                             </div>
                             <button onclick="window.__ameliaAddToCart(this)" data-p="${pd}"
                               style="width:100%;padding:9px;border-radius:9px;border:none;background:${color};color:white;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:background 0.15s;letter-spacing:-0.01em"
                               onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
                               Agregar al carrito
                             </button>`
                          }} />
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── BENEFICIOS ── */}
        {content.benefits && content.benefits.length > 0 && (
          <div style={{ padding: '5rem 2rem', background: t.dark ? '#0d0d14' : t.glass ? 'rgba(255,255,255,0.03)' : t.bold ? 'rgba(255,255,255,0.03)' : t.vib ? 'rgba(0,0,0,0.1)' : '#f9fafb' }}>
            <div style={{ maxWidth: 960, margin: '0 auto' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', marginBottom: '0.75rem', color: sectFg,
                            fontFamily: t.eleg ? 'Georgia, serif' : 'inherit' }}>
                ¿Por qué elegirnos?
              </h2>
              <p style={{ textAlign: 'center', color: t.muted, fontSize: '1rem', marginBottom: '3rem' }}>
                Lo que nos hace diferentes
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '1.25rem' }}>
                {content.benefits.map((b, i) => (
                  <div key={i} style={{
                    background: (t.dark || t.glass || t.bold) ? 'rgba(255,255,255,0.05)' : 'white',
                    border: `1px solid ${t.border}`, borderRadius: 16, padding: '1.75rem',
                    display: 'flex', gap: '1rem', alignItems: 'flex-start',
                    backdropFilter: (t.glass || t.bold) ? 'blur(8px)' : 'none',
                  }}>
                    <span style={{ fontSize: '2rem', flexShrink: 0 }}>{b.icon}</span>
                    <div>
                      <p style={{ fontWeight: 700, color: sectFg, fontSize: '1rem', margin: '0 0 0.375rem' }}>{b.title}</p>
                      <p style={{ color: t.muted, fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CÓMO FUNCIONA ── */}
        {content.steps && content.steps.length > 0 && (
          <div style={{ padding: '5rem 2rem', background: t.sectBg }}>
            <div style={{ maxWidth: 860, margin: '0 auto' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', marginBottom: '0.75rem', color: sectFg,
                            fontFamily: t.eleg ? 'Georgia, serif' : 'inherit' }}>
                ¿Cómo funciona?
              </h2>
              <p style={{ textAlign: 'center', color: t.muted, fontSize: '1rem', marginBottom: '3rem' }}>
                Simple y rápido — así trabajamos
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1.5rem' }}>
                {content.steps.map((s, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: '50%', margin: '0 auto 1rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `linear-gradient(135deg, ${color}22, ${color}44)`,
                      border: `2px solid ${color}55`,
                    }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: color }}>{i + 1}</span>
                    </div>
                    <p style={{ fontWeight: 700, color: sectFg, fontSize: '1rem', margin: '0 0 0.5rem' }}>{s.title}</p>
                    <p style={{ color: t.muted, fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PRECIOS ── */}
        {content.pricing && content.pricing.length > 0 && (
          <div id="precios" style={{ padding: '5rem 2rem', background: t.dark ? '#0d0d14' : t.glass ? 'rgba(255,255,255,0.03)' : t.bold ? 'rgba(255,255,255,0.03)' : 'white' }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', marginBottom: '0.75rem', color: sectFg,
                            fontFamily: t.eleg ? 'Georgia, serif' : 'inherit' }}>
                Información y precios
              </h2>
              <p style={{ textAlign: 'center', color: t.muted, fontSize: '1rem', marginBottom: '3rem' }}>
                Transparencia total, sin sorpresas
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: '1.25rem' }}>
                {content.pricing.map((p, i) => (
                  <div key={i} style={{
                    background: p.highlighted
                      ? `linear-gradient(135deg, ${color}18, ${color}08)`
                      : (t.dark || t.glass || t.bold) ? 'rgba(255,255,255,0.05)' : '#f9fafb',
                    border: p.highlighted ? `2px solid ${color}66` : `1px solid ${t.border}`,
                    borderRadius: 16, padding: '2rem', textAlign: 'center', position: 'relative',
                    backdropFilter: (t.glass || t.bold) ? 'blur(8px)' : 'none',
                  }}>
                    {p.highlighted && (
                      <span style={{
                        position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                        background: color, color: 'white', fontSize: '0.6875rem', fontWeight: 700,
                        padding: '3px 12px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>
                        Más popular
                      </span>
                    )}
                    <p style={{ fontWeight: 700, color: sectFg, fontSize: '1.125rem', margin: '0 0 0.5rem' }}>{p.title}</p>
                    {p.price && (
                      <p style={{ fontSize: '1.75rem', fontWeight: 800, color: color, margin: '0 0 1rem' }}>{p.price}</p>
                    )}
                    <p style={{ color: t.muted, fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 1.5rem' }}>{p.desc}</p>
                    <div dangerouslySetInnerHTML={{ __html:
                      `<span onclick="document.getElementById('contacto')?.scrollIntoView({behavior:'smooth'})"
                        style="display:inline-block;padding:0.625rem 1.5rem;border-radius:10px;font-size:0.875rem;font-weight:700;cursor:pointer;transition:opacity 0.15s;
                        background:${p.highlighted ? color : 'transparent'};color:${p.highlighted ? 'white' : color};
                        border:2px solid ${color}" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                        Consultar
                      </span>`
                    }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── GALERÍA ── */}
        {gallery.length > 0 && (
          <div id="galeria" style={{ padding: '4rem 2rem', background: t.dark ? '#0d0d14' : t.glass ? 'rgba(255,255,255,0.03)' : t.bold ? 'rgba(255,255,255,0.02)' : 'white' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', marginBottom: '2.5rem', color: sectFg }}>
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
          <div id="testimonios" style={{ padding: '4rem 2rem', background: t.sectBg }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', marginBottom: '2.5rem', color: sectFg }}>
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
                  <p style={{ fontWeight: 700, color: sectFg, fontSize: '0.875rem', margin: 0 }}>{r.author}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FAQ ── */}
        {content.faq && content.faq.length > 0 && (
          <div id="faq" style={{ padding: '5rem 2rem', background: t.dark ? '#0d0d14' : t.glass ? 'rgba(255,255,255,0.03)' : t.bold ? 'rgba(255,255,255,0.03)' : '#f9fafb' }}>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', marginBottom: '0.75rem', color: sectFg,
                            fontFamily: t.eleg ? 'Georgia, serif' : 'inherit' }}>
                Preguntas frecuentes
              </h2>
              <p style={{ textAlign: 'center', color: t.muted, fontSize: '1rem', marginBottom: '3rem' }}>
                Respondemos las dudas más comunes
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {content.faq.map((item, i) => (
                  <div key={i} dangerouslySetInnerHTML={{ __html:
                    `<div style="border:1px solid ${t.border};border-radius:12px;overflow:hidden">
                      <button onclick="var a=this.nextElementSibling;var arr=this.querySelector('span');if(a.style.display==='none'){a.style.display='block';arr.style.transform='rotate(180deg)'}else{a.style.display='none';arr.style.transform=''}"
                        style="width:100%;display:flex;justify-content:space-between;align-items:center;padding:1.125rem 1.375rem;background:${(t.dark||t.glass||t.bold)?'rgba(255,255,255,0.05)':'white'};border:none;cursor:pointer;text-align:left;gap:1rem;font-family:inherit">
                        <span style="font-weight:600;font-size:0.9375rem;color:${sectFg};line-height:1.5">${item.q}</span>
                        <span style="font-size:1.125rem;color:${color};flex-shrink:0;transition:transform 0.2s">▾</span>
                      </button>
                      <div style="display:none;padding:1rem 1.375rem 1.25rem;background:${(t.dark||t.glass||t.bold)?'rgba(255,255,255,0.03)':'#f9fafb'}">
                        <p style="color:${t.muted};font-size:0.9375rem;line-height:1.7;margin:0">${item.a}</p>
                      </div>
                    </div>`
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CONTACTO (info + formulario unificados) ── */}
        {slug && (() => {
          const c       = content.contact
          const phone   = c?.phone?.trim()
          const wa      = c?.whatsapp?.trim()
          const address = c?.address?.trim()
          const ig      = c?.instagram?.trim()
          const waUrl   = wa ? `https://wa.me/${wa.replace(/\D/g,'')}` : null
          const igUrl   = ig ? `https://instagram.com/${ig.replace('@','')}` : null
          const cardBg  = (t.dark||t.glass||t.bold) ? 'rgba(255,255,255,0.05)' : t.vib ? 'rgba(255,255,255,0.15)' : '#f9fafb'
          const cardBrd = (t.dark||t.glass||t.bold) ? 'rgba(255,255,255,0.1)' : '#e5e7eb'
          const inBg    = (t.dark||t.glass||t.bold) ? 'rgba(255,255,255,0.06)' : '#f9fafb'
          const inBrd   = (t.dark||t.glass||t.bold) ? 'rgba(255,255,255,0.12)' : '#e5e7eb'
          return (
            <div id="contacto" style={{ padding: '5rem 2rem', background: t.dark ? '#0d0d14' : t.glass ? 'rgba(255,255,255,0.03)' : t.bold ? 'rgba(255,255,255,0.03)' : t.vib ? 'rgba(0,0,0,0.1)' : 'white' }}>
              <div style={{ maxWidth: 960, margin: '0 auto' }}>
                {/* Título centrado */}
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                  <h2 style={{ fontSize: 'clamp(1.625rem,4vw,2.25rem)', fontWeight: 900, color: sectFg,
                                margin: '0 0 0.625rem', letterSpacing: t.bold ? '-0.02em' : 'normal',
                                fontFamily: t.eleg ? 'Georgia, serif' : 'inherit' }}>
                    {c?.cta ?? 'Contáctanos'}
                  </h2>
                  <p style={{ color: muted, fontSize: '1rem', margin: 0, lineHeight: 1.7 }}>
                    Te respondemos a la brevedad.
                  </p>
                </div>

                {/* Grid: info izq | formulario der */}
                <div style={{ display: 'grid', gridTemplateColumns: (phone||wa||address||ig) ? 'minmax(0,1fr) minmax(0,1fr)' : '1fr', gap: '3rem', alignItems: 'start' }}>

                  {/* Columna izquierda: CTA + datos de contacto + redes */}
                  {(phone||wa||address||ig) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {/* Botón principal */}
                      <span dangerouslySetInnerHTML={{ __html:
                        `<span ${openAmelia} style="display:inline-flex;align-items:center;justify-content:center;background:${color};color:white;padding:0.875rem 2rem;border-radius:12px;font-weight:800;font-size:1rem;cursor:pointer;box-shadow:0 8px 24px ${color}40;transition:transform 0.15s,box-shadow 0.15s;letter-spacing:-0.01em" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''">✨ ${content.hero.cta}</span>`
                      }} />

                      {/* Tarjetas de info */}
                      {phone && (
                        <a href={`tel:${phone.replace(/\s/g,'')}`} style={{ textDecoration: 'none' }}>
                          <div style={{ background: cardBg, border: `1px solid ${cardBrd}`, borderRadius: 14,
                                         padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '1.25rem' }}>📞</span>
                            <div>
                              <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>Teléfono</p>
                              <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: sectFg, margin: 0 }}>{phone}</p>
                            </div>
                          </div>
                        </a>
                      )}
                      {wa && waUrl && (
                        <a href={waUrl} target="_blank" rel="noopener" style={{ textDecoration: 'none' }}>
                          <div style={{ background: cardBg, border: `1px solid ${cardBrd}`, borderRadius: 14,
                                         padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '1.25rem' }}>💬</span>
                            <div>
                              <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>WhatsApp</p>
                              <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: sectFg, margin: 0 }}>{wa}</p>
                            </div>
                          </div>
                        </a>
                      )}
                      {address && (
                        <div style={{ background: cardBg, border: `1px solid ${cardBrd}`, borderRadius: 14,
                                       padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontSize: '1.25rem' }}>📍</span>
                          <div>
                            <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>Dirección</p>
                            <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: sectFg, margin: 0 }}>{address}</p>
                          </div>
                        </div>
                      )}
                      {ig && igUrl && (
                        <a href={igUrl} target="_blank" rel="noopener" style={{ textDecoration: 'none' }}>
                          <div style={{ background: cardBg, border: `1px solid ${cardBrd}`, borderRadius: 14,
                                         padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <span style={{ fontSize: '1.25rem' }}>📸</span>
                            <div>
                              <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 2px' }}>Instagram</p>
                              <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: sectFg, margin: 0 }}>{ig}</p>
                            </div>
                          </div>
                        </a>
                      )}

                      {/* Botones redes sociales */}
                      {(wa || ig) && (
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                          {wa && waUrl && (
                            <a href={waUrl} target="_blank" rel="noopener" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'0.6rem 1.125rem', borderRadius:8, background:'#25D366', color:'white', fontWeight:700, fontSize:'0.875rem', textDecoration:'none' }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                              WhatsApp
                            </a>
                          )}
                          {ig && igUrl && (
                            <a href={igUrl} target="_blank" rel="noopener" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'0.6rem 1.125rem', borderRadius:8, background:'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)', color:'white', fontWeight:700, fontSize:'0.875rem', textDecoration:'none' }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                              Instagram
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Columna derecha: formulario */}
                  <div style={{ paddingTop: (phone||wa||address||ig) ? '4rem' : 0 }} dangerouslySetInnerHTML={{ __html: `
                    <form id="amelia-contact-form" onsubmit="window.__ameliaContact(event)" style="display:flex;flex-direction:column;gap:14px">
                      <div>
                        <label style="display:block;font-size:12px;font-weight:700;color:${muted};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Nombre *</label>
                        <input name="senderName" required placeholder="Tu nombre" style="width:100%;padding:11px 14px;border-radius:10px;border:1.5px solid ${inBrd};background:${inBg};color:${sectFg};font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;transition:border-color 0.15s" onfocus="this.style.borderColor='${color}'" onblur="this.style.borderColor='${inBrd}'" />
                      </div>
                      <div>
                        <label style="display:block;font-size:12px;font-weight:700;color:${muted};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Email (opcional)</label>
                        <input name="senderEmail" type="email" placeholder="tu@email.com" style="width:100%;padding:11px 14px;border-radius:10px;border:1.5px solid ${inBrd};background:${inBg};color:${sectFg};font-size:14px;font-family:inherit;outline:none;box-sizing:border-box;transition:border-color 0.15s" onfocus="this.style.borderColor='${color}'" onblur="this.style.borderColor='${inBrd}'" />
                      </div>
                      <div>
                        <label style="display:block;font-size:12px;font-weight:700;color:${muted};text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px">Mensaje *</label>
                        <textarea name="message" required rows="4" placeholder="¿En qué podemos ayudarte?" style="width:100%;padding:11px 14px;border-radius:10px;border:1.5px solid ${inBrd};background:${inBg};color:${sectFg};font-size:14px;font-family:inherit;outline:none;resize:vertical;box-sizing:border-box;transition:border-color 0.15s" onfocus="this.style.borderColor='${color}'" onblur="this.style.borderColor='${inBrd}'"></textarea>
                      </div>
                      <button id="amelia-contact-btn" type="submit" style="width:100%;padding:13px;border-radius:10px;border:none;background:${color};color:white;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;transition:opacity 0.15s;letter-spacing:-0.01em" onmouseover="this.style.opacity='0.87'" onmouseout="this.style.opacity='1'">Enviar mensaje</button>
                      <p id="amelia-contact-msg" style="text-align:center;font-size:13px;font-weight:600;margin:0"></p>
                    </form>` }} />
                </div>
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

        {/* ── WA FLOAT ── */}
        {content.contact?.whatsapp && (
          <a href={`https://wa.me/${content.contact.whatsapp.replace(/\D/g,'')}`}
             target="_blank" rel="noopener"
             style={{
               position: 'fixed', bottom: '7.5rem', right: '1.5rem', zIndex: 999,
               width: 56, height: 56, borderRadius: '50%',
               background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center',
               boxShadow: '0 4px 20px rgba(37,211,102,0.4)', textDecoration: 'none',
             }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          </a>
        )}

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
