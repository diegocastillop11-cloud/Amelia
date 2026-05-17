import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { business_id, content, business_name, template_id, primary_color } = await req.json()

    const isSuperAdmin = user.email === process.env.SUPERADMIN_EMAIL
    if (!isSuperAdmin) {
      const { data: biz } = await supabase
        .from('businesses').select('owner_id').eq('id', business_id).single()
      if (!biz || biz.owner_id !== user.id)
        return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    // Actualizar nombre y color en businesses
    const bizUpdate: Record<string, string> = {}
    if (primary_color) bizUpdate.primary_color = primary_color
    if (business_name) bizUpdate.name = business_name
    if (Object.keys(bizUpdate).length > 0) {
      await supabase.from('businesses').update(bizUpdate).eq('id', business_id)
    }

    // Si es sitio premium (tiene htmlSite), sincronizar servicios y precios en el HTML
    if (content?.htmlSite && Array.isArray(content.services) && content.services.length > 0) {
      type Service = { name: string; description: string; price: string; featured?: boolean }
      const services = content.services as Service[]

      // 1. Actualizar el JSON embebido (para compatibilidad)
      const servicesJson = JSON.stringify(services)
      content.htmlSite = (content.htmlSite as string).replace(
        /<script[^>]+id="amelia-services-data"[^>]*>[\s\S]*?<\/script>/,
        `<script id="amelia-services-data" type="application/json">${servicesJson}</script>`
      )

      // 2. Regenerar HTML estático de SERVICIOS
      const svcIcons = ['🔧','⚙️','🛠','✨','💡','🎯','🔍','📋','🏆','⭐','💎','🚀']
      const serviceCardsHtml = services.map((s: Service, i: number) =>
        `<div class="card">` +
        `<div class="card-icon">${svcIcons[i % svcIcons.length]}</div>` +
        `<div class="card-title">${s.name}</div>` +
        `<div class="card-desc">${s.description || ''}</div>` +
        `</div>`
      ).join('\n')
      const svcContainerHtml = `<div id="amelia-services-container" class="card-grid">\n${serviceCardsHtml}\n</div>`

      const svcIdx = (content.htmlSite as string).indexOf('id="amelia-services-container"')
      if (svcIdx !== -1) {
        const divStart = (content.htmlSite as string).lastIndexOf('<div', svcIdx)
        // Encontrar el cierre del container (puede tener hijos, contar divs)
        let depth = 0, pos = divStart, html = content.htmlSite as string
        while (pos < html.length) {
          const open = html.indexOf('<div', pos + 1)
          const close = html.indexOf('</div>', pos + 1)
          if (close === -1) break
          if (open !== -1 && open < close) { depth++; pos = open }
          else { if (depth === 0) { content.htmlSite = html.slice(0, divStart) + svcContainerHtml + html.slice(close + 6); break } depth--; pos = close }
        }
      }

      // 3. Regenerar HTML estático de PRECIOS
      const ordered = [...services]
      const featIdx = ordered.findIndex((s: Service) => s.featured)
      if (featIdx >= 0 && ordered.length >= 2) {
        const mid = Math.floor(ordered.length / 2)
        const [feat] = ordered.splice(featIdx, 1)
        ordered.splice(mid, 0, feat)
      }
      const pricingCardsHtml = ordered.map((s: Service) => {
        const isFeat = !!s.featured
        const hasPrice = s.price && s.price.trim()
        return `<div class="price-card${isFeat ? ' featured' : ''}">
  ${isFeat ? '<span class="price-badge">Más popular</span>' : ''}
  <div class="price-icon">${isFeat ? '⭐' : '💼'}</div>
  <div class="price-name">${s.name}</div>
  ${hasPrice ? `<div class="price-amount">${s.price}</div>` : `<div class="price-amount no-price">Consultar</div>`}
  <div class="price-desc">${s.description || ''}</div>
  <button class="price-cta amelia-trigger" data-service="${s.name}">Reservar con Amelia →</button>
</div>`
      }).join('\n')
      const pricingContainerHtml = `<div id="amelia-pricing-container" class="pricing-grid">\n${pricingCardsHtml}\n</div>`

      const priceIdx = (content.htmlSite as string).indexOf('id="amelia-pricing-container"')
      if (priceIdx !== -1) {
        const divStart2 = (content.htmlSite as string).lastIndexOf('<div', priceIdx)
        let depth2 = 0, pos2 = divStart2, html2 = content.htmlSite as string
        while (pos2 < html2.length) {
          const open2 = html2.indexOf('<div', pos2 + 1)
          const close2 = html2.indexOf('</div>', pos2 + 1)
          if (close2 === -1) break
          if (open2 !== -1 && open2 < close2) { depth2++; pos2 = open2 }
          else { if (depth2 === 0) { content.htmlSite = html2.slice(0, divStart2) + pricingContainerHtml + html2.slice(close2 + 6); break } depth2--; pos2 = close2 }
        }
      }
    }

    // 4. Sincronizar FAQ si existe htmlSite y content.faq
    if (content?.htmlSite && Array.isArray(content.faq) && content.faq.length > 0) {
      type FaqItem = { q: string; a: string }
      const faq = content.faq as FaqItem[]
      const faqItemsHtml = faq.map((item: FaqItem) =>
        `<div class="faq-item">\n` +
        `  <button class="faq-btn">${item.q}<span class="faq-arrow">▾</span></button>\n` +
        `  <div class="faq-answer"><p>${item.a}</p></div>\n` +
        `</div>`
      ).join('\n')

      const html = content.htmlSite as string
      const faqListIdx = html.indexOf('class="faq-list"')
      if (faqListIdx !== -1) {
        const divStart = html.lastIndexOf('<div', faqListIdx)
        let depth = 0, pos = divStart, h = html
        while (pos < h.length) {
          const open = h.indexOf('<div', pos + 1)
          const close = h.indexOf('</div>', pos + 1)
          if (close === -1) break
          if (open !== -1 && open < close) { depth++; pos = open }
          else { if (depth === 0) { content.htmlSite = h.slice(0, divStart) + `<div class="faq-list">\n${faqItemsHtml}\n</div>` + h.slice(close + 6); break } depth--; pos = close }
        }
      }
    }

    // 5. Sincronizar redes sociales desde content.contact
    if (content?.htmlSite) {
      type ContactData = { phone?: string; whatsapp?: string; instagram?: string; facebook?: string; tiktok?: string }
      const contact = (content.contact ?? {}) as ContactData

      // Extraer número WA (usa whatsapp > phone)
      const rawWa = (contact.whatsapp || contact.phone || '').replace(/\D/g, '')
      const waNum = rawWa.length >= 8 ? (rawWa.startsWith('56') ? rawWa : '56' + rawWa) : ''

      // Extraer handle de Instagram (acepta @handle, instagram.com/handle o solo handle)
      const igRaw = (contact.instagram || '').trim()
        .replace(/^@/, '').replace(/https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/$/, '')
      const igHandle = igRaw.replace(/[^a-zA-Z0-9_.]/g, '')

      const fbRaw = (contact.facebook || '').trim()
        .replace(/https?:\/\/(www\.)?facebook\.com\//i, '').replace(/\/$/, '')

      const tkRaw = (contact.tiktok || '').trim()
        .replace(/^@/, '').replace(/https?:\/\/(www\.)?tiktok\.com\/@?/i, '').replace(/\/$/, '')

      const svgWa = `<svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`
      const svgIg = `<svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`
      const svgFb = `<svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`
      const svgTk = `<svg viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.2 8.2 0 004.79 1.52V6.75a4.85 4.85 0 01-1.02-.06z"/></svg>`

      const links = [
        waNum    ? `<a class="social-link wa" href="https://wa.me/${waNum}" target="_blank" rel="noopener">${svgWa}WhatsApp</a>` : '',
        igHandle ? `<a class="social-link ig" href="https://instagram.com/${igHandle}" target="_blank" rel="noopener">${svgIg}Instagram</a>` : '',
        fbRaw    ? `<a class="social-link fb" href="https://facebook.com/${fbRaw}" target="_blank" rel="noopener">${svgFb}Facebook</a>` : '',
        tkRaw    ? `<a class="social-link tk" href="https://tiktok.com/@${tkRaw}" target="_blank" rel="noopener">${svgTk}TikTok</a>` : '',
      ].filter(Boolean).join('\n')

      if (links) {
        const socialHtml = `<div id="amelia-social-links" class="social-links">\n${links}\n</div>`
        const html = content.htmlSite as string

        if (html.includes('id="amelia-social-links"')) {
          // Reemplazar placeholder o bloque anterior
          content.htmlSite = html.replace(/<div[^>]*id="amelia-social-links"[^>]*>[\s\S]*?<\/div>/, socialHtml)
        } else {
          // Inyectar al final del contact-info
          const contactIdx = html.search(/id=["']contacto["']/i)
          if (contactIdx !== -1) {
            const infoClassIdx = html.indexOf('class="contact-info"', contactIdx)
            if (infoClassIdx !== -1) {
              const infoEnd = html.indexOf('</div>', infoClassIdx)
              if (infoEnd !== -1)
                content.htmlSite = html.slice(0, infoEnd) + '\n' + socialHtml + '\n' + html.slice(infoEnd)
            }
          }
        }
      }
    }

    // Guardar content y template en sites
    const { error } = await supabase.from('sites')
      .update({ content, template_id: template_id ?? 'moderna' })
      .eq('business_id', business_id)

    if (error) {
      console.error('Save error:', error)
      return NextResponse.json({ error: 'Error al guardar los cambios.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno al guardar.' }, { status: 500 })
  }
}
