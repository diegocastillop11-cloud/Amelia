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

  const { data: owner } = await supabase.from('owners').select('is_superadmin').eq('id', user.id).single()
  if (!owner?.is_superadmin) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { messages }: { messages: Message[] } = await req.json()
  if (!messages?.length) return NextResponse.json({ error: 'Sin mensajes' }, { status: 400 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Cargar datos globales en paralelo
  const [
    { data: businesses },
    { data: licenses },
    { data: upgradeRequests },
    { data: recentOrders },
    { data: recentBookings },
  ] = await Promise.all([
    admin.from('businesses')
      .select('id, name, category, slug, is_published, created_at, owners(full_name, email)')
      .order('created_at', { ascending: false }),
    admin.from('licenses')
      .select('business_id, plan, modules, created_at'),
    admin.from('upgrade_requests')
      .select('business_id, plan, status, created_at')
      .order('created_at', { ascending: false }).limit(20),
    admin.from('orders')
      .select('business_id, total, status, created_at')
      .eq('status', 'completed')
      .order('created_at', { ascending: false }).limit(100),
    admin.from('bookings')
      .select('business_id, status, created_at')
      .order('created_at', { ascending: false }).limit(100),
  ])

  // Construir mapa de licencias
  const licMap = new Map((licenses ?? []).map(l => [l.business_id, l]))

  // Métricas globales
  const total = businesses?.length ?? 0
  const published = businesses?.filter(b => b.is_published).length ?? 0
  const drafts = total - published

  const planCount = { free: 0, pro: 0, premium: 0 }
  for (const lic of licenses ?? []) {
    if (lic.plan in planCount) planCount[lic.plan as keyof typeof planCount]++
  }
  const sinPlan = total - (planCount.free + planCount.pro + planCount.premium)

  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const lastMonth30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const newThisMonth = businesses?.filter(b => b.created_at?.startsWith(thisMonth)).length ?? 0

  // Revenue global
  const totalRevenue = (recentOrders ?? []).reduce((s, o) => s + (o.total ?? 0), 0)
  const monthRevenue = (recentOrders ?? [])
    .filter(o => o.created_at?.startsWith(thisMonth))
    .reduce((s, o) => s + (o.total ?? 0), 0)

  // Revenue por negocio (top 5)
  const revByBiz: Record<string, number> = {}
  for (const o of recentOrders ?? []) {
    revByBiz[o.business_id] = (revByBiz[o.business_id] ?? 0) + (o.total ?? 0)
  }
  const topBiz = Object.entries(revByBiz)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, rev]) => {
      const biz = businesses?.find(b => b.id === id)
      return `• ${biz?.name ?? id}: $${rev.toLocaleString('es-CL')} CLP`
    })

  const pendingUpgrades = (upgradeRequests ?? []).filter(u => u.status === 'pending')
  const recentBookingsMonth = (recentBookings ?? []).filter(b => b.created_at >= lastMonth30).length

  // Lista de clientes con su plan
  const clientList = (businesses ?? []).slice(0, 20).map(b => {
    const lic = licMap.get(b.id)
    const ownerData = b.owners as { full_name: string | null; email: string } | null
    return `• ${b.name} (${b.category}) — Plan: ${lic?.plan ?? 'free'} — ${b.is_published ? 'Publicado' : 'Borrador'} — ${ownerData?.email ?? '—'}`
  })

  const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

  const contextBlock = `
═══ CONTEXTO SUPERADMIN — AMELIA PLATAFORMA ═══
Fecha: ${now.getDate()} de ${MESES[now.getMonth()]} ${now.getFullYear()}

📊 MÉTRICAS GLOBALES:
• Total negocios: ${total} (${published} publicados, ${drafts} en borrador)
• Nuevos este mes: ${newThisMonth}
• Planes: Free: ${planCount.free + sinPlan} · Pro: ${planCount.pro} · Premium: ${planCount.premium}
• Upgrades pendientes de aprobar: ${pendingUpgrades.length}

💰 INGRESOS (ventas completadas en plataforma):
• Total acumulado: $${totalRevenue.toLocaleString('es-CL')} CLP
• Este mes (${MESES[now.getMonth()]}): $${monthRevenue.toLocaleString('es-CL')} CLP
• Top negocios por ingresos:
${topBiz.join('\n') || '• Sin datos aún'}

📅 ACTIVIDAD RECIENTE:
• Reservas últimos 30 días: ${recentBookingsMonth}
• Pedidos completados (últimos 100 cargados): ${recentOrders?.length ?? 0}

${pendingUpgrades.length > 0 ? `⚠️ UPGRADES PENDIENTES:\n${pendingUpgrades.slice(0,5).map(u => {
    const biz = businesses?.find(b => b.id === u.business_id)
    return `• ${biz?.name ?? u.business_id} quiere pasar a ${u.plan.toUpperCase()}`
  }).join('\n')}` : ''}

👥 CLIENTES (últimos ${clientList.length}):
${clientList.join('\n')}
═══════════════════════════`

  const systemPrompt = `Eres el asistente IA interno de Amelia, el SaaS. Hablas directamente con el superadmin — el dueño de la plataforma.

TU ROL:
• Ayudas a gestionar y entender el estado global de la plataforma
• Analizas métricas de clientes, ingresos, crecimiento y churn
• Das ideas para mejorar retención, conversión de planes y crecimiento
• Ayudas a redactar comunicaciones a clientes (emails, anuncios de features)
• Identificas oportunidades de upsell basado en los datos reales

REGLAS:
• Hablas en español, directo y profesional
• Usas los datos reales del contexto — no inventas cifras
• Máximo 4-6 párrafos salvo que pidan algo largo
• Eres el copiloto del dueño de la plataforma, no un asistente genérico
${contextBlock}`

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
      } catch {
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
