import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const DAYS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']

export async function GET(req: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(req.url)
  const businessId = searchParams.get('business_id')
  if (!businessId) return NextResponse.json({ error: 'Falta business_id' }, { status: 400 })

  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('business_id', businessId)
    .order('day_of_week')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ schedules: data ?? [], days: DAYS })
}

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { business_id, schedules } = await req.json()

  // Verificar propiedad
  const isSuperAdmin = user.email === process.env.SUPERADMIN_EMAIL
  if (!isSuperAdmin) {
    const { data: biz } = await supabase
      .from('businesses').select('owner_id').eq('id', business_id).single()
    if (!biz || biz.owner_id !== user.id)
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  // Upsert de todos los horarios
  const rows = schedules.map((s: {
    day_of_week: number; is_open: boolean; open_time: string; close_time: string; slot_duration: number
  }) => ({
    business_id,
    day_of_week:   s.day_of_week,
    is_open:       s.is_open,
    open_time:     s.open_time,
    close_time:    s.close_time,
    slot_duration: s.slot_duration,
  }))

  const { error } = await supabase
    .from('schedules')
    .upsert(rows, { onConflict: 'business_id,day_of_week' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
