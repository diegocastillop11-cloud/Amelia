import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { SiteContent } from '@/types/database'
import { SiteRenderer, type TemplateId, type ProductItem } from '@/components/site-builder/templates/SiteRenderer'
import SiteWithChat from './SiteWithChat'
import SiteCart, { type DeliverySettings } from './SiteCart'

interface DBProduct {
  id: string; name: string; description: string | null
  price: number | null; image_url?: string | null
}
interface DBPromotion {
  type: 'percent' | 'fixed'; value: number
  applies_to: 'product' | 'all_products'; item_id: string | null
}

function applyPromo(product: DBProduct, promos: DBPromotion[]): Pick<ProductItem, 'promo_price' | 'promo_label'> {
  if (product.price == null) return {}
  const specific = promos.find(p => p.applies_to === 'product' && p.item_id === product.id)
  const general  = promos.find(p => p.applies_to === 'all_products')
  const promo = specific ?? general
  if (!promo) return {}
  const disc = promo.type === 'percent' ? product.price * (promo.value / 100) : promo.value
  const promo_price = Math.max(0, Math.round(product.price - disc))
  const promo_label = promo.type === 'percent' ? `−${promo.value}%` : `−$${promo.value.toLocaleString('es-CL')}`
  return { promo_price, promo_label }
}

export default async function SitioPublicoPage({ params }: { params: { slug: string } }) {
  const supabase = createClient()

  const { data: business } = await supabase
    .from('businesses').select('*, sites(*)')
    .eq('slug', params.slug).eq('is_published', true).single()

  if (!business) notFound()

  const site = Array.isArray(business.sites) ? business.sites[0] : business.sites
  if (!site?.content) notFound()

  const [{ data: dbProducts }, { data: dbPromos }, { data: schedules }] = await Promise.all([
    supabase.from('products').select('id,name,description,price,image_url')
      .eq('business_id', business.id).order('created_at', { ascending: false }),
    supabase.from('promotions').select('type,value,applies_to,item_id')
      .eq('business_id', business.id).eq('active', true),
    supabase.from('schedules').select('id').eq('business_id', business.id).eq('is_open', true).limit(1),
  ])

  const content    = site.content as SiteContent
  const color      = business.primary_color ?? '#6366f1'
  const templateId = (site.template_id ?? 'moderna') as TemplateId
  const promoList  = (dbPromos ?? []) as DBPromotion[]

  const products: ProductItem[] = (dbProducts ?? []).map((p: DBProduct) => ({
    id: p.id, name: p.name, description: p.description,
    price: p.price, image_url: p.image_url,
    ...applyPromo(p, promoList),
  }))

  const hasBookings = (schedules?.length ?? 0) > 0
  const services = (content.services ?? []).map((s: { name: string; price: string; description: string }) => ({
    name: s.name, price: s.price ?? '', description: s.description ?? '',
  }))

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@400;700;800&family=Sora:wght@400;600;700;800&family=Space+Grotesk:wght@400;500;700&family=Poppins:wght@400;500;600;700&family=Montserrat:wght@400;500;700;800&display=swap" rel="stylesheet" />

      <SiteRenderer
        content={content} color={color} template={templateId}
        name={business.name} logo={business.logo_url} cover={business.cover_url}
        gallery={(content.gallery ?? []) as string[]} fontFamily="Inter, sans-serif"
        slug={params.slug} products={products}
      />

      <SiteWithChat
        businessId={business.id} businessName={business.name}
        color={color} services={services} hasBookings={hasBookings}
      />

      {products.length > 0 && (
        <SiteCart
          slug={params.slug} color={color} businessId={business.id}
          deliverySettings={(business.delivery_settings as DeliverySettings | null) ?? undefined}
        />
      )}
    </>
  )
}
