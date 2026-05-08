import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { sendOrder } from '@/lib/email'

export const dynamic = 'force-dynamic'

// GET — dashboard del dueño
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: biz } = await supabase.from('businesses').select('id').eq('owner_id', user.id).single()
  if (!biz) return NextResponse.json([], { status: 200 })

  const { data } = await supabase
    .from('orders').select('*').eq('business_id', biz.id)
    .order('created_at', { ascending: false })
  return NextResponse.json(data ?? [])
}

// POST — público, desde el carrito del sitio
export async function POST(req: Request) {
  const {
    slug, clientName, clientPhone, clientEmail, clientNote, items,
    deliveryType, deliveryAddress, deliveryDistanceKm, deliveryCost,
  } = await req.json()

  if (!slug || !clientName || !items?.length)
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Obtener negocio + email del owner
  const { data: biz } = await admin
    .from('businesses')
    .select('id, name, owners(email)')
    .eq('slug', slug)
    .single()

  if (!biz) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

  const ownerEmail = Array.isArray(biz.owners)
    ? (biz.owners[0] as { email: string })?.email
    : (biz.owners as { email: string } | null)?.email

  // Calcular totales
  const subtotal      = items.reduce((acc: number, i: { price: number; promo_price?: number; qty: number }) => acc + i.price * i.qty, 0)
  const productTotal  = items.reduce((acc: number, i: { price: number; promo_price?: number; qty: number }) => acc + (i.promo_price ?? i.price) * i.qty, 0)
  const discount      = subtotal - productTotal
  const extraDelivery = Number(deliveryCost ?? 0)
  const total         = productTotal + extraDelivery

  const { data: order, error } = await admin.from('orders').insert({
    business_id: biz.id, client_name: clientName,
    client_phone: clientPhone || null, client_email: clientEmail || null,
    client_note: clientNote || null, items,
    subtotal: Math.round(subtotal), discount: Math.round(discount), total: Math.round(total),
    delivery_type:         deliveryType ?? 'pickup',
    delivery_address:      deliveryAddress ?? null,
    delivery_distance_km:  deliveryDistanceKm ?? null,
    delivery_cost:         Math.round(extraDelivery),
    status: 'pending',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enviar email al dueño
  if (ownerEmail) {
    await sendOrder({
      to: ownerEmail, replyTo: clientEmail || undefined,
      businessName: biz.name, clientName, clientPhone, clientEmail, clientNote,
      items, subtotal: Math.round(subtotal), discount: Math.round(discount), total: Math.round(total),
      deliveryCost: Math.round(extraDelivery), deliveryAddress, deliveryDistanceKm,
    }).catch(() => {})
  }

  return NextResponse.json({ success: true, orderId: order?.id })
}
