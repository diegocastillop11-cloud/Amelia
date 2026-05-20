import { NextResponse } from 'next/server'
import Anthropic        from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const OBJECTIVE_LABELS: Record<string, string> = {
  OUTCOME_TRAFFIC:    'atraer tráfico al sitio web',
  OUTCOME_AWARENESS:  'dar a conocer el negocio',
  OUTCOME_ENGAGEMENT: 'generar interacción y comentarios',
  OUTCOME_LEADS:      'captar clientes potenciales (leads)',
  OUTCOME_SALES:      'generar ventas directas',
}

export async function POST(req: Request) {
  const { objective } = await req.json()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: biz } = await supabase
    .from('businesses')
    .select('id, name, category, description')
    .eq('owner_id', user.id)
    .single()
  if (!biz) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

  const [{ data: products }, { data: site }] = await Promise.all([
    supabase.from('products').select('name, price').eq('business_id', biz.id).limit(8),
    supabase.from('sites').select('content').eq('business_id', biz.id).single(),
  ])

  const siteContent = site?.content as Record<string, unknown> | null
  const services = (siteContent?.services as { name: string; price?: string }[] | undefined)
    ?.map(s => `${s.name}${s.price ? ` ($${s.price})` : ''}`)
    .join(', ') ?? ''

  const prompt = `Eres experto en publicidad digital para pequeños negocios chilenos.

Negocio: ${biz.name} (${biz.category})
${biz.description ? `Descripción: ${biz.description}` : ''}
${services ? `Servicios: ${services}` : ''}
${products?.length ? `Productos: ${products.map(p => `${p.name}${p.price ? ` $${p.price}` : ''}`).join(', ')}` : ''}

Objetivo de la campaña: ${OBJECTIVE_LABELS[objective] ?? objective}

Responde SOLO con JSON válido (sin markdown, sin texto extra):
{
  "campaign_name": "nombre corto de la campaña (máx 50 chars)",
  "headline": "titular del anuncio (máx 40 chars, impactante)",
  "primary_text": "texto del anuncio (máx 125 chars, persuasivo, en español chileno)",
  "description": "descripción breve (máx 30 chars)",
  "call_to_action": "uno de: LEARN_MORE | SHOP_NOW | SIGN_UP | BOOK_TRAVEL | CONTACT_US | GET_QUOTE",
  "suggested_audience": "descripción del público ideal (1 línea)",
  "recommended_budget": número entre 5 y 30
}`

  try {
    const msg = await anthropic.messages.create({
      model:      'claude-haiku-4-5',
      max_tokens: 512,
      messages:   [{ role: 'user', content: prompt }],
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
    const data = JSON.parse(text)
    return NextResponse.json(data)
  } catch (err) {
    console.error('meta-campaign AI error:', err)
    return NextResponse.json({ error: 'Error al generar campaña' }, { status: 500 })
  }
}
