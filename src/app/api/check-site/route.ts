import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ exists: false })

    const { data: business } = await supabase
      .from('businesses')
      .select('id, name, slug, is_published, sites(id, status, content)')
      .eq('owner_id', user.id)
      .single()

    if (!business) return NextResponse.json({ exists: false })

    const site = Array.isArray(business.sites) ? business.sites[0] : business.sites
    const hasContent = !!(site?.content)

    return NextResponse.json({
      exists: hasContent,
      businessId: business.id,
      businessName: business.name,
      slug: business.slug,
      isPublished: business.is_published,
      siteStatus: site?.status ?? null,
    })
  } catch (e) {
    console.error('check-site error:', e)
    return NextResponse.json({ exists: false })
  }
}
