import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

interface Message { role: 'user' | 'assistant'; content: string }

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { messages }: { messages: Message[] } = await req.json()
  if (!messages?.length) return NextResponse.json({ error: 'Sin mensajes' }, { status: 400 })

  // Cargar contexto del negocio
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: biz } = await admin
    .from('businesses')
    .select('id, name, category, description, slug, is_published')
    .eq('owner_id', user.id)
    .single()

  let contextBlock = ''

  if (biz) {
    // Cargar datos del negocio en paralelo
    const [
      { data: products },
      { data: orders },
      { data: clients },
      { data: bookings },
      { data: promotions },
    ] = await Promise.all([
      admin.from('products')
        .select('name, price, cost_price, stock, unit')
        .eq('business_id', biz.id).limit(30),
      admin.from('orders')
        .select('total, status, items, created_at, client_name')
        .eq('business_id', biz.id)
        .order('created_at', { ascending: false }).limit(20),
      admin.from('clients')
        .select('name, total_visits, last_visit')
        .eq('business_id', biz.id)
        .order('total_visits', { ascending: false }).limit(20),
      admin.from('bookings')
        .select('service_name, status, booking_date, client_name')
        .eq('business_id', biz.id)
        .order('booking_date', { ascending: false }).limit(20),
      admin.from('promotions')
        .select('name, type, value, applies_to, active')
        .eq('business_id', biz.id).eq('active', true),
    ])

    // Calcular métricas rápidas
    const completedOrders = orders?.filter(o => o.status === 'completed') ?? []
    const pendingOrders   = orders?.filter(o => o.status === 'pending') ?? []
    const totalRevenue    = completedOrders.reduce((s, o) => s + (o.total ?? 0), 0)
    const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
    const monthRevenue = completedOrders
      .filter(o => o.created_at?.startsWith(thisMonth))
      .reduce((s, o) => s + (o.total ?? 0), 0)

    const lowStockProducts = products?.filter(p => p.stock != null && p.stock <= 5) ?? []

    contextBlock = `
═══ CONTEXTO DEL NEGOCIO ═══
Nombre: ${biz.name}
Rubro: ${biz.category}
Sitio: ${biz.is_published ? `https://amelia.app/sitio/${biz.slug} (publicado)` : 'Sin publicar aún'}
${biz.description ? `Descripción: ${biz.description}` : ''}

📦 PRODUCTOS (${products?.length ?? 0} total):
${products?.slice(0,15).map(p =>
  `• ${p.name} — $${p.price?.toLocaleString('es-CL') ?? '—'} venta${p.cost_price ? `, $${p.cost_price.toLocaleString('es-CL')} costo` : ''}${p.stock != null ? `, ${p.stock} ${p.unit ?? 'uds'} en stock` : ''}`
).join('\n') ?? 'Sin productos'}

🛒 PEDIDOS:
• Pendientes: ${pendingOrders.length}
• Completados (total): ${completedOrders.length}
• Ingresos totales: $${totalRevenue.toLocaleString('es-CL')} CLP
• Ingresos este mes (${MESES[now.getMonth()]}): $${monthRevenue.toLocaleString('es-CL')} CLP
${pendingOrders.length > 0 ? `• Últimos pendientes: ${pendingOrders.slice(0,3).map(o => o.client_name).join(', ')}` : ''}

👥 CLIENTES: ${clients?.length ?? 0} registrados
${clients?.slice(0,5).map(c => `• ${c.name} — ${c.total_visits} visita(s)`).join('\n') ?? ''}

📅 CITAS RECIENTES:
${bookings?.slice(0,5).map(b => `• ${b.booking_date?.slice(0,10)} — ${b.client_name} (${b.service_name}) [${b.status}]`).join('\n') ?? 'Sin citas'}

🏷️ PROMOCIONES ACTIVAS: ${promotions?.length ?? 0}
${promotions?.map(p => `• ${p.name}: ${p.type === 'percent' ? `${p.value}%` : `$${p.value}`} de descuento`).join('\n') ?? ''}

${lowStockProducts.length > 0 ? `⚠️ STOCK BAJO:\n${lowStockProducts.map(p => `• ${p.name}: ${p.stock} ${p.unit ?? 'uds'}`).join('\n')}` : ''}

Fecha actual: ${now.getDate()} de ${['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][now.getMonth()]} ${now.getFullYear()}
═══════════════════════════`
  }

  const systemPrompt = `Eres Amelia, la asistente IA personal del dueño de este negocio. Eres directa, inteligente y conoces a fondo el negocio.

TU PERSONALIDAD:
• Hablas en español latinoamericano, de forma cercana pero profesional
• Eres concisa — no das vueltas, vas al punto
• Cuando el dueño te pregunta algo de su negocio, usas los datos reales que tienes
• Das consejos accionables, no genéricos
• Reconoces cuando no tienes suficiente información y lo dices

TUS CAPACIDADES:
• Analizar el rendimiento del negocio con datos reales
• Sugerir estrategias de marketing, promociones y precios
• Ayudar a redactar textos: descripciones de productos, posts de Instagram, mensajes a clientes
• Responder preguntas sobre pedidos, clientes y métricas
• Dar ideas para mejorar el negocio basadas en su rubro y situación actual
• Ayudar a preparar respuestas a reseñas o mensajes de clientes

REGLAS:
• Si preguntan por datos específicos que sí tienes (pedidos, productos, ventas), dálos exactos
• No inventes datos que no están en el contexto
• Máximo 4-6 párrafos por respuesta, salvo que pidan algo largo (un texto de marketing, por ejemplo)
• Usa emojis con moderación — uno por punto, no en cada oración
${contextBlock}`

  // Streaming response
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await anthropic.messages.stream({
          model: 'claude-sonnet-4-5',
          max_tokens: 1024,
          system: systemPrompt,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
        })

        for await (const chunk of response) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
        controller.close()
      } catch (e) {
        controller.enqueue(encoder.encode('\n\n[Error al procesar la respuesta]'))
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  })
}
