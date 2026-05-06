import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { business_id, content, business_name, template_id, primary_color } = await req.json()

    const isSuperAdmin = user.email === process.env.SUPERADMIN_EMAIL
    if (!isSuperAdmin) {
      const { data: biz } = await supabase
        .from('businesses').select('owner_id').eq('id', business_id).single()
      if (!biz || biz.owner_id !== user.id)
        return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    // Actualizar nombre y color en businesses
    const bizUpdate: Record<string, string> = {}
    if (primary_color) bizUpdate.primary_color = primary_color
    if (business_name) bizUpdate.name = business_name
    if (Object.keys(bizUpdate).length > 0) {
      await supabase.from('businesses').update(bizUpdate).eq('id', business_id)
    }

    // Guardar content y template en sites
    const { error } = await supabase.from('sites')
      .update({ content, template_id: template_id ?? 'moderna' })
      .eq('business_id', business_id)

    if (error) {
      console.error('Save error:', error)
      return NextResponse.json({ error: 'Error al guardar los cambios.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno al guardar.' }, { status: 500 })
  }
}
