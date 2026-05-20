import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: biz } = await supabase.from('businesses').select('id').eq('owner_id', user.id).single()
  if (!biz) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

  await supabase.from('meta_connections').delete().eq('business_id', biz.id)
  return NextResponse.json({ ok: true })
}
