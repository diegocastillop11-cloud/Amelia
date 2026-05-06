import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import SiteEditorClient from '@/components/site-builder/SiteEditorClient'

export default async function EditorPage({
  searchParams,
}: {
  searchParams: { id?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const isSuperAdmin = user.email === process.env.SUPERADMIN_EMAIL

  const q = supabase.from('businesses').select('*, sites(*)')
  if (searchParams.id) {
    q.eq('id', searchParams.id)
  } else {
    q.eq('owner_id', user.id)
  }
  const { data: business } = await q.single()

  if (!business) notFound()
  if (!isSuperAdmin && business.owner_id !== user.id) notFound()

  const site = Array.isArray(business.sites) ? business.sites[0] : business.sites
  if (!site?.content) redirect('/dashboard/sitio')

  return (
    <SiteEditorClient
      businessId={business.id}
      businessName={business.name}
      businessSlug={business.slug}
      initialContent={site.content}
      initialColor={business.primary_color ?? '#6366f1'}
      initialTemplate={site.template_id ?? 'moderna'}
      initialLogo={business.logo_url ?? null}
      initialCover={business.cover_url ?? null}
      isPublished={business.is_published}
    />
  )
}
