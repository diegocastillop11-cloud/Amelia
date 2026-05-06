import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { business_id } = await req.json()

    // Verificar propiedad
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', business_id)
      .eq('owner_id', user.id)
      .single()

    if (!business) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

    await Promise.all([
      supabase.from('sites').update({
        status: 'published',
        published_at: new Date().toISOString(),
      }).eq('business_id', business_id),

      supabase.from('businesses').update({
        is_published: true,
      }).eq('id', business_id),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error publicando:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
