import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { sendOrderConfirmed } from '@/lib/email'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { status } = await req.json()
  const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled']
  if (!validStatuses.includes(status))
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })

  const { data: order, error } = await supabase
    .from('orders').update({ status }).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enviar email al cliente cuando se confirma
  if (status === 'confirmed' && order?.client_email) {
    try {
      const admin = createAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data: biz } = await admin
        .from('businesses').select('name, payment_info').eq('id', order.business_id).single()

      if (biz) {
        const items = Array.isArray(order.items) ? order.items : []
        await sendOrderConfirmed({
          to:            order.client_email,
          businessName:  biz.name,
          clientName:    order.client_name,
          items,
          subtotal:      order.subtotal ?? 0,
          discount:      order.discount ?? 0,
          deliveryCost:  order.delivery_cost ?? 0,
          total:         order.total ?? 0,
          deliveryAddress:    order.delivery_address ?? null,
          deliveryDistanceKm: order.delivery_distance_km ?? null,
          paymentInfo:   (biz.payment_info as Record<string, string>) ?? {},
        })
      }
    } catch { /* no bloquear si falla el email */ }
  }

  return NextResponse.json(order)
}
