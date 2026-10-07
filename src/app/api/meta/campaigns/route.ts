import { NextResponse }               from 'next/server'
import { createClient }               from '@/lib/supabase/server'
import { getCampaigns, createCampaign } from '@/lib/meta'

async function getMetaConn(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: biz } = await supabase.from('businesses').select('id').eq('owner_id', userId).single()
  if (!biz) return null
  const { data: conn } = await supabase
    .from('meta_connections')
    .select('access_token, ad_account_id')
    .eq('business_id', biz.id)
    .single()
  return conn ?? null
}

// GET — lista campañas de la cuenta conectada
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const conn = await getMetaConn(supabase, user.id)
  if (!conn) return NextResponse.json({ campaigns: [], connected: false })
  if (!conn.ad_account_id) return NextResponse.json({ campaigns: [], connected: true, hasAccount: false })

  try {
    const { data } = await getCampaigns(conn.access_token, conn.ad_account_id)
    return NextResponse.json({ campaigns: data, connected: true, hasAccount: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST — crea una campaña nueva (siempre en PAUSED)
export async function POST(req: Request) {
  const { name, objective, daily_budget } = await req.json()
  if (!name || !objective || !daily_budget)
    return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const conn = await getMetaConn(supabase, user.id)
  if (!conn?.ad_account_id)
    return NextResponse.json({ error: 'No hay cuenta publicitaria seleccionada' }, { status: 400 })

  try {
    const campaign = await createCampaign(conn.access_token, conn.ad_account_id, {
      name,
      objective,
    })
    return NextResponse.json({ id: campaign.id })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
