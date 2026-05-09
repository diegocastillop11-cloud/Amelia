import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AsistenteAdminClient from './AsistenteAdminClient'

export default async function AdminAsistentePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: owner } = await supabase.from('owners').select('is_superadmin').eq('id', user.id).single()
  if (!owner?.is_superadmin) redirect('/dashboard')

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AsistenteAdminClient />
    </div>
  )
}
