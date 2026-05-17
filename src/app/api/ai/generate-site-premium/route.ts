import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function err(msg: string, status = 500) {
  return NextResponse.json({ error: msg }, { status })
}

// ── Base HTML shell con design system garantizado ────────────
function buildBaseHtml(color: string, coverUrl: string | null, logoUrl: string | null, waNumber: string): string {
  const heroBg = coverUrl
    ? `linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.85) 100%), url('${coverUrl}') center/cover no-repeat`
    : `radial-gradient(ellipse at top, #1a1a2e 0%, #0d0d0d 60%)`

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{BUSINESS_NAME}}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800;900&family=Montserrat:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
  :root {
    --accent: ${color};
    --accent-dark: ${color}cc;
    --bg: #0a0a0a;
    --bg2: #111111;
    --bg3: #161616;
    --border: #252525;
    --border2: #333333;
    --text: #ffffff;
    --muted: #aaaaaa;
    --muted2: #666666;
    --hero-bg: ${heroBg};
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'Inter', sans-serif;
    line-height: 1.6;
    overflow-x: hidden;
  }
  /* NAV — logo absoluto izq, CTA absoluto der, links centrados */
  nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
    display: flex; align-items: center; justify-content: center;
    height: 64px;
    background: rgba(10,10,10,0.95);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border);
  }
  .nav-logo {
    position: absolute; left: 4%; top: 50%; transform: translateY(-50%);
    display: flex; align-items: center; gap: 10px;
    font-family: 'Montserrat', sans-serif;
    font-size: 1.05rem; font-weight: 900;
    color: var(--accent); text-decoration: none;
    letter-spacing: 0.02em; white-space: nowrap;
  }
  .nav-logo img { height: 34px; width: 34px; object-fit: cover; border-radius: 6px; }
  .nav-links {
    display: flex; gap: 1.5rem; list-style: none;
    padding: 0 220px; /* espacio para logo y botón */
  }
  .nav-links a {
    color: var(--muted); font-size: 0.8125rem; font-weight: 500;
    text-decoration: none; transition: color 0.2s; white-space: nowrap;
  }
  .nav-links a:hover { color: var(--text); }
  .nav-cta {
    position: absolute; right: 4%; top: 50%; transform: translateY(-50%);
    background: var(--accent); color: white;
    padding: 0.5rem 1.25rem; border-radius: 6px;
    font-weight: 700; font-size: 0.8125rem;
    white-space: nowrap;
    text-decoration: none; transition: opacity 0.2s;
    letter-spacing: 0.03em;
  }
  .nav-cta:hover { opacity: 0.85; }
  /* HERO */
  #inicio {
    min-height: 100vh;
    background: var(--hero-bg);
    display: flex; flex-direction: column;
    justify-content: center; align-items: flex-start;
    padding: 72px 8% 5rem;
    position: relative;
    overflow: hidden;
  }
  #inicio::after {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(to right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 100%);
    pointer-events: none;
  }
  .hero-inner { position: relative; z-index: 1; max-width: 720px; }
  .hero-badge {
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.15);
    color: var(--muted); font-size: 0.8125rem; font-weight: 600;
    padding: 0.4rem 1rem; border-radius: 100px;
    margin-bottom: 2rem; backdrop-filter: blur(8px);
    letter-spacing: 0.04em;
  }
  .hero-badge span { color: var(--accent); }
  .hero-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(3.5rem, 9vw, 7rem);
    line-height: 0.95;
    letter-spacing: 0.02em;
    margin-bottom: 1.5rem;
    color: white;
  }
  .hero-title .accent { color: var(--accent); }
  .hero-subtitle {
    font-size: clamp(1rem, 2vw, 1.25rem);
    color: var(--muted);
    margin-bottom: 2.5rem;
    max-width: 520px;
    line-height: 1.7;
  }
  .hero-subtitle strong { color: white; }
  .hero-ctas { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 4rem; }
  .btn-primary {
    background: var(--accent); color: white;
    padding: 0.875rem 2rem; border-radius: 6px;
    font-weight: 700; font-size: 1rem;
    text-decoration: none; display: inline-block;
    transition: transform 0.15s, box-shadow 0.15s;
    letter-spacing: 0.02em;
  }
  .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 24px color-mix(in srgb, var(--accent) 40%, transparent); }
  .btn-secondary {
    background: transparent; color: white;
    padding: 0.875rem 2rem; border-radius: 6px;
    font-weight: 700; font-size: 1rem;
    text-decoration: none; display: inline-block;
    border: 2px solid rgba(255,255,255,0.3);
    transition: border-color 0.15s, color 0.15s;
    letter-spacing: 0.02em;
  }
  .btn-secondary:hover { border-color: var(--accent); color: var(--accent); }
  .btn-wa {
    background: #25D366; color: white;
    padding: 0.875rem 2rem; border-radius: 6px;
    font-weight: 700; font-size: 1rem;
    text-decoration: none; display: inline-flex; align-items: center; gap: 8px;
    transition: opacity 0.15s;
  }
  .btn-wa:hover { opacity: 0.85; }
  /* AMELIA — botón principal */
  .btn-amelia {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    padding: 0.875rem 2rem; border-radius: 6px;
    font-weight: 700; font-size: 1rem;
    border: none; cursor: pointer; font-family: inherit;
    display: inline-flex; align-items: center; gap: 10px;
    transition: transform 0.15s, box-shadow 0.15s;
    box-shadow: 0 4px 20px rgba(99,102,241,0.35);
    letter-spacing: 0.02em;
  }
  .btn-amelia:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(99,102,241,0.5); }
  .btn-amelia .amelia-icon { font-size: 1.25rem; }
  .hero-stats {
    display: flex; gap: 3rem; flex-wrap: wrap;
    border-top: 1px solid var(--border2);
    padding-top: 2rem;
  }
  .stat-item { display: flex; flex-direction: column; }
  .stat-num {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 2.5rem; line-height: 1;
    color: var(--accent);
  }
  .stat-label { font-size: 0.75rem; color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase; margin-top: 4px; }
  /* SECTIONS */
  section { padding: 6rem 8%; }
  .section-tag {
    display: inline-block;
    color: var(--accent); font-size: 0.75rem; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase;
    margin-bottom: 1rem;
  }
  .section-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(2.5rem, 5vw, 4rem);
    line-height: 1; letter-spacing: 0.02em;
    margin-bottom: 1rem;
  }
  .section-subtitle { color: var(--muted); font-size: 1rem; max-width: 540px; margin-bottom: 3.5rem; line-height: 1.7; }
  /* CARDS */
  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
  }
  .card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 2rem;
    transition: border-color 0.2s, transform 0.2s;
  }
  .card:hover { border-color: var(--accent); transform: translateY(-4px); }
  .card-icon { font-size: 2rem; margin-bottom: 1rem; }
  .card-title { font-size: 1.125rem; font-weight: 700; margin-bottom: 0.5rem; }
  .card-desc { color: var(--muted); font-size: 0.9375rem; line-height: 1.6; }
  .card-price { color: var(--accent); font-size: 1.25rem; font-weight: 800; margin-top: 1rem; font-family: 'Montserrat', sans-serif; }
  /* STEPS */
  .steps-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 2rem;
    position: relative;
  }
  .step { text-align: center; }
  .step-num {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 5rem; line-height: 1;
    color: var(--accent);
    opacity: 0.15;
    margin-bottom: -1rem;
  }
  .step-title { font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem; }
  .step-desc { color: var(--muted); font-size: 0.875rem; line-height: 1.6; }
  /* PRICING */
  .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; }
  .price-card {
    background: var(--bg2); border: 1px solid var(--border);
    border-radius: 16px; padding: 2.25rem 2rem 2rem;
    text-align: center; position: relative;
    transition: border-color 0.25s, transform 0.25s, box-shadow 0.25s;
    display: flex; flex-direction: column;
  }
  .price-card:hover { border-color: var(--accent); transform: translateY(-4px); box-shadow: 0 16px 40px rgba(0,0,0,0.3); }
  .price-card.featured {
    border-color: var(--accent);
    background: linear-gradient(160deg, color-mix(in srgb, var(--accent) 10%, var(--bg2)), var(--bg2));
    box-shadow: 0 8px 32px color-mix(in srgb, var(--accent) 20%, transparent);
  }
  .price-card.featured:hover { box-shadow: 0 20px 48px color-mix(in srgb, var(--accent) 30%, transparent); }
  .price-badge {
    position: absolute; top: -13px; left: 50%; transform: translateX(-50%);
    background: var(--accent); color: white;
    font-size: 0.6875rem; font-weight: 700;
    padding: 4px 18px; border-radius: 100px;
    letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap;
    box-shadow: 0 4px 12px color-mix(in srgb, var(--accent) 40%, transparent);
  }
  .price-icon { font-size: 2rem; margin-bottom: 1rem; }
  .price-name { font-size: 0.9375rem; font-weight: 700; color: var(--muted); margin-bottom: 0.75rem; letter-spacing: 0.06em; text-transform: uppercase; }
  .price-amount {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(2rem, 4vw, 3rem);
    color: var(--accent); line-height: 1; margin-bottom: 0.25rem;
    letter-spacing: 0.02em;
  }
  .price-amount .currency { font-family: 'Inter', sans-serif; font-size: 1.25rem; vertical-align: super; }
  .price-amount.no-price { font-size: 1.5rem; color: var(--muted); font-family: 'Inter', sans-serif; font-weight: 600; }
  .price-desc { color: var(--muted); font-size: 0.9rem; line-height: 1.65; margin: 1rem 0 1.5rem; flex: 1; }
  .price-cta {
    display: block; width: 100%;
    padding: 0.875rem; border-radius: 8px;
    font-weight: 700; font-size: 0.9375rem;
    text-align: center; cursor: pointer;
    border: none; font-family: inherit;
    transition: opacity 0.2s, transform 0.15s;
    background: var(--accent); color: white;
    letter-spacing: 0.02em;
  }
  .price-cta.outline { background: transparent; border: 2px solid var(--border2); color: var(--muted); }
  .price-cta:hover { opacity: 0.85; transform: translateY(-1px); }
  /* REVIEWS */
  .reviews-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; }
  .review-card { background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 2rem; }
  .review-stars { color: #f59e0b; font-size: 1rem; margin-bottom: 1rem; letter-spacing: 2px; }
  .review-text { color: var(--muted); font-size: 0.9375rem; line-height: 1.7; font-style: italic; margin-bottom: 1.5rem; }
  .review-author { display: flex; align-items: center; gap: 12px; }
  .review-avatar {
    width: 42px; height: 42px; border-radius: 50%;
    background: var(--accent); display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 1rem; color: white; flex-shrink: 0;
  }
  .review-name { font-weight: 700; font-size: 0.9375rem; }
  .review-role { color: var(--muted2); font-size: 0.8125rem; }
  /* FAQ */
  .faq-list { max-width: 720px; }
  .faq-item { border-bottom: 1px solid var(--border); }
  .faq-btn {
    width: 100%; display: flex; justify-content: space-between; align-items: center;
    padding: 1.375rem 0; background: none; border: none; cursor: pointer;
    text-align: left; color: var(--text); font-size: 1rem; font-weight: 600;
    font-family: inherit; gap: 1rem;
  }
  .faq-arrow { display: none !important; }
  .faq-btn::after { content: '▾'; color: var(--accent); font-size: 1.25rem; transition: transform 0.25s; flex-shrink: 0; display: inline-block; }
  .faq-btn.open::after { transform: rotate(180deg); }
  .faq-answer {
    overflow: hidden; max-height: 0;
    transition: max-height 0.35s ease, padding 0.25s ease;
  }
  .faq-answer p { color: var(--muted); line-height: 1.75; font-size: 0.9375rem; padding-bottom: 1.375rem; }
  /* CONTACT */
  .contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; }
  .contact-info { display: flex; flex-direction: column; gap: 1.5rem; }
  .contact-item { display: grid; grid-template-columns: 2rem 1fr; gap: 0.75rem; align-items: start; }
  .contact-icon { font-size: 1.25rem; margin-top: 2px; line-height: 1; }
  .contact-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted2); margin-bottom: 4px; }
  .contact-val { font-size: 0.9375rem; color: var(--text); }
  .contact-form { display: flex; flex-direction: column; gap: 1.125rem; }
  .form-input {
    width: 100%; padding: 1rem 1.25rem;
    background: #1c1c1c; border: 1.5px solid #2e2e2e;
    border-radius: 10px; color: #fff; font-size: 1rem;
    font-family: inherit; transition: border-color 0.2s, background 0.2s;
    outline: none; box-sizing: border-box;
    -webkit-appearance: none;
  }
  .form-input:focus { border-color: var(--accent); background: #222; }
  .form-input::placeholder { color: #555; }
  textarea.form-input { resize: vertical; min-height: 150px; line-height: 1.6; }
  .form-btn {
    background: var(--accent); color: white;
    padding: 1.125rem; border: none; border-radius: 10px;
    font-weight: 700; font-size: 1.0625rem; cursor: pointer;
    font-family: inherit; transition: opacity 0.2s, transform 0.15s;
    letter-spacing: 0.02em;
  }
  .form-btn:hover { opacity: 0.88; transform: translateY(-1px); }
  .form-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
  /* Forzar estilo oscuro en cualquier input/textarea del sitio */
  input:not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]),
  textarea, select {
    background: #1c1c1c !important; border: 1.5px solid #2e2e2e !important;
    color: #fff !important; padding: 1rem 1.25rem !important;
    border-radius: 10px !important; font-size: 1rem !important;
    font-family: inherit !important; outline: none !important;
    box-sizing: border-box !important; width: 100% !important;
    transition: border-color 0.2s !important;
    -webkit-appearance: none !important;
  }
  input:not([type="submit"]):not([type="button"])::placeholder, textarea::placeholder { color: #555 !important; }
  input:not([type="submit"]):not([type="button"]):focus, textarea:focus { border-color: var(--accent) !important; }
  textarea { resize: vertical !important; min-height: 150px !important; line-height: 1.6 !important; }
  /* FOOTER */
  footer {
    background: var(--bg2);
    border-top: 1px solid var(--border);
    padding: 3rem 8%;
    display: flex; justify-content: space-between; align-items: center;
    flex-wrap: wrap; gap: 1rem;
  }
  .footer-brand { font-family: 'Bebas Neue', sans-serif; font-size: 1.5rem; color: var(--accent); letter-spacing: 0.04em; }
  .footer-tagline { color: var(--muted); font-size: 0.875rem; margin-top: 4px; }
  .footer-copy { color: var(--muted2); font-size: 0.8125rem; }
  /* WA FLOAT — encima del botón de Amelia */
  .wa-float {
    position: fixed; bottom: 7.5rem; right: 1.5rem; z-index: 999;
    width: 56px; height: 56px; border-radius: 50%;
    background: #25D366; display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 20px rgba(37,211,102,0.4);
    text-decoration: none; transition: transform 0.2s, box-shadow 0.2s;
  }
  .wa-float:hover { transform: scale(1.1); box-shadow: 0 8px 28px rgba(37,211,102,0.5); }
  .wa-float svg { width: 28px; height: 28px; fill: white; }
  /* RESPONSIVE */
  @media (max-width: 768px) {
    nav { padding: 0 5%; }
    .nav-links { display: none; }
    section { padding: 4rem 5%; }
    .contact-grid { grid-template-columns: 1fr; gap: 2.5rem; }
    #inicio { padding: 72px 5% 4rem; }
    .hero-stats { gap: 1.5rem; }
    footer { flex-direction: column; text-align: center; }
  }
  /* Alternating section backgrounds */
  section:nth-child(even) { background: var(--bg2); }
  section:nth-child(odd) { background: var(--bg); }
  /* SERVICIOS info-cards: sin precio ni botones */
  #amelia-services-container .card-price,
  #amelia-services-container .card > button,
  #amelia-services-container .card .price-cta { display: none !important; }
  /* Scroll offset para nav fijo */
  section[id], div[id] { scroll-margin-top: 64px; }
  /* SOCIAL LINKS */
  .social-links { display: flex; gap: 0.75rem; margin-top: 2rem; flex-wrap: wrap; }
  .social-link {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 0.625rem 1.125rem; border-radius: 8px;
    font-size: 0.875rem; font-weight: 600;
    text-decoration: none; transition: opacity 0.2s, transform 0.15s;
    color: white; white-space: nowrap;
  }
  .social-link:hover { opacity: 0.85; transform: translateY(-2px); }
  .social-link.wa  { background: #25D366; }
  .social-link.ig  { background: linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045); }
  .social-link.fb  { background: #1877f2; }
  .social-link.tk  { background: #010101; border: 1px solid #333; }
  .social-link svg { width: 17px; height: 17px; fill: currentColor; flex-shrink: 0; }
</style>
<script defer>
// ── Smooth scroll para links de nav (event delegation) ───────
document.addEventListener('click', function(e) {
  var a = e.target.closest('a[href^="#"]');
  if (!a) return;
  var href = a.getAttribute('href');
  if (!href || href === '#') return;
  var target = null;
  // 1. Buscar por ID exacto
  try { target = document.querySelector(href); } catch(ex) {}
  // 2. Fallback: buscar sección por texto del link (normalizado, sin tildes)
  if (!target) {
    var raw = (a.textContent || '').trim().toLowerCase();
    var txt = raw.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z]/g,'').slice(0,6);
    var secs = document.querySelectorAll('section[id]');
    for (var i = 0; i < secs.length; i++) {
      var sid = secs[i].id.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z]/g,'');
      if (sid === txt || sid.includes(txt) || txt.includes(sid.slice(0,4))) { target = secs[i]; break; }
    }
  }
  if (target) {
    e.preventDefault();
    var top = target.getBoundingClientRect().top + window.scrollY - 64;
    window.scrollTo({ top: top, behavior: 'smooth' });
  }
});

