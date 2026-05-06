import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET — lista de clientes del negocio
export async function GET(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('business_id')
  const inactive   = searchParams.get('inactive') // 'true' = sin agendar en 30+ días

  let q = supabase
    .from('clients')
    .select('*')
    .eq('business_id', businessId!)
    .order('last_visit', { ascending: false, nullsFirst: false })

  if (inactive === 'true') {
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
    q = q.or(`last_visit.lt.${cutoff},last_visit.is.null`)
  }

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ clients: data ?? [] })
}

// PATCH — actualizar notas de un cliente
export async function PATCH(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { client_id, notes } = await req.json()

  const { error } = await supabase
    .from('clients')
    .update({ notes })
    .eq('id', client_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
