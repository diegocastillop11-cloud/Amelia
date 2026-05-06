import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: owner } = await supabase
    .from('owners').select('is_superadmin').eq('id', user.id).single()
  if (!owner?.is_superadmin)
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { business_id, plan, upgrade_request_id } = await req.json()
  if (!business_id || !['free', 'pro', 'premium'].includes(plan))
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const { error } = await supabase.from('licenses').upsert(
    { business_id, plan, expires_at: null },
    { onConflict: 'business_id' }
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (upgrade_request_id) {
    await supabase.from('upgrade_requests')
      .update({ status: 'completed' })
      .eq('id', upgrade_request_id)
  }

  return NextResponse.json({ success: true })
}
