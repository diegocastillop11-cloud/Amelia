import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MarketingClient from './MarketingClient'

export default async function MarketingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: biz } = await supabase
    .from('businesses')
    .select('name, category')
    .eq('owner_id', user.id)
    .single()

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <MarketingClient
        businessName={biz?.name ?? 'Mi negocio'}
        businessCategory={biz?.category ?? 'negocio'}
      />
    </div>
  )
}
