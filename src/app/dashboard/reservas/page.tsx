import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ReservasClient from '@/components/bookings/ReservasClient'

export default async function ReservasPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: business } = await supabase
    .from('businesses').select('id, name').eq('owner_id', user.id).single()

  if (!business) redirect('/dashboard')

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
            {business.name}
          </p>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Reservas
          </h1>
        </div>
        <Link href="/dashboard/horarios" className="btn-ghost flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Configurar horarios
        </Link>
      </div>
      <ReservasClient businessId={business.id} />
    </div>
  )
}