// ── Abrir Amelia (chat IA en la página padre) ────────────────
function openAmelia(service) {
  window.parent.postMessage({ type: 'amelia-open', service: service || null }, '*');
}
// Event delegation — funciona para elementos estáticos Y dinámicos
document.addEventListener('click', function(e) {
  var trigger = e.target.closest('.amelia-trigger, .btn-amelia');
  if (trigger) { e.preventDefault(); openAmelia(trigger.dataset.service); return; }
  // Cualquier botón/link dentro de una price-card abre Amelia (aunque Claude no puso la clase)
  var priceBtn = e.target.closest('.price-card a, .price-card button, .price-cta');
  if (priceBtn) {
    e.preventDefault();
    var card = priceBtn.closest('.price-card');
    var service = priceBtn.dataset && priceBtn.dataset.service;
    if (!service && card) { var nameEl = card.querySelector('.price-name'); service = nameEl ? nameEl.textContent : null; }
    openAmelia(service || null);
  }
});

// ── Render dinámico de PRICING desde JSON ────────────────────
(function renderPricing() {
  const dataEl = document.getElementById('amelia-services-data');
  if (!dataEl) return;
  let services = [];
  try { services = JSON.parse(dataEl.textContent || '[]'); } catch(e) { return; }
  if (!services.length) return;

  var pricingContainer = document.getElementById('amelia-pricing-container');
  if (!pricingContainer) {
    var secPrecios = document.getElementById('precios') ||
      document.getElementById('pricing') ||
      document.querySelector('section[id*="precio"]') ||
      (function() {
        var secs = document.querySelectorAll('section');
        for (var k = 0; k < secs.length; k++) {
          var h = secs[k].querySelector('.section-title, h2, h1');
          if (h && /precio|tarifa|inversion|inversión/i.test(h.textContent)) return secs[k];
        }
        return null;
      })();
    if (secPrecios) {
      pricingContainer = document.createElement('div');
      pricingContainer.id = 'amelia-pricing-container';
      pricingContainer.className = 'pricing-grid';
      secPrecios.appendChild(pricingContainer);
    }
  }
  if (pricingContainer) {
    var featuredIdx = services.findIndex(function(s) { return s.featured; });
    var ordered = services.slice();
    if (featuredIdx >= 0 && services.length >= 2) {
      var mid = Math.floor(services.length / 2);
      var feat = ordered.splice(featuredIdx, 1)[0];
      ordered.splice(mid, 0, feat);
    }
    pricingContainer.innerHTML = ordered.map(function(s) {
      return '<div class="price-card' + (s.featured ? ' featured' : '') + '">' +
        (s.featured ? '<span class="price-badge">Más popular</span>' : '') +
        '<div class="price-name">' + s.name + '</div>' +
        (s.price
          ? '<div class="price-amount">' + s.price + '</div>'
          : '<div class="price-amount no-price">Consultar</div>') +
        '<div class="price-desc">' + (s.description || '') + '</div>' +
        '<button class="price-cta amelia-trigger" data-service="' + s.name + '">Reservar con Amelia</button>' +
      '</div>';
    }).join('');
  }
})();

