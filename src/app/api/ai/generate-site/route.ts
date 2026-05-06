import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
      tone, services, reviews, logoUrl, coverUrl, galleryUrls = [],
    } = body

    if (!freeText && !name) {
      return err('Escribe algo sobre el negocio para comenzar.', 400)
    }

    const finalSlug = (slug || name || 'mi-negocio')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')

    // ── Prompt para Claude ──────────────────────────────────
    const prompt = `Eres un experto en marketing digital y diseño web para pequeños negocios latinoamericanos.

Analiza TODA la información y genera el contenido completo del sitio web.

═══ INFORMACIÓN DEL NEGOCIO ═══
${freeText ? `DESCRIPCIÓN LIBRE:\n${freeText}\n` : ''}
${name ? `Nombre: ${name}` : ''}
${category ? `Rubro: ${category}` : ''}
${tone ? `Tono de comunicación: ${tone}` : ''}
${services ? `Servicios mencionados: ${services}` : ''}
${reviews ? `═══ RESEÑAS DE GOOGLE ═══\n${reviews}` : ''}
${logoUrl ? 'Tiene logo: SÍ' : ''}
${coverUrl ? 'Tiene foto de portada: SÍ' : ''}
${galleryUrls.length > 0 ? `Tiene galería: SÍ (${galleryUrls.length} fotos)` : ''}

INSTRUCCIONES:
1. Detecta nombre, rubro y servicios del texto libre si no fueron indicados explícitamente
2. Si hay reseñas, selecciona las 3-4 mejores
3. Usa español latinoamericano natural
4. Nunca uses frases genéricas como "calidad garantizada" o "comprometidos con la excelencia"
5. Títulos creativos y únicos para este negocio específico

Responde SOLO con JSON válido sin backticks ni texto extra:
{
  "detectedName": "nombre detectado si no fue dado",
  "detectedCategory": "rubro detectado",
  "detectedSlug": "slug-del-negocio",
  "hero": { "title": "Título creativo 7 palabras máx", "subtitle": "Subtítulo específico 18 palabras máx", "cta": "Verbo + beneficio 3-5 palabras" },
  "about": { "text": "2-3 oraciones auténticas sobre el negocio" },
  "services": [{ "name": "Nombre", "description": "Descripción 1 oración", "price": "" }],
  "reviews": ${reviews ? '[{ "author": "Nombre", "rating": 5, "text": "Reseña seleccionada" }]' : '[]'},
  "contact": { "cta": "Llamada a la acción específica" },
  "footer": { "tagline": "Frase memorable 8 palabras máx" }
}`

    // ── Llamada a Claude ────────────────────────────────────
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!claudeRes.ok) {
      const errorText = await claudeRes.text()
      console.error('Claude API error:', claudeRes.status, errorText)
      return err('No pudimos conectar con la IA. Intenta nuevamente.')
    }

    const claudeData = await claudeRes.json()
    const rawText = claudeData.content?.[0]?.text ?? ''
    const clean = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let aiResult: {
      detectedName?: string
      detectedCategory?: string
      detectedSlug?: string
      hero: { title: string; subtitle: string; cta: string }
      about: { text: string }
      services: { name: string; description: string; price: string }[]
      reviews?: { author: string; rating: number; text: string }[]
      contact: { cta: string }
      footer: { tagline: string }
    }

    try {
      aiResult = JSON.parse(clean)
    } catch (parseError) {
      console.error('JSON parse error. Raw text:', rawText)
      return err('La IA devolvió un formato inesperado. Intenta nuevamente.')
    }

    const finalName     = name || aiResult.detectedName || 'Mi Negocio'
    const finalCategory = category || aiResult.detectedCategory || 'Negocio'
    const finalSlugClean = finalSlug || aiResult.detectedSlug || 'mi-negocio'

    const content = {
      hero:     aiResult.hero,
      about:    aiResult.about,
      services: aiResult.services ?? [],
      reviews:  aiResult.reviews ?? [],
      gallery:  galleryUrls,
      contact:  aiResult.contact,
      footer:   aiResult.footer,
    }

    // ── Guardar en Supabase — con manejo explícito de errores ─
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

    // Buscar si ya existe un negocio para este usuario
    const { data: existingBiz, error: findError } = await supabase
      .from('businesses')
      .select('id, slug')
      .eq('owner_id', user.id)
      .single()

    if (findError && findError.code !== 'PGRST116') {
      // PGRST116 = no rows found, eso es OK
      console.error('Error buscando negocio:', findError)
      return err('Error al buscar datos del negocio.')
    }

    let business: { id: string; slug: string }

    if (existingBiz) {
      // Actualizar negocio existente
      const { data: updated, error: updateError } = await supabase
        .from('businesses')
        .update(businessData)
        .eq('id', existingBiz.id)
        .select('id, slug')
        .single()

      if (updateError) {
        console.error('Error actualizando negocio:', updateError)
        if (updateError.code === '23505') {
          // Slug duplicado — agregar sufijo
          const newSlug = `${finalSlugClean}-${Date.now().toString(36)}`
          const { data: retried, error: retryError } = await supabase
            .from('businesses')
            .update({ ...businessData, slug: newSlug })
            .eq('id', existingBiz.id)
            .select('id, slug')
            .single()
          if (retryError) return err('Error al guardar el negocio. Intenta con una URL diferente.')
          business = retried!
        } else {
          return err('Error al actualizar el negocio.')
        }
      } else {
        business = updated!
      }
    } else {
      // Crear negocio nuevo
      const { data: created, error: createError } = await supabase
        .from('businesses')
        .insert(businessData)
        .select('id, slug')
        .single()

      if (createError) {
        console.error('Error creando negocio:', createError)
        if (createError.code === '23505') {
          const newSlug = `${finalSlugClean}-${Date.now().toString(36)}`
          const { data: retried, error: retryError } = await supabase
            .from('businesses')
            .insert({ ...businessData, slug: newSlug })
            .select('id, slug')
            .single()
          if (retryError) return err('Esa URL ya está en uso. La IA eligió una alternativa pero también falló. Intenta con otro nombre.')
          business = retried!
        } else {
          return err(`Error al crear el negocio: ${createError.message}`)
        }
      } else {
        business = created!
      }
    }

    // ── Guardar el sitio ─────────────────────────────────────
    const { data: savedSite, error: siteError } = await supabase
      .from('sites')
      .upsert(
        { business_id: business.id, content, status: 'draft' },
        { onConflict: 'business_id' }
      )
      .select('id, status')
      .single()

    if (siteError) {
      console.error('Error guardando sitio:', siteError)
      return err('El contenido fue generado pero no se pudo guardar. Intenta nuevamente.')
    }

    if (!savedSite) {
      console.error('Sitio guardado pero no retornó datos')
      return err('Error de verificación al guardar. Recarga la página e intenta de nuevo.')
    }

    // ── Verificación final — confirmar que quedó en BD ────────
    const { data: verification, error: verifyError } = await supabase
      .from('sites')
      .select('id, business_id, status')
      .eq('business_id', business.id)
      .single()

    if (verifyError || !verification) {
      console.error('Fallo en verificación:', verifyError)
      return err('El sitio no pudo ser verificado en la base de datos. Intenta nuevamente.')
    }

    console.log(`✅ Sitio guardado y verificado: business=${business.id}, site=${verification.id}`)

    return NextResponse.json({
      business: { ...business, name: finalName, slug: business.slug },
      content,
      saved: true,
      siteId: verification.id,
    })

  } catch (error) {
    console.error('Error inesperado en generate-site:', error)
    return err('Ocurrió un error inesperado. Por favor intenta nuevamente.')
  }
}
