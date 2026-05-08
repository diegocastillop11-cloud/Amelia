import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: biz } = await supabase.from('businesses').select('id').eq('owner_id', user.id).single()
  if (!biz) return NextResponse.json({ error: 'Sin negocio' }, { status: 404 })

  const { data } = await supabase
    .from('promotions').select('*').eq('business_id', biz.id).order('created_at', { ascending: false })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: biz } = await supabase.from('businesses').select('id').eq('owner_id', user.id).single()
  if (!biz) return NextResponse.json({ error: 'Sin negocio' }, { status: 404 })

  const body = await req.json()
  const { name, type, value, applies_to, item_id, start_at, end_at } = body

  if (!name || !type || value == null) return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })

  const { data, error } = await supabase.from('promotions').insert({
    business_id: biz.id, name, type, value: Number(value),
    applies_to: applies_to ?? 'all_products',
    item_id: item_id || null, start_at: start_at || null, end_at: end_at || null,
    active: true,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