// FAQ accordion — cloneNode elimina listeners viejos; ::after CSS maneja la flecha
function initFaq() {
  document.querySelectorAll('.faq-btn').forEach(function(btn) {
    var text = (btn.textContent || '').trim().replace(/[▾▴▸▹►▼▽↓↑›→✕]/g, '').trim();
    var fresh = btn.cloneNode(false);
    fresh.textContent = text;
    btn.parentNode.replaceChild(fresh, btn);
    fresh.addEventListener('click', function() {
      var answer = fresh.nextElementSibling;
      if (!answer) return;
      var isOpen = answer.style.maxHeight && answer.style.maxHeight !== '0px';
      document.querySelectorAll('.faq-answer').forEach(function(a) { a.style.maxHeight = '0px'; });
      document.querySelectorAll('.faq-btn').forEach(function(b) { b.classList.remove('open'); });
      if (!isOpen) {
        answer.style.maxHeight = answer.scrollHeight + 'px';
        fresh.classList.add('open');
      }
    });
  });
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFaq);
} else {
  initFaq();
}

// Contact form
const form = document.getElementById('contact-form');
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('.form-btn');
    btn.textContent = 'Enviando...';
    btn.disabled = true;
    const data = Object.fromEntries(new FormData(form));
    try {
      await fetch('/api/contact?slug={{SLUG}}', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      btn.textContent = '✓ Mensaje enviado';
      form.reset();
    } catch {
      btn.textContent = 'Error — intenta nuevamente';
      btn.disabled = false;
    }
  });
}
</script>
</head>
<body>
{{BODY_CONTENT}}
${waNumber ? `<a class="wa-float" href="https://wa.me/${waNumber}" target="_blank" rel="noopener" aria-label="WhatsApp">
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="white" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
</a>` : ''}
</body>
</html>`
}

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return err('No has iniciado sesión', 401)

    const body = await req.json()
    const {
      freeText, name, slug, category, primary_color,
      reviews, logoUrl, coverUrl, galleryUrls = [],
      existingServices = [],
    } = body

    if (!freeText && !name) {
      return err('Escribe algo sobre el negocio para comenzar.', 400)
    }

    const color = primary_color ?? '#6366f1'

    const finalSlug = (slug || name || 'mi-negocio')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')

    type Service = { name: string; description: string; price: string; featured?: boolean }

    // ── Paso 1: Extraer servicios (llamada dedicada) ─────────────
    let siteServices: Service[] = []
    const textForServices = [freeText, name, category].filter(Boolean).join('\n').slice(0, 2000)

    if (textForServices) {
      try {
        const svcMsg = await anthropic.messages.create({
          model: 'claude-sonnet-4-5',
          max_tokens: 600,
          system: 'Devuelves ÚNICAMENTE un JSON array válido. Sin texto adicional, sin markdown, sin explicaciones.',
          messages: [{
            role: 'user',
            content: `Del siguiente texto de negocio, devuelve entre 3 y 6 servicios como JSON array.
