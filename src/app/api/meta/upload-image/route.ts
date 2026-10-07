import { NextResponse }  from 'next/server'
import { createClient }  from '@/lib/supabase/server'
import { uploadAdImage } from '@/lib/meta'

// POST — sube una imagen manual a Meta y devuelve el hash
// Body: FormData con campo "file"
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: biz } = await supabase
    .from('businesses').select('id').eq('owner_id', user.id).single()
  if (!biz) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

  const { data: conn } = await supabase
    .from('meta_connections')
    .select('access_token, ad_account_id')
    .eq('business_id', biz.id)
    .single()
  if (!conn?.ad_account_id) return NextResponse.json({ error: 'No hay cuenta publicitaria' }, { status: 400 })

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

    const buffer = await file.arrayBuffer()
    if (buffer.byteLength < 1000) return NextResponse.json({ error: 'Archivo demasiado pequeño' }, { status: 400 })

    const hash = await uploadAdImage(conn.access_token, conn.ad_account_id, buffer)
    return NextResponse.json({ hash })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
