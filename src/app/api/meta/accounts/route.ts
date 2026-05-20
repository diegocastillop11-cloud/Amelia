import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdAccounts } from '@/lib/meta'

async function getConn(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: biz } = await supabase.from('businesses').select('id').eq('owner_id', userId).single()
  if (!biz) return null
  const { data: conn } = await supabase
    .from('meta_connections')
    .select('access_token, ad_account_id')
    .eq('business_id', biz.id)
    .single()
  return conn ? { ...conn, bizId: biz.id } : null
}

// GET — lista las cuentas publicitarias disponibles
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const conn = await getConn(supabase, user.id)
  if (!conn) return NextResponse.json({ error: 'No conectado a Meta' }, { status: 404 })

  try {
    const accounts = await getAdAccounts(conn.access_token)
    return NextResponse.json(accounts)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST — guarda la cuenta publicitaria seleccionada
export async function POST(req: Request) {
  const { ad_account_id, currency } = await req.json()
  if (!ad_account_id) return NextResponse.json({ error: 'Falta ad_account_id' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: biz } = await supabase.from('businesses').select('id').eq('owner_id', user.id).single()
  if (!biz) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

  await supabase
    .from('meta_connections')
    .update({ ad_account_id, currency: currency ?? 'USD', updated_at: new Date().toISOString() })
    .eq('business_id', biz.id)

  return NextResponse.json({ ok: true })
}