Si no hay servicios explícitos, inventa servicios realistas para el rubro descrito.
SIEMPRE devuelve al menos 3 servicios.
Formato exacto:
[{"name":"nombre corto","description":"qué incluye en 1 oración","price":"$precio o vacío"}]

Texto: ${textForServices}`,
          }],
        })
        const raw = svcMsg.content[0].type === 'text' ? svcMsg.content[0].text.trim() : ''
        console.log('[svc-extract] raw:', raw.slice(0, 300))
        const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
        const start = cleaned.indexOf('[')
        const end = cleaned.lastIndexOf(']')
        if (start !== -1 && end > start) {
          const parsed = JSON.parse(cleaned.slice(start, end + 1))
          if (Array.isArray(parsed)) {
            siteServices = parsed.filter((s: Service) => s && typeof s.name === 'string' && s.name.trim())
          }
        }
        console.log('[svc-extract] found:', siteServices.length, 'services')
      } catch (e) {
        console.warn('[svc-extract] error:', e instanceof Error ? e.message : e)
      }
    }

    // Fallback: servicios del editor si la extracción falló
    if (!siteServices.length && Array.isArray(existingServices) && existingServices.length > 0) {
      siteServices = existingServices as Service[]
      console.log('[svc-extract] fallback to existingServices:', siteServices.length)
    }
    console.log('[svc-extract] final siteServices count:', siteServices.length)

    // Extraer datos de contacto del texto del negocio
    const allText = [freeText, name, category, reviews].filter(Boolean).join(' ')
    const phoneMatch = allText.match(/(?:\+?56\s?)?9\s?\d{4}\s?\d{4}/)
    const rawPhone = phoneMatch?.[0]?.replace(/\D/g, '') ?? ''
    const waNumber = rawPhone ? (rawPhone.startsWith('56') ? rawPhone : '56' + rawPhone) : ''
    const igMatch = allText.match(/instagram\.com\/([a-zA-Z0-9_.]+)|@([a-zA-Z0-9_.]{3,})/i)
    const igHandle = igMatch?.[1] || igMatch?.[2] || ''
    const fbMatch = allText.match(/facebook\.com\/([a-zA-Z0-9_.]+)/i)
    const fbPage = fbMatch?.[1] || ''
    const tkMatch = allText.match(/tiktok\.com\/@?([a-zA-Z0-9_.]+)/i)
    const tkHandle = tkMatch?.[1] || ''

    const baseHtml = buildBaseHtml(color, coverUrl, logoUrl, waNumber)

    // ── System prompt ─────────────────────────────────────────
    const systemPrompt = `Eres un copywriter y desarrollador web experto en crear sitios web de alto impacto para pequeños negocios latinoamericanos.

