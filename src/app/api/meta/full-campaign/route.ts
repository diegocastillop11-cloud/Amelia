import { NextResponse }                                                      from 'next/server'
import Anthropic                                                              from '@anthropic-ai/sdk'
import { createClient }                                                       from '@/lib/supabase/server'
import { generateAdImage }                                                    from '@/lib/fal'
import {
  uploadAdImage,
  createCampaign,
  createAdSet,
  createAdCreative,
  createAd,
} from '@/lib/meta'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const OBJECTIVE_LABELS: Record<string, string> = {
  OUTCOME_TRAFFIC:    'atraer tráfico al sitio web',
  OUTCOME_AWARENESS:  'dar a conocer el negocio',
  OUTCOME_ENGAGEMENT: 'generar interacción',
  OUTCOME_LEADS:      'captar clientes potenciales',
  OUTCOME_SALES:      'generar ventas directas',
}

// POST /api/meta/full-campaign
// Body: { objective, daily_budget, age_min?, age_max? }
// Response: SSE stream con pasos de progreso

type CopyData = { campaign_name: string; headline: string; primary_text: string; description: string; cta: string; image_prompt: string }

export async function POST(req: Request) {
  const {
    objective, daily_budget, age_min = 18, age_max = 55,
    saved_copy, saved_image_hash: _saved_hash, saved_image_url,
    manual_image_hash,
  }: {
    objective: string; daily_budget: number; age_min?: number; age_max?: number
    saved_copy?:        CopyData
    saved_image_hash?:  string
    saved_image_url?:   string
    manual_image_hash?: string   // imagen subida manualmente por el usuario
  } = await req.json()

  // mutable para poder asignarlo en el paso 3
  let saved_image_hash: string | undefined = _saved_hash

  const encoder = new TextEncoder()

  // Carga todos los datos antes de abrir el stream
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: biz } = await supabase
    .from('businesses')
    .select('id, name, category, description')
    .eq('owner_id', user.id)
    .single()
  if (!biz) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

  const { data: conn } = await supabase
    .from('meta_connections')
    .select('access_token, ad_account_id, page_id, currency')
    .eq('business_id', biz.id)
    .single()
  if (!conn?.ad_account_id) return NextResponse.json({ error: 'No hay cuenta publicitaria' }, { status: 400 })
  if (!conn.page_id)        return NextResponse.json({ error: 'No hay página de Facebook seleccionada' }, { status: 400 })

  // Obtener URL del sitio
  const [{ data: products }, { data: site }] = await Promise.all([
    supabase.from('products').select('name, price').eq('business_id', biz.id).limit(6),
    supabase.from('sites').select('content, slug').eq('business_id', biz.id).single(),
  ])

  // Monedas sin decimales — Meta espera el valor tal cual, sin * 100
  const ZERO_DECIMAL = ['CLP','JPY','KRW','VND','IDR','HUF','TWD','BIF','DJF','GNF','ISK','KMF','MGA','PYG','RWF','UGX','XAF','XOF','XPF']
  const acctCurrency = (conn.currency ?? 'USD').toUpperCase()
  const budgetInUnits = ZERO_DECIMAL.includes(acctCurrency)
    ? Math.round(Number(daily_budget))
    : Math.round(Number(daily_budget) * 100)

  const siteContent  = site?.content as Record<string, unknown> | null
  const services     = (siteContent?.services as { name: string; price?: string }[] | undefined)
    ?.map(s => `${s.name}${s.price ? ` ($${s.price})` : ''}`)
    .join(', ') ?? ''
  const rawUrl  = site?.slug
    ? `${process.env.NEXT_PUBLIC_APP_URL}/sitio/${site.slug}`
    : process.env.NEXT_PUBLIC_APP_URL
  const isPublic = rawUrl && !rawUrl.includes('localhost') && !rawUrl.includes('127.0.0.1') && rawUrl.startsWith('https://')
  if (!isPublic) return NextResponse.json(
    { error: 'Necesitas un dominio público (https://) para crear anuncios. Configura NEXT_PUBLIC_APP_URL con tu dominio real.' },
    { status: 400 }
  )
  const siteUrl = rawUrl!

  // ── SSE stream ───────────────────────────────────────────────────────────────
  const readable = new ReadableStream({
    async start(controller) {

      const send = (data: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))

      try {
        const resuming = !!(saved_copy && saved_image_hash)

        // ── Paso 1: Generar copy ──────────────────────────────────────────────
        let copy: CopyData
        if (resuming) {
          copy = saved_copy!
          send({ step: 'copy', label: 'Copy reutilizado ✓', done: true, skipped: true, copyData: copy })
        } else {
          send({ step: 'copy', label: 'Generando copy con IA...' })
          const copyPrompt = `Eres experto en publicidad digital para pequeños negocios chilenos.

Negocio: ${biz.name} (${biz.category})
${biz.description ? `Descripción: ${biz.description}` : ''}
${services ? `Servicios: ${services}` : ''}
${products?.length ? `Productos: ${products.map(p => `${p.name}${p.price ? ` $${p.price}` : ''}`).join(', ')}` : ''}

Objetivo: ${OBJECTIVE_LABELS[objective] ?? objective}

Responde SOLO con JSON válido (sin markdown):
{
  "campaign_name": "nombre de campaña (máx 50 chars)",
  "headline": "titular (máx 40 chars, impactante)",
  "primary_text": "texto principal (máx 125 chars, persuasivo, español chileno coloquial)",
  "description": "descripción (máx 30 chars)",
  "cta": "uno de: LEARN_MORE | SHOP_NOW | SIGN_UP | CONTACT_US | GET_QUOTE | BOOK_TRAVEL",
  "image_prompt": "prompt en inglés para generar imagen publicitaria con IA. Debe ser una escena profesional relacionada al negocio, sin texto, sin personas reales, estilo fotografía comercial limpia con buen lighting. Máx 80 palabras."
}`
          try {
            const msg      = await anthropic.messages.create({ model: 'claude-haiku-4-5', max_tokens: 600, messages: [{ role: 'user', content: copyPrompt }] })
            const raw      = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
            const copyText = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
            copy           = JSON.parse(copyText)
          } catch (e) { throw new Error(`Paso 1 (copy): ${String(e)}`) }
          send({ step: 'copy', label: 'Copy generado ✓', done: true, copyData: copy })
        }

        // ── Paso 2: Generar imagen ────────────────────────────────────────────
        let imageUrl: string
        if (manual_image_hash) {
          // Imagen subida manualmente — saltar generación y upload
          imageUrl = ''
          send({ step: 'image',  label: 'Imagen manual ✓',      done: true, skipped: true })
          send({ step: 'upload', label: 'Imagen lista en Meta ✓', done: true, skipped: true, imageHash: manual_image_hash })
        } else if (resuming) {
          imageUrl = saved_image_url!
          send({ step: 'image',  label: 'Imagen reutilizada ✓', done: true, skipped: true, imageUrl })
          send({ step: 'upload', label: 'Hash reutilizado ✓',   done: true, skipped: true, imageHash: saved_image_hash })
        } else {
          send({ step: 'image', label: 'Generando imagen con IA...' })
          let imageBuffer: ArrayBuffer
          try {
            const img   = await generateAdImage(copy.image_prompt)
            imageUrl    = img.url
            imageBuffer = img.buffer
          } catch (e) { throw new Error(`Paso 2 (imagen): ${String(e)}`) }
          send({ step: 'image', label: 'Imagen generada ✓', done: true, imageUrl })

          // ── Paso 3: Subir imagen a Meta ───────────────────────────────────
          send({ step: 'upload', label: 'Subiendo imagen a Meta...' })
          try {
            saved_image_hash = await uploadAdImage(conn.access_token, conn.ad_account_id!, imageBuffer)
          } catch (e) { throw new Error(`Paso 3 (upload Meta): ${String(e)}`) }
          send({ step: 'upload', label: 'Imagen lista en Meta ✓', done: true, imageHash: saved_image_hash })
        }

        const imageHash = (manual_image_hash ?? saved_image_hash)!

        // ── Paso 4: Crear campaña ─────────────────────────────────────────────
        send({ step: 'campaign', label: 'Creando campaña...' })

        let campaign: { id: string }
        try {
          campaign = await createCampaign(conn.access_token, conn.ad_account_id!, {
            name:      copy.campaign_name,
            objective,
          })
          console.log('[Meta] Campaign creada:', campaign.id)
        } catch (e) { throw new Error(`Paso 4 (campaña): ${String(e)}`) }

        send({ step: 'campaign', label: 'Campaña creada ✓', done: true })

        // ── Paso 5: Crear conjunto de anuncios ───────────────────────────────
        send({ step: 'adset', label: 'Creando segmentación...' })

        let adSet: { id: string }
        try {
          adSet = await createAdSet(conn.access_token, conn.ad_account_id!, {
            name:        `${copy.campaign_name} — Conjunto`,
            campaignId:  campaign.id,
            objective,
            ageMin:      age_min,
            ageMax:      age_max,
            dailyBudget: budgetInUnits,
          })
          console.log('[Meta] AdSet creado:', adSet.id)
        } catch (e) { throw new Error(`Paso 5 (ad set): ${String(e)}`) }

        send({ step: 'adset', label: 'Segmentación lista ✓', done: true })

        // ── Paso 6: Crear creativo ────────────────────────────────────────────
        send({ step: 'creative', label: 'Armando anuncio creativo...' })

        let creative: { id: string }
        try {
          creative = await createAdCreative(conn.access_token, conn.ad_account_id!, {
            name:        copy.campaign_name,
            pageId:      conn.page_id!,
            imageHash,
            primaryText: copy.primary_text,
            headline:    copy.headline,
            description: copy.description,
            cta:         copy.cta,
            linkUrl:     siteUrl,
          })
          console.log('[Meta] Creative creado:', creative.id)
        } catch (e) { throw new Error(`Paso 6 (creative): ${String(e)}`) }

        send({ step: 'creative', label: 'Creativo listo ✓', done: true })

        // ── Paso 7: Crear anuncio ─────────────────────────────────────────────
        send({ step: 'ad', label: 'Creando anuncio final...' })

        let ad: { id: string }
        try {
          ad = await createAd(conn.access_token, conn.ad_account_id!, {
            name:       copy.campaign_name,
            adSetId:    adSet.id,
            creativeId: creative.id,
          })
          console.log('[Meta] Ad creado:', ad.id)
        } catch (e) { throw new Error(`Paso 7 (ad): ${String(e)}`) }

        send({ step: 'ad', label: 'Anuncio creado ✓', done: true })

        // ── Listo ─────────────────────────────────────────────────────────────
        send({
          step: 'done',
          label: '¡Listo! Todo en pausa, revisa antes de activar.',
          data: {
            campaign_id:  campaign.id,
            adset_id:     adSet.id,
            creative_id:  creative.id,
            ad_id:        ad.id,
            image_url:    imageUrl,
            campaign_name: copy.campaign_name,
            headline:     copy.headline,
            primary_text: copy.primary_text,
          },
        })

      } catch (err) {
        console.error('full-campaign error:', err)
        send({ step: 'error', message: String(err) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  })
}
