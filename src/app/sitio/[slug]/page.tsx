import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { SiteContent } from '@/types/database'
import { SiteRenderer, type TemplateId } from '@/components/site-builder/templates/SiteRenderer'
import SiteWithChat from './SiteWithChat'

export default async function SitioPublicoPage({ params }: { params: { slug: string } }) {
  const supabase = createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('*, sites(*)')
    .eq('slug', params.slug)
    .eq('is_published', true)
    .single()

  if (!business) notFound()

  const site = Array.isArray(business.sites) ? business.sites[0] : business.sites
  if (!site?.content) notFound()

  const content    = site.content as SiteContent
  const color      = business.primary_color ?? '#6366f1'
  const templateId = (site.template_id ?? 'moderna') as TemplateId

  const { data: schedules } = await supabase
    .from('schedules').select('id').eq('business_id', business.id).eq('is_open', true).limit(1)

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
      />

      <SiteWithChat
        businessId={business.id} businessName={business.name}
        color={color} services={services} hasBookings={hasBookings}
      />
    </>
  )
}
