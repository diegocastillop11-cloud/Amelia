import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AsistenteClient from './AsistenteClient'

export default async function AsistentePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: biz } = await supabase
    .from('businesses')
    .select('name, category')
    .eq('owner_id', user.id)
    .maybeSingle()

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AsistenteClient
        businessName={biz?.name ?? null}
        businessCategory={biz?.category ?? null}
      />
    </div>
  )
}
