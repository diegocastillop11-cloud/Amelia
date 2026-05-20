import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPages }     from '@/lib/meta'

// GET — lista las páginas de Facebook del usuario
export async function GET() {
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
  if (!conn) return NextResponse.json({ error: 'No conectado a Meta' }, { status: 404 })

  try {
    const pages = await getPages(conn.access_token)
    return NextResponse.json(pages)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST — guarda la página seleccionada
export async function POST(req: Request) {
  const { page_id, page_name } = await req.json()
  if (!page_id) return NextResponse.json({ error: 'Falta page_id' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: biz } = await supabase.from('businesses').select('id').eq('owner_id', user.id).single()
  if (!biz) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

  await supabase
    .from('meta_connections')
    .update({ page_id, page_name, updated_at: new Date().toISOString() })
    .eq('business_id', biz.id)

  return NextResponse.json({ ok: true })
}
