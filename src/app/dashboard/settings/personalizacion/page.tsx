import { createClient } from '@/lib/supabase/server'
import PersonalizacionClient from '@/components/settings/PersonalizacionClient'

export default async function PersonalizacionPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, primary_color, logo_url')
    .eq('owner_id', user!.id)
    .single()

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
        Personalización visual
      </h1>
      <PersonalizacionClient
        businessId={business?.id ?? null}
        initialColor={business?.primary_color ?? '#0ea5e9'}
        initialLogo={business?.logo_url ?? null}
      />
    </div>
  )
}
