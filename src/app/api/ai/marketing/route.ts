import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  const { message, action } = await req.json()
  const supabase = await createClient()

  // Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  // Cargar datos del negocio
  const { data: biz } = await supabase
    .from('businesses')
    .select('id, name, category, description')
    .eq('owner_id', user.id)
    .single()

  if (!biz) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

  // Cargar en paralelo: productos, clientes, reservas del mes, sitio
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: products }, { data: clients }, { data: bookingsMonth }, { data: site }] =
    await Promise.all([
      supabase.from('products').select('name, price').eq('business_id', biz.id).limit(20),
      supabase.from('clients').select('last_visit, total_visits').eq('business_id', biz.id),
      supabase.from('bookings').select('service, status').eq('business_id', biz.id).gte('date', firstOfMonth),
      supabase.from('sites').select('content').eq('business_id', biz.id).single(),
    ])

  const totalClients    = clients?.length ?? 0
  const activeClients   = clients?.filter(c => c.last_visit && c.last_visit >= thirtyDaysAgo).length ?? 0
  const inactiveClients = clients?.filter(c => !c.last_visit || c.last_visit < ninetyDaysAgo).length ?? 0
  const bookingCount    = bookingsMonth?.filter(b => b.status !== 'cancelled').length ?? 0
  const topServices     = Array.from(new Set(bookingsMonth?.map(b => b.service) ?? [])).slice(0, 5)

  const content = site?.content as Record<string, unknown> | null
  const services = (content?.services as { name: string; price?: string }[] | undefined)
    ?.map(s => `${s.name}${s.price ? ` ($${s.price})` : ''}`)
    .join(', ') ?? 'No especificado'

  const systemPrompt = `Eres el agente de marketing de **${biz.name}**, un negocio chileno de tipo "${biz.category}".
${biz.description ? `Descripción: ${biz.description}` : ''}

## Datos del negocio
- **Servicios:** ${services}
- **Productos:** ${products?.map(p => `${p.name}${p.price ? ` ($${p.price?.toLocaleString('es-CL')})` : ''}`).join(', ') || 'Sin productos'}
- **Clientes totales:** ${totalClients}
- **Clientes activos (últimos 30 días):** ${activeClients}
- **Clientes inactivos (+90 días sin visita):** ${inactiveClients}
- **Reservas este mes:** ${bookingCount}
- **Servicios más reservados:** ${topServices.join(', ') || 'Sin datos aún'}

## Tu rol
Eres un experto en marketing digital para pequeños negocios chilenos. Hablas en español chileno natural, directo y cercano. Tus respuestas son accionables — el dueño puede usar lo que generas HOY.

## Formato de respuestas
- Usa emojis con moderación para hacer el contenido más visual
- Para posts de redes sociales, muestra el texto listo para copiar entre comillas o en bloque
- Para planes, usa listas numeradas claras
- Máximo 600 palabras por respuesta
- Siempre adapta el tono al tipo de negocio (${biz.category})`

  const userMessage = action
    ? `[Acción rápida: ${action}]\n${message}`
    : message

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
