import { NextResponse }                        from 'next/server'
import { createClient }                        from '@/lib/supabase/server'
import { updateCampaignStatus, deleteCampaign } from '@/lib/meta'

// PATCH — activa o pausa una campaña
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { status } = await req.json()
  if (status !== 'ACTIVE' && status !== 'PAUSED')
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: biz } = await supabase.from('businesses').select('id').eq('owner_id', user.id).single()
  if (!biz) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

  const { data: conn } = await supabase
    .from('meta_connections')
    .select('access_token')
    .eq('business_id', biz.id)
    .single()
  if (!conn) return NextResponse.json({ error: 'No conectado a Meta' }, { status: 401 })

  try {
    await updateCampaignStatus(conn.access_token, params.id, status)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// DELETE — elimina una campaña
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: biz } = await supabase.from('businesses').select('id').eq('owner_id', user.id).single()
  if (!biz) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

  const { data: conn } = await supabase
    .from('meta_connections')
    .select('access_token')
    .eq('business_id', biz.id)
    .single()
  if (!conn) return NextResponse.json({ error: 'No conectado a Meta' }, { status: 401 })

  try {
    await deleteCampaign(conn.access_token, params.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
