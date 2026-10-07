import { NextResponse }         from 'next/server'
import { createClient }         from '@/lib/supabase/server'
import { createServiceClient }  from '@/lib/supabase/service'
import { sendWhatsAppMessage, markAsRead } from '@/lib/whatsapp'
import Anthropic                from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── GET — Verificación del webhook por Meta ────────────────────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('[WhatsApp] Webhook verificado ✓')
    return new Response(challenge, { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

// ── POST — Recibir mensajes de WhatsApp ───────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Meta envía pings de prueba — responder 200 siempre
    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ ok: true })
    }

    const entry   = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value   = changes?.value

    // Solo procesar mensajes entrantes (ignorar status updates)
    if (!value?.messages?.length) return NextResponse.json({ ok: true })

    const msg        = value.messages[0]
    const phoneNumId = value.metadata?.phone_number_id

    // Solo mensajes de texto por ahora
    if (msg.type !== 'text') return NextResponse.json({ ok: true })

    const customerPhone = msg.from
    const customerText  = msg.text?.body ?? ''
    const messageId     = msg.id

    // Usar service client (no hay sesión de usuario en un webhook)
    const supabase = createServiceClient()

    // Encontrar el negocio por phone_number_id
    const { data: conn } = await supabase
      .from('whatsapp_connections')
      .select('business_id, access_token, phone_number_id')
      .eq('phone_number_id', phoneNumId)
      .eq('is_active', true)
      .single()

    if (!conn) {
      console.warn('[WhatsApp] No se encontró conexión para phone_number_id:', phoneNumId)
      return NextResponse.json({ ok: true })
    }

    // Marcar como leído
    await markAsRead(messageId, phoneNumId, conn.access_token).catch(() => {})

    // Cargar o crear conversación
    const { data: conv } = await supabase
      .from('whatsapp_conversations')
      .select('id, messages, customer_name')
      .eq('business_id', conn.business_id)
      .eq('customer_phone', customerPhone)
      .maybeSingle()

    const history: { role: string; content: string; ts: number }[] = conv?.messages ?? []

    // Agregar mensaje del cliente al historial
    history.push({ role: 'user', content: customerText, ts: Date.now() })

    // Cargar contexto del negocio
    const { data: biz } = await supabase
      .from('businesses')
      .select('name, category, description')
      .eq('id', conn.business_id)
      .single()

    const { data: products } = await supabase
      .from('products')
      .select('name, price, description')
      .eq('business_id', conn.business_id)
      .limit(10)

    const { data: site } = await supabase
      .from('sites')
      .select('content')
      .eq('business_id', conn.business_id)
      .maybeSingle()

    const siteContent = site?.content as Record<string, unknown> | null
    const services    = (siteContent?.services as { name: string; price?: string }[] | undefined)
      ?.map(s => `${s.name}${s.price ? ` ($${s.price})` : ''}`)
      .join(', ') ?? ''

    // Cargar horarios
    const today = new Date().toLocaleDateString('es-CL', { weekday: 'long' }).toLowerCase()
    const { data: schedules } = await supabase
      .from('schedules')
      .select('day_of_week, start_time, end_time, is_active')
      .eq('business_id', conn.business_id)
      .eq('is_active', true)

    const horariosText = schedules?.map(s =>
      `${s.day_of_week}: ${s.start_time} - ${s.end_time}`
    ).join(', ') ?? 'Consultar disponibilidad'

    // Historial para Claude (últimos 10 mensajes)
    const recentHistory = history.slice(-10)
    const claudeMessages = recentHistory.map(m => ({
      role:    m.role as 'user' | 'assistant',
      content: m.content,
    }))

    // System prompt
    const systemPrompt = `Eres Amelia, la asistente de WhatsApp de "${biz?.name ?? 'este negocio'}" (${biz?.category ?? ''}).
${biz?.description ? `Descripción: ${biz.description}` : ''}
${services ? `Servicios: ${services}` : ''}
${products?.length ? `Productos: ${products.map(p => `${p.name}${p.price ? ` $${p.price}` : ''}`).join(', ')}` : ''}
Horarios: ${horariosText}
Hoy es ${today}.

Responde siempre en español, de forma amigable y directa. Máximo 3-4 líneas por mensaje (es WhatsApp, no un email).
Si el cliente quiere reservar, pide: nombre completo, teléfono y el servicio que desea.
No inventes precios ni horarios que no estén en el contexto.
Si no sabes algo, di que el dueño se contactará pronto.`

    // Generar respuesta con Claude
    const response = await anthropic.messages.create({
      model:      'claude-haiku-4-5',
      max_tokens: 300,
      system:     systemPrompt,
      messages:   claudeMessages,
    })

    const replyText = response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : 'Gracias por tu mensaje, te respondo pronto 😊'

    // Enviar respuesta por WhatsApp
    await sendWhatsAppMessage(customerPhone, replyText, phoneNumId, conn.access_token)

    // Guardar respuesta en historial
    history.push({ role: 'assistant', content: replyText, ts: Date.now() })

    // Upsert conversación
    await supabase
      .from('whatsapp_conversations')
      .upsert({
        business_id:     conn.business_id,
        customer_phone:  customerPhone,
        customer_name:   conv?.customer_name ?? null,
        messages:        history.slice(-50), // máx 50 mensajes
        last_message_at: new Date().toISOString(),
      }, { onConflict: 'business_id,customer_phone' })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[WhatsApp webhook error]', err)
    // Siempre responder 200 a Meta para evitar reintentos
    return NextResponse.json({ ok: true })
  }
}