Se te dará una plantilla HTML base ya estructurada con CSS profesional. Tu trabajo es completar el contenido del sitio web usando las clases CSS ya definidas.

REGLAS CRÍTICAS:
1. Usa SOLO las clases CSS ya definidas en la plantilla (card, card-grid, step, price-card, review-card, faq-item, etc.)
2. NO agregues estilos inline adicionales salvo excepciones muy justificadas
3. Todos los textos deben ser auténticos al negocio — NADA genérico
4. NUNCA uses: "calidad garantizada", "comprometidos con", "tu satisfacción", "somos líderes"
5. Extrae contacto, servicios y datos reales del texto dado
6. Responde SOLO con el contenido que va dentro de {{BODY_CONTENT}} — desde <nav> hasta antes de </body>
   (el script del FAQ y contacto ya está incluido, no lo repitas)`

    // ── User prompt ───────────────────────────────────────────
    const gallerySection = galleryUrls.length > 0
      ? `
<section id="galeria">
  <span class="section-tag">Galería</span>
  <h2 class="section-title">Nuestros trabajos</h2>
  <p class="section-subtitle">Resultados reales, clientes reales.</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1rem">
    ${galleryUrls.map((u: string) => `<img src="${u}" alt="" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:10px;border:1px solid var(--border)">`).join('\n    ')}
  </div>
</section>`
      : ''

    const servicesForPrompt = siteServices.length > 0
      ? siteServices.map(s => `• ${s.name}${s.price ? ` (${s.price})` : ''}: ${s.description || ''}`).join('\n')
      : '(extrae del texto del negocio)'

    const userPrompt = `═══ INFORMACIÓN DEL NEGOCIO ═══
${freeText ? `${freeText}\n` : ''}
${name ? `Nombre: ${name}` : ''}
${category ? `Rubro: ${category}` : ''}
${reviews ? `\nRESEÑAS:\n${reviews}` : ''}
${logoUrl ? `Logo URL: ${logoUrl}` : ''}
${coverUrl ? `Imagen de portada: ${coverUrl}` : ''}

SERVICIOS (úsalos en el copy del sitio):
${servicesForPrompt}

Color de marca: ${color}
Slug del sitio: ${finalSlug}
${waNumber ? `Número WhatsApp: +${waNumber}` : ''}

═══ ESTRUCTURA QUE DEBES GENERAR ═══

⚡ REGLA FUNDAMENTAL: Amelia (el chat IA del negocio) es SIEMPRE el método principal de contacto, reserva y consulta. Los botones de Amelia deben ser los más prominentes. WhatsApp y formulario son opciones secundarias.

1. NAV — usa clase nav-logo (${logoUrl ? `incluye <img src="${logoUrl}" alt="">` : 'solo texto'}), nav-links con smooth scroll a secciones.
   nav-cta: OBLIGATORIO usar <button class="nav-cta amelia-trigger">✨ Reservar con Amelia</button>

