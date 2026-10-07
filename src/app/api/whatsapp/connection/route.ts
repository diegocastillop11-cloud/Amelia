import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getBiz(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: biz } = await supabase.from('businesses').select('id').eq('owner_id', userId).single()
  return biz
}

// GET — estado de la conexión
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const biz = await getBiz(supabase, user.id)
  if (!biz) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

  const { data: conn } = await supabase
    .from('whatsapp_connections')
    .select('phone_number_id, display_phone_number, webhook_verified, is_active')
    .eq('business_id', biz.id)
    .maybeSingle()

  return NextResponse.json({ connection: conn ?? null })
}

// POST — guardar conexión
export async function POST(req: Request) {
  const { phone_number_id, access_token, display_phone_number, waba_id } = await req.json()
  if (!phone_number_id || !access_token)
    return NextResponse.json({ error: 'Faltan phone_number_id o access_token' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const biz = await getBiz(supabase, user.id)
  if (!biz) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

  const { error } = await supabase
    .from('whatsapp_connections')
    .upsert({
      business_id:          biz.id,
      phone_number_id,
      access_token,
      display_phone_number: display_phone_number ?? null,
      waba_id:              waba_id ?? null,
      is_active:            true,
      updated_at:           new Date().toISOString(),
    }, { onConflict: 'business_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE — desconectar
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const biz = await getBiz(supabase, user.id)
  if (!biz) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

  await supabase.from('whatsapp_connections').delete().eq('business_id', biz.id)
  return NextResponse.json({ ok: true })
}
