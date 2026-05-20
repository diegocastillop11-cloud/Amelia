import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import MarketingClient  from '@/app/dashboard/marketing/MarketingClient'

interface Props {
  searchParams: { tab?: string; meta?: string }
}

export default async function AdminMarketingPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: biz } = await supabase
    .from('businesses')
    .select('id, name, category')
    .eq('owner_id', user.id)
    .single()

  const { data: metaConn } = await supabase
    .from('meta_connections')
    .select('ad_account_id, page_id, currency')
    .eq('business_id', biz?.id ?? '')
    .maybeSingle()

  return (
    <MarketingClient
      businessName={biz?.name ?? 'Amelia'}
      businessCategory={biz?.category ?? 'SaaS'}
      metaConnected={!!metaConn}
      metaAdAccountId={metaConn?.ad_account_id ?? null}
      metaPageId={metaConn?.page_id ?? null}
      metaCurrency={metaConn?.currency ?? 'USD'}
      initialTab={(searchParams.tab === 'meta') ? 'meta' : 'agente'}
      metaParam={searchParams.meta ?? null}
    />
  )
}
