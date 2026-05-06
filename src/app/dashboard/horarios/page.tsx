import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HorariosClient from '@/components/bookings/HorariosClient'

export default async function HorariosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: business } = await supabase
    .from('businesses').select('id, name').eq('owner_id', user.id).single()

  if (!business) redirect('/dashboard')

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
          {business.name} · Configuración
        </p>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Horarios de atención
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Define los días y horas en que tu negocio acepta reservas
        </p>
      </div>
      <HorariosClient businessId={business.id} />
    </div>
  )
}
