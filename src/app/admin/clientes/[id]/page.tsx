import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ClienteDetailClient from './ClienteDetailClient'

export default async function ClienteDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('*, owners(id, full_name, email)')
    .eq('id', params.id).single()

  if (!business) notFound()

  const owner = business.owners as { id: string; full_name: string | null; email: string } | null

  const [{ data: license }, { data: upgradeReq }, { count: totalBookings }, { count: totalClients }] =
    await Promise.all([
      supabase.from('licenses').select('plan, expires_at')
        .eq('business_id', params.id).maybeSingle(),
      owner
        ? supabase.from('upgrade_requests').select('id, requested_plan, status, created_at')
            .eq('user_id', owner.id).eq('status', 'pending').maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('bookings').select('*', { count: 'exact', head: true })
        .eq('business_id', params.id),
      supabase.from('clients').select('*', { count: 'exact', head: true })
        .eq('business_id', params.id),
    ])

  return (
    <ClienteDetailClient
      business={{ ...business, owners: owner }}
      license={license}
      upgradeRequest={upgradeReq}
      totalBookings={totalBookings ?? 0}
      totalClients={totalClients ?? 0}
    />
  )
}
