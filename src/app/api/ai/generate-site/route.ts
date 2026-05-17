import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function err(msg: string, status = 500) {
  return NextResponse.json({ error: msg }, { status })
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
    } = body

    if (!freeText && !name) {
      return err('Escribe algo sobre el negocio para comenzar.', 400)
    }

    const finalSlug = (slug || name || 'mi-negocio')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')

    // ── Sistema ──────────────────────────────────────────────────
    const systemPrompt = `Eres el mejor especialista de marketing digital para pequeños negocios latinoamericanos. Tu trabajo es generar sitios web completos, persuasivos y profesionales que conviertan visitantes en clientes.

PRINCIPIOS QUE SIGUES SIN EXCEPCIÓN:
1. Cada texto debe sonar auténtico y local — como si lo hubiera escrito el propio dueño del negocio
2. NUNCA uses estas frases prohibidas: "calidad garantizada", "comprometidos con la excelencia", "atención personalizada", "años de experiencia", "somos líderes", "los mejores", "tu satisfacción es nuestra prioridad"
3. Los títulos deben ser específicos — no genéricos. Si es una barbería "El Navajero", el título no puede ser "Tu Mejor Imagen Comienza Aquí"
4. Extrae TODO lo que puedas del texto libre: contacto, servicios con precios, historia, diferenciadores, barrio/ciudad, horarios
5. Si hay reseñas, úsalas para entender qué hace especial al negocio y reflejarlo en el contenido
6. El tono debe coincidir con el tipo de negocio: una barbería urbana es distinta a una clínica, y una pastelería artesanal es distinta a un restaurante

DETECCIÓN DE TIPO DE NEGOCIO:
- Servicios presenciales (barbería, salón, clínica, mecánico): enfatizar reserva de hora, ubicación, confianza
- Venta de productos (pastelería, tienda, boutique): enfatizar productos, precios, pedidos por WhatsApp
- Servicios profesionales (consultoría, agencia): enfatizar resultados, metodología, expertise
- Alimentación (restaurante, cafetería): enfatizar ambiente, menú, experiencia

EXTRACCIÓN DE DATOS DE CONTACTO:
Busca en el texto libre: teléfonos (+56 9 XXXX XXXX), WhatsApp, dirección, Instagram (@handle), horarios.

Responde SIEMPRE con JSON válido puro — sin backticks, sin markdown, sin texto adicional antes o después.`

    // ── Prompt de usuario ────────────────────────────────────────
    const reviewsSchema = reviews
      ? '[{ "author": "Nombre del autor (extraído de la reseña)", "rating": 5, "text": "Texto seleccionado de la reseña (máximo 100 caracteres)" }]'
      : '[]'

    const userPrompt = `Genera el contenido completo del sitio web para este negocio.

═══ INFORMACIÓN DISPONIBLE ═══
${freeText ? `TEXTO LIBRE DEL DUEÑO:\n"${freeText}"\n` : ''}
${name ? `Nombre: ${name}` : ''}
${category ? `Rubro: ${category}` : ''}
${reviews ? `\nRESEÑAS DE CLIENTES:\n${reviews}` : ''}
${logoUrl ? '✓ Tiene logo subido' : ''}
${coverUrl ? '✓ Tiene foto de portada subida' : ''}
${galleryUrls.length > 0 ? `✓ Tiene galería de ${galleryUrls.length} fotos` : ''}

═══ ESTRUCTURA REQUERIDA ═══
Devuelve exactamente este JSON (sin texto extra antes ni después):
{
  "detectedName": "nombre del negocio extraído del texto libre",
  "detectedCategory": "rubro específico (ej: 'Barbería', 'Pastelería artesanal', 'Clínica dental')",
  "detectedSlug": "url-amigable-del-negocio",
  "detectedTone": "una palabra: 'urbano' | 'elegante' | 'familiar' | 'profesional' | 'juvenil' | 'artesanal'",
  "hero": {
    "title": "Título poderoso y específico, máximo 7 palabras. DEBE reflejar algo único del negocio.",
    "subtitle": "Subtítulo con el valor real, máximo 20 palabras. Incluye ciudad/barrio si está disponible.",
    "cta": "Acción clara y directa, 3-5 palabras. Ej: 'Reserva tu hora', 'Pide tu torta', 'Cotiza gratis'"
  },
  "about": {
    "text": "2-3 oraciones sobre la historia real del negocio. Auténtico, genuino, con detalles del texto libre."
  },
  "services": [
    {
      "name": "Nombre específico del servicio o producto",
      "description": "Una oración que explique el beneficio real para el cliente",
      "price": "Precio o rango si está disponible, sino cadena vacía"
    }
  ],
  "benefits": [
    {
      "icon": "emoji relevante (ej: ⚡, 🎯, 💪, ✨, 🔒, 🚀, 🏆, 💰, 📍, 🕐, 🌟, 🤝)",
      "title": "Beneficio concreto en 3-5 palabras",
      "desc": "Explicación específica del beneficio para este negocio, 1 oración"
    }
  ],
  "steps": [
    {
      "title": "Nombre del paso adaptado al tipo de negocio",
      "desc": "Descripción breve de qué ocurre en este paso, 1 oración"
    }
  ],
  "faq": [
    {
      "q": "Pregunta frecuente real que haría un cliente de este tipo de negocio",
      "a": "Respuesta directa y honesta, 1-2 oraciones"
    }
  ],
  "pricing": [
    {
      "title": "Nombre del plan o servicio destacado",
      "price": "Precio si existe, sino 'Consultar' o 'Desde $X'",
      "desc": "Qué incluye, 1-2 oraciones",
      "highlighted": false
    }
  ],
  "reviews": ${reviewsSchema},
  "contact": {
    "cta": "Llamada a la acción específica para este negocio",
    "phone": "Teléfono extraído del texto libre o cadena vacía",
    "whatsapp": "Número de WhatsApp extraído o cadena vacía",
    "address": "Dirección extraída del texto libre o cadena vacía",
    "instagram": "Handle de Instagram con @ o cadena vacía"
  },
  "footer": {
    "tagline": "Frase que capture la esencia del negocio, máximo 8 palabras. Memorable y específica."
  }
}

REGLAS CRÍTICAS:
- Genera 4-8 servicios con precios si están disponibles
- Genera exactamente 5-6 beneficios específicos para este negocio (NO copiar genéricos)
- Genera exactamente 4 pasos adaptados al tipo de negocio (contacto → coordinación → servicio → resultado)
- Genera 5-7 preguntas frecuentes reales que haría un cliente de este rubro
- Para pricing: si hay precios en el texto úsalos (2-4 opciones, marca highlighted:true en la más popular); si no hay precios, crea 1-2 entradas con info de cobertura, horarios o promociones disponibles
- Datos de contacto: extrae del texto libre, NO inventes. Si no hay datos, cadena vacía.`

    // ── Llamada a Claude ─────────────────────────────────────────
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
    const clean = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let aiResult: {
      detectedName?: string
      detectedCategory?: string
      detectedSlug?: string
      detectedTone?: string
      hero: { title: string; subtitle: string; cta: string }
      about: { text: string }
      services: { name: string; description: string; price: string }[]
      benefits?: { icon: string; title: string; desc: string }[]
      steps?: { title: string; desc: string }[]
      faq?: { q: string; a: string }[]
      pricing?: { title: string; price?: string; desc: string; highlighted?: boolean }[]
      reviews?: { author: string; rating: number; text: string }[]
      contact: { cta: string; phone?: string; whatsapp?: string; address?: string; instagram?: string }
      footer: { tagline: string }
    }

    try {
      aiResult = JSON.parse(clean)
    } catch {
      console.error('JSON parse error. Raw text:', rawText)
      return err('La IA devolvió un formato inesperado. Intenta nuevamente.')
    }

    const finalName      = name || aiResult.detectedName || 'Mi Negocio'
    const finalCategory  = category || aiResult.detectedCategory || 'Negocio'
    const finalSlugClean = finalSlug || aiResult.detectedSlug || 'mi-negocio'

    const content = {
      hero:     aiResult.hero,
      about:    aiResult.about,
      services: aiResult.services ?? [],
      benefits: aiResult.benefits ?? [],
      steps:    aiResult.steps ?? [],
      faq:      aiResult.faq ?? [],
      pricing:  aiResult.pricing ?? [],
      reviews:  aiResult.reviews ?? [],
      gallery:  galleryUrls,
      contact:  {
        ...aiResult.contact,
        phone:     aiResult.contact.phone     || '',
        whatsapp:  aiResult.contact.whatsapp  || '',
        address:   aiResult.contact.address   || '',
        instagram: aiResult.contact.instagram || '',
      },
      footer:   aiResult.footer,
    }

    // ── Guardar en Supabase ──────────────────────────────────────
    const businessData = {
      owner_id:      user.id,
      name:          finalName,
      slug:          finalSlugClean,
      category:      finalCategory,
      description:   freeText?.slice(0, 500) || '',
      primary_color: primary_color ?? '#6366f1',
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
          if (retryError) return err('Error al guardar el negocio. Intenta con una URL diferente.')
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
          if (retryError) return err('URL ya en uso. Intenta con otro nombre.')
          business = retried!
        } else {
          return err(`Error al crear el negocio: ${createError.message}`)
        }
      } else {
        business = created!
      }
    }

    const { data: savedSite, error: siteError } = await supabase
      .from('sites').upsert(
        { business_id: business.id, content, status: 'draft', template_id: 'moderna' },
        { onConflict: 'business_id' }
      ).select('id, status').single()

    if (siteError || !savedSite) {
      return err('El contenido fue generado pero no se pudo guardar. Intenta nuevamente.')
    }

    const { data: verification, error: verifyError } = await supabase
      .from('sites').select('id').eq('business_id', business.id).single()

    if (verifyError || !verification) {
      return err('El sitio no pudo ser verificado. Intenta nuevamente.')
    }

    return NextResponse.json({
      business: { ...business, name: finalName, slug: business.slug },
      content,
      saved: true,
      siteId: verification.id,
    })

  } catch (error) {
    console.error('Error en generate-site:', error)
    return err('Ocurrió un error inesperado. Por favor intenta nuevamente.')
  }
}