2. HERO (#inicio) — .hero-inner con:
   - .hero-badge con stat relevante del negocio (ej: "⚡ +500 clientes satisfechos")
   - .hero-title con la clase .accent en 1-3 palabras clave del título (en color acento)
   - .hero-subtitle con <strong> en frases clave
   - .hero-ctas: PRIMER botón SIEMPRE es <button class="btn-amelia amelia-trigger"><span class="amelia-icon">✨</span> Hablar con Amelia</button>
     Segundo: btn-secondary (ver servicios → smooth scroll)
     ${waNumber ? `Tercero OBLIGATORIO: <a id="amelia-wa-hero" class="btn-wa" href="https://wa.me/${waNumber}" target="_blank">WhatsApp</a>` : ''}
   - .hero-stats: 4 stats relevantes al negocio con .stat-num y .stat-label

3. SERVICIOS — section id="servicios", con:
   - section-tag + section-title + section-subtitle creativos para el negocio
   - Luego EXACTAMENTE este div sin modificarlo: <div id="amelia-services-container" class="card-grid"></div>
   (Las cards se renderizan automáticamente desde el JSON de servicios)

4. PROCESO — section id="proceso", steps-grid con 4 pasos: step-num (01,02,03,04), step-title, step-desc

5. PRECIOS — section id="precios", con:
   - section-tag + section-title + section-subtitle creativos
   - Luego EXACTAMENTE este div sin modificarlo: <div id="amelia-pricing-container" class="pricing-grid"></div>
   (Las cards de precios se renderizan automáticamente)

6. TESTIMONIOS — section id="testimonios", reviews-grid con ${reviews ? 'las reseñas reales dadas (máximo 3)' : '3 testimonios generados realistas para el rubro'}. Cada review-card con review-stars (★★★★★), review-text entre comillas, review-author con .review-avatar (inicial del nombre), review-name, review-role

7. FAQ — section id="faq", .faq-list con 6 preguntas frecuentes reales del rubro. Estructura: div.faq-item > button.faq-btn > [texto pregunta + span.faq-arrow ▾] > div.faq-answer > p

8. CONTACTO — section id="contacto", con:
   - ANTES del .contact-grid: <span class="section-tag">Contacto</span><h2 class="section-title">Contáctanos</h2>
   - .contact-grid con dos columnas:
   - Izq: .contact-info con los datos reales extraídos del texto. Cada dato va así (EXACTAMENTE esta estructura):
     <div class="contact-item">
       <span class="contact-icon">EMOJI</span>
       <div>
         <p class="contact-label">ETIQUETA CORTA</p>
         <p class="contact-val">Valor del dato</p>
       </div>
     </div>
     Incluir: dirección/zona, horario, teléfono/WhatsApp, y cualquier otro dato disponible.
     DESPUÉS de los contact-item, agrega exactamente esto (no lo modifiques):
     <div id="amelia-social-links"></div>
   - Der: SOLO el formulario de contacto, sin bloques de Amelia:
     <form id="contact-form" class="contact-form">
       <input class="form-input" name="senderName" placeholder="Tu nombre" required>
       <input class="form-input" type="email" name="senderEmail" placeholder="Tu email">
       <textarea class="form-input" name="message" placeholder="¿En qué te podemos ayudar?" required></textarea>
       <button type="submit" class="form-btn">Enviar mensaje</button>
     </form>

${gallerySection}

9. FOOTER — footer con .footer-brand (nombre), .footer-tagline (frase memorable), .footer-copy (© ${new Date().getFullYear()} nombre)

⚠️ NO generes el botón flotante de WhatsApp — se inyecta automáticamente.

⚠️ REGLA ABSOLUTA PARA BOTONES:
- CUALQUIER botón que lleve a reservar, cotizar, contactar, pedir, agendar, consultar → class="amelia-trigger" o "btn-amelia amelia-trigger" o "price-cta amelia-trigger"
- SOLO los links de Instagram (<a href="https://instagram.com/...">) pueden ser links externos
- NO uses <a href="#contacto"> para acciones — usa <button class="amelia-trigger">

Genera el HTML completo del BODY_CONTENT ahora (desde <nav> hasta el footer). Solo el HTML, sin explicaciones.`

    // ── Llamada a Claude (con reintentos por sobrecarga) ─────────
    const MODELS = ['claude-sonnet-4-5', 'claude-sonnet-4-5']
    let message
    let lastErr: unknown

    for (let attempt = 0; attempt < 3; attempt++) {
      const model = MODELS[Math.min(attempt, MODELS.length - 1)]
      try {
        message = await anthropic.messages.create({
          model,
          max_tokens: 6000,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        })
        break // éxito
      } catch (apiErr) {
        lastErr = apiErr
        const msg = apiErr instanceof Error ? apiErr.message : String(apiErr)
        const isOverloaded = msg.includes('529') || msg.includes('overloaded') || msg.includes('529')
        console.warn(`Intento ${attempt + 1} fallido (${model}):`, msg)
        if (!isOverloaded || attempt === 2) break
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1))) // 2s, 4s
      }
    }

    if (!message) {
      const msg = lastErr instanceof Error ? lastErr.message : String(lastErr)
      console.error('Anthropic API error (premium) tras reintentos:', msg)
      return err('La IA está muy ocupada ahora mismo. Intenta en unos segundos.')
    }

    let bodyContent = message.content[0].type === 'text' ? message.content[0].text : ''

    // Limpiar markdown y tags de cierre que romperían el HTML shell
    bodyContent = bodyContent
      .replace(/^```html\n?/, '').replace(/^```\n?/, '').replace(/```$/, '')
      .replace(/<\/body\s*>/gi, '')   // Claude a veces los agrega — rompen el <script> de buildBaseHtml
      .replace(/<\/html\s*>/gi, '')
      .trim()

    if (!bodyContent.includes('<nav') && !bodyContent.includes('<header')) {
      console.error('Premium body missing nav. Raw:', bodyContent.slice(0, 500))
      return err('La IA devolvió un formato inesperado. Intenta nuevamente.')
    }

    // Limpiar residuos
    bodyContent = bodyContent.replace(/<!--AMELIA_SERVICES:[\s\S]*?-->/g, '').trim()
    bodyContent = bodyContent.replace(/<script[^>]*id="amelia-services-data"[^>]*>[\s\S]*?<\/script>/g, '')
    bodyContent = bodyContent.replace(/<(?:a|div)[^>]+class="[^"]*wa-float[^"]*"[^>]*>[\s\S]*?<\/(?:a|div)>/gi, '')

    // ── Inyectar servicios como HTML ESTÁTICO (sin depender de JS) ──
    if (siteServices.length > 0) {
      const svcIcons = ['🔧','⚙️','🛠','✨','💡','🎯','🔍','📋','🏆','⭐','💎','🚀']
      const serviceCardsHtml = siteServices.map((s: Service, i: number) =>
        `<div class="card">` +
        `<div class="card-icon">${svcIcons[i % svcIcons.length]}</div>` +
        `<div class="card-title">${s.name}</div>` +
        `<div class="card-desc">${s.description || ''}</div>` +
        `</div>`
      ).join('\n')
      const svcContainerHtml = `<div id="amelia-services-container" class="card-grid">\n${serviceCardsHtml}\n</div>`

      if (bodyContent.includes('id="amelia-services-container"')) {
        // Claude generó el container (vacío o con contenido) → reemplazarlo
        const idx = bodyContent.indexOf('id="amelia-services-container"')
        const divStart = bodyContent.lastIndexOf('<div', idx)
        const divEnd = bodyContent.indexOf('</div>', idx)
        if (divStart !== -1 && divEnd !== -1) {
          bodyContent = bodyContent.slice(0, divStart) + svcContainerHtml + bodyContent.slice(divEnd + 6)
        }
      } else {
        // Claude no generó el container — buscamos la sección servicios
        const svcSectionIdx = bodyContent.search(/id=["'][^"']*servicio[^"']*["']/i)
        if (svcSectionIdx !== -1) {
          const sectionEnd = bodyContent.indexOf('</section>', svcSectionIdx)
          if (sectionEnd !== -1) {
            bodyContent = bodyContent.slice(0, sectionEnd) +
              '\n' + svcContainerHtml + '\n' +
              bodyContent.slice(sectionEnd)
          }
        } else {
          // Fallback final: crear sección de servicios completa después del nav
          const afterNav = bodyContent.indexOf('</nav>')
          if (afterNav !== -1) {
            const insertAt = afterNav + 6
            bodyContent = bodyContent.slice(0, insertAt) +
              `\n<section id="servicios">\n<span class="section-tag">Servicios</span>\n<h2 class="section-title">Nuestros Servicios</h2>\n${svcContainerHtml}\n</section>\n` +
              bodyContent.slice(insertAt)
          }
        }
      }
      console.log('[services] Inyectados', siteServices.length, 'servicios como HTML estático')
    }

    // ── Inyectar PRECIOS como HTML estático ───────────────────────
    if (siteServices.length > 0) {
      const featuredIdx = siteServices.findIndex((s: Service) => s.featured)
      const ordered = [...siteServices]
      if (featuredIdx >= 0 && ordered.length >= 2) {
        const mid = Math.floor(ordered.length / 2)
        const [feat] = ordered.splice(featuredIdx, 1)
        ordered.splice(mid, 0, feat)
      }

      const pricingCardsHtml = ordered.map((s: Service) => {
        const isFeat = !!s.featured
        const hasPrice = s.price && s.price.trim()
        return `<div class="price-card${isFeat ? ' featured' : ''}">
  ${isFeat ? '<span class="price-badge">Más popular</span>' : ''}
  <div class="price-icon">${isFeat ? '⭐' : '💼'}</div>
  <div class="price-name">${s.name}</div>
  ${hasPrice
    ? `<div class="price-amount">${s.price}</div>`
    : `<div class="price-amount no-price">Consultar</div>`}
  <div class="price-desc">${s.description || ''}</div>
  <button class="price-cta amelia-trigger" data-service="${s.name}">Reservar con Amelia →</button>
</div>`
      }).join('\n')

      const pricingContainerHtml = `<div id="amelia-pricing-container" class="pricing-grid">\n${pricingCardsHtml}\n</div>`

      if (bodyContent.includes('id="amelia-pricing-container"')) {
        const idx = bodyContent.indexOf('id="amelia-pricing-container"')
        const divStart = bodyContent.lastIndexOf('<div', idx)
        const divEnd = bodyContent.indexOf('</div>', idx)
        if (divStart !== -1 && divEnd !== -1) {
          bodyContent = bodyContent.slice(0, divStart) + pricingContainerHtml + bodyContent.slice(divEnd + 6)
        }
      } else {
        const priceSectionIdx = bodyContent.search(/id=["'][^"']*preci[^"']*["']/i)
        if (priceSectionIdx !== -1) {
          const sectionEnd = bodyContent.indexOf('</section>', priceSectionIdx)
          if (sectionEnd !== -1) {
            bodyContent = bodyContent.slice(0, sectionEnd) +
              '\n' + pricingContainerHtml + '\n' +
              bodyContent.slice(sectionEnd)
          }
        }
      }
      console.log('[pricing] Inyectados', ordered.length, 'precios como HTML estático')
    }

    // ── Inyectar redes sociales (WA + IG + FB + TK) server-side ──
    const svgWa = `<svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`
    const svgIg = `<svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`
    const svgFb = `<svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`
    const svgTk = `<svg viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.2 8.2 0 004.79 1.52V6.75a4.85 4.85 0 01-1.02-.06z"/></svg>`

    const socialLinks = [
      waNumber   ? `<a class="social-link wa" href="https://wa.me/${waNumber}" target="_blank" rel="noopener">${svgWa}WhatsApp</a>` : '',
      igHandle   ? `<a class="social-link ig" href="https://instagram.com/${igHandle}" target="_blank" rel="noopener">${svgIg}Instagram</a>` : '',
      fbPage     ? `<a class="social-link fb" href="https://facebook.com/${fbPage}" target="_blank" rel="noopener">${svgFb}Facebook</a>` : '',
      tkHandle   ? `<a class="social-link tk" href="https://tiktok.com/@${tkHandle}" target="_blank" rel="noopener">${svgTk}TikTok</a>` : '',
    ].filter(Boolean).join('\n')

    if (socialLinks) {
      const socialHtml = `<div id="amelia-social-links" class="social-links">\n${socialLinks}\n</div>`
      if (bodyContent.includes('id="amelia-social-links"')) {
        bodyContent = bodyContent.replace(/<div[^>]*id="amelia-social-links"[^>]*><\/div>/, socialHtml)
      } else {
        // Fallback: insertar al final del contact-info
        const contactIdx = bodyContent.search(/id=["']contacto["']/i)
        if (contactIdx !== -1) {
          const infoEnd = bodyContent.indexOf('</div>', bodyContent.indexOf('class="contact-info"', contactIdx))
          if (infoEnd !== -1) bodyContent = bodyContent.slice(0, infoEnd) + '\n' + socialHtml + '\n' + bodyContent.slice(infoEnd)
        }
      }
      console.log('[social] Inyectados:', waNumber ? 'WA' : '', igHandle ? 'IG' : '', fbPage ? 'FB' : '', tkHandle ? 'TK' : '')
    }

    // Inyectar WA button en hero si Claude no lo incluyó
    if (waNumber && !bodyContent.includes('amelia-wa-hero')) {
      const heroCtasIdx = bodyContent.indexOf('class="hero-ctas"')
      if (heroCtasIdx !== -1) {
        const ctasEnd = bodyContent.indexOf('</div>', heroCtasIdx)
        if (ctasEnd !== -1) {
          const waHeroBtn = `<a id="amelia-wa-hero" class="btn-wa" href="https://wa.me/${waNumber}" target="_blank" rel="noopener">${svgWa}WhatsApp</a>`
          bodyContent = bodyContent.slice(0, ctasEnd) + '\n' + waHeroBtn + '\n' + bodyContent.slice(ctasEnd)
        }
      }
    }

    // Script JSON (ya no se usa para servicios ni pricing, queda como data)
    const servicesScriptTag = `<script id="amelia-services-data" type="application/json">${JSON.stringify(siteServices)}</script>`
    const finalHtml = baseHtml
      .replace('{{BODY_CONTENT}}', bodyContent + '\n' + servicesScriptTag)
      .replace(/\{\{SLUG\}\}/g, finalSlug)
      .replace(/\{\{BUSINESS_NAME\}\}/g, name || 'Mi Negocio')

    const finalName = name || 'Mi Negocio'
    const finalCategory = category || 'Negocio'
    const finalSlugClean = finalSlug || finalName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

    // ── Extraer contenido estructurado del HTML generado ──────────
    // FAQ
    const extractedFaq: { q: string; a: string }[] = []
    bodyContent.split('<div class="faq-item"').slice(1).forEach(chunk => {
      const qMatch = chunk.match(/<button[^>]*>([\s\S]*?)(?:<span[^>]*>|<\/button>)/)
      const aMatch = chunk.match(/<(?:p|div)[^>]*class="[^"]*faq-answer[^"]*"[^>]*>([\s\S]*?)<\/(?:p|div)>/)
      const q = qMatch?.[1]?.replace(/<[^>]+>/g, '').trim()
      const a = aMatch?.[1]?.replace(/<[^>]+>/g, '').trim()
      if (q && a) extractedFaq.push({ q, a })
    })

    // Pasos (proceso)
    const extractedSteps: { title: string; desc: string }[] = []
    bodyContent.split('<div class="step"').slice(1).forEach(chunk => {
      const tMatch = chunk.match(/<[^>]*class="[^"]*step-title[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/)
      const dMatch = chunk.match(/<[^>]*class="[^"]*step-desc[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/)
      const title = tMatch?.[1]?.replace(/<[^>]+>/g, '').trim()
      const desc = dMatch?.[1]?.replace(/<[^>]+>/g, '').trim()
      if (title && desc) extractedSteps.push({ title, desc })
    })

    // Beneficios
    const extractedBenefits: { icon: string; title: string; desc: string }[] = []
    bodyContent.split('<div class="benefit-card"').slice(1).forEach(chunk => {
      const iconMatch = chunk.match(/<[^>]*class="[^"]*benefit-icon[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/)
      const tMatch = chunk.match(/<[^>]*class="[^"]*benefit-title[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/)
      const dMatch = chunk.match(/<[^>]*class="[^"]*benefit-desc[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/)
      const icon = iconMatch?.[1]?.replace(/<[^>]+>/g, '').trim() || '✅'
      const title = tMatch?.[1]?.replace(/<[^>]+>/g, '').trim()
      const desc = dMatch?.[1]?.replace(/<[^>]+>/g, '').trim()
      if (title) extractedBenefits.push({ icon, title, desc: desc || '' })
    })

    // Reseñas
    const extractedReviews: { author: string; rating: number; text: string }[] = []
    bodyContent.split('<div class="review-card"').slice(1).forEach(chunk => {
      const textMatch = chunk.match(/<[^>]*class="[^"]*review-text[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/)
      const nameMatch = chunk.match(/<[^>]*class="[^"]*review-name[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/)
      const text = textMatch?.[1]?.replace(/<[^>]+>/g, '').replace(/[""]/g, '').trim()
      const author = nameMatch?.[1]?.replace(/<[^>]+>/g, '').replace(/^—\s*/, '').trim()
      if (text && author) extractedReviews.push({ author, rating: 5, text })
    })

    // Pricing desde servicios (ya los tenemos estructurados)
    const extractedPricing = siteServices.map(s => ({
      title: s.name,
      price: s.price || '',
      desc: s.description || '',
      highlighted: !!s.featured,
    }))

    const content = {
      htmlSite: finalHtml,
      hero: { title: finalName, subtitle: '', cta: 'Reservar con Amelia' },
      about: { text: freeText?.slice(0, 300) || '' },
      services: siteServices,
      pricing: extractedPricing,
      faq: extractedFaq,
      steps: extractedSteps,
      benefits: extractedBenefits,
      reviews: extractedReviews,
      contact: {
        cta: 'Reservar con Amelia',
        phone: waNumber ? waNumber : '',
        whatsapp: waNumber ? waNumber : '',
        address: '',
        instagram: igHandle || '',
        facebook: fbPage || '',
        tiktok: tkHandle || '',
      },
      footer: { tagline: finalName },
    }

    // ── Guardar en Supabase ──────────────────────────────────────
    const businessData = {
      owner_id:      user.id,
      name:          finalName,
      slug:          finalSlugClean,
      category:      finalCategory,
      description:   freeText?.slice(0, 500) || '',
      primary_color: color,
      logo_url:      logoUrl ?? null,
      cover_url:     coverUrl ?? null,
    }

    const { data: existingBiz, error: findError } = await supabase
      .from('businesses').select('id, slug').eq('owner_id', user.id).single()

    if (findError && findError.code !== 'PGRST116') {
      return err('Error al buscar datos del negocio.')
    }

    let business: { id: string; slug: string }

    if (existingBiz) {
      const { data: updated, error: updateError } = await supabase
        .from('businesses').update(businessData).eq('id', existingBiz.id)
        .select('id, slug').single()
      if (updateError) {
        if (updateError.code === '23505') {
          const newSlug = `${finalSlugClean}-${Date.now().toString(36)}`
          const { data: retried, error: retryError } = await supabase
            .from('businesses').update({ ...businessData, slug: newSlug }).eq('id', existingBiz.id)
            .select('id, slug').single()
          if (retryError) return err('Error al guardar el negocio.')
          business = retried!
        } else {
          return err('Error al actualizar el negocio.')
        }
      } else {
        business = updated!
      }
    } else {
      const { data: created, error: createError } = await supabase
        .from('businesses').insert(businessData).select('id, slug').single()
      if (createError) {
        if (createError.code === '23505') {
          const newSlug = `${finalSlugClean}-${Date.now().toString(36)}`
          const { data: retried, error: retryError } = await supabase
            .from('businesses').insert({ ...businessData, slug: newSlug }).select('id, slug').single()
          if (retryError) return err('URL ya en uso.')
          business = retried!
        } else {
          return err(`Error al crear el negocio: ${createError.message}`)
        }
      } else {
        business = created!
      }
    }

    // Preservar datos de contacto existentes (no borrarlos al regenerar)
    const { data: existingSite } = await supabase
      .from('sites').select('content').eq('business_id', business.id).single()
    if (existingSite?.content) {
      type ContactSaved = { phone?: string; whatsapp?: string; address?: string; instagram?: string; facebook?: string; tiktok?: string; cta?: string }
      const saved = (existingSite.content as { contact?: ContactSaved }).contact ?? {}
      content.contact = {
        cta: content.contact.cta,
        phone:     content.contact.phone     || saved.phone     || '',
        whatsapp:  content.contact.whatsapp  || saved.whatsapp  || '',
        address:   content.contact.address   || saved.address   || '',
        instagram: content.contact.instagram || saved.instagram || '',
        facebook:  content.contact.facebook  || saved.facebook  || '',
        tiktok:    content.contact.tiktok    || saved.tiktok    || '',
      }
    }

    const { data: savedSite, error: siteError } = await supabase
      .from('sites').upsert(
        { business_id: business.id, content, status: 'draft', template_id: 'premium' },
        { onConflict: 'business_id' }
      ).select('id, status').single()

    if (siteError || !savedSite) {
      return err('El sitio fue generado pero no se pudo guardar.')
    }

    return NextResponse.json({
      business: { ...business, name: finalName, slug: business.slug },
      content,
      saved: true,
      siteId: savedSite.id,
    })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Error en generate-site-premium:', msg, error)
    return err(`Error inesperado: ${msg}`)
  }
}
