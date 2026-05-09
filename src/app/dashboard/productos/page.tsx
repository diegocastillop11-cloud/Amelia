import { createClient } from '@/lib/supabase/server'
import ProductosClient from './ProductosClient'

export default async function ProductosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Intenta con columnas nuevas; si fallan (SQL aún no corrido) cae al fallback
  let business: { id: string; name: string; payment_info?: unknown; delivery_settings?: unknown } | null = null
  const { data: bizFull, error: bizErr } = await supabase
    .from('businesses').select('id,name,payment_info,delivery_settings').eq('owner_id', user!.id).single()
  if (!bizErr) {
    business = bizFull
  } else {
    const { data: bizSimple } = await supabase
      .from('businesses').select('id,name').eq('owner_id', user!.id).single()
    business = bizSimple
  }

  if (!business) return (
    <div className="p-8"><p style={{ color:'var(--text-muted)' }}>Sin negocio registrado.</p></div>
  )

  const [{ data: products }, { data: promotions }] = await Promise.all([
    supabase.from('products').select('id,name,description,price,cost_price,stock,unit,image_url,created_at').eq('business_id', business.id).order('created_at', { ascending: false }),
    supabase.from('promotions').select('*').eq('business_id', business.id).order('created_at', { ascending: false }),
  ])

  return (
    <ProductosClient
      products={products ?? []}
      promotions={promotions ?? []}
      businessId={business.id}
      paymentInfo={business.payment_info as Record<string,string> ?? undefined}
      deliverySettings={business.delivery_settings as Record<string,unknown> ?? undefined}
    />
  )
}
