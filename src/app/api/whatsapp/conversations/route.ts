import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getBiz(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: biz } = await supabase.from('businesses').select('id').eq('owner_id', userId).single()
  return biz
}

// GET — listar conversaciones del negocio
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const biz = await getBiz(supabase, user.id)
  if (!biz) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

  const { data: conversations } = await supabase
    .from('whatsapp_conversations')
    .select('id, customer_phone, customer_name, messages, last_message_at')
    .eq('business_id', biz.id)
    .order('last_message_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ conversations: conversations ?? [] })
}
