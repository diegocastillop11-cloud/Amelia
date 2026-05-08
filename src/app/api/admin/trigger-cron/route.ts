import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.SUPERADMIN_EMAIL) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { type } = await req.json()
  if (!['recordatorios', 'reactivacion'].includes(type))
    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res  = await fetch(`${base}/api/cron/${type}`, {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
