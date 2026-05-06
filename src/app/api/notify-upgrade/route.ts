import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { plan } = await req.json()
    if (!plan || !['pro', 'premium'].includes(plan))
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })

    const { error } = await supabase.from('upgrade_requests').upsert({
      user_id: user.id,
      email: user.email,
      requested_plan: plan,
      status: 'pending',
      created_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
