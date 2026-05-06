import { createClient } from '@/lib/supabase/server'
import PlantillasClient from '@/components/site-builder/PlantillasClient'
import type { SiteContent } from '@/types/database'

export default async function PlantillasPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, primary_color, logo_url, cover_url, sites(template_id, content)')
    .eq('owner_id', user!.id)
    .single()

  const site = Array.isArray(business?.sites) ? business?.sites[0] : business?.sites
  const currentTemplate = (site?.template_id as string) ?? 'moderna'
  const content = (site?.content ?? null) as SiteContent | null

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
        Plantillas
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
        Elige el diseño visual de tu sitio — haz clic para ver una vista previa con tu contenido real
      </p>
      <PlantillasClient
        businessId={business?.id ?? null}
        currentTemplate={currentTemplate}
        content={content}
        color={business?.primary_color ?? '#6366f1'}
        name={business?.name ?? 'Mi Negocio'}
        logo={business?.logo_url ?? null}
        cover={business?.cover_url ?? null}
      />
    </div>
  )
}
