import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ClientesClient from '@/components/clients/ClientesClient'

export default async function ClientesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: business } = await supabase
    .from('businesses').select('id, name').eq('owner_id', user.id).single()

  if (!business) redirect('/dashboard')

  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  const [{ data: allClients }, { data: inactiveClients }] = await Promise.all([
    supabase.from('clients').select('*').eq('business_id', business.id)
      .order('last_visit', { ascending: false, nullsFirst: false }),
    supabase.from('clients').select('id').eq('business_id', business.id)
      .or(`last_visit.lt.${cutoff},last_visit.is.null`),
  ])

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>{business.name}</p>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          Clientes
        </h1>
      </div>

      {/* Alerta de clientes inactivos */}
      {(inactiveClients?.length ?? 0) > 0 && (
        <div className="mb-6 p-4 rounded-xl flex items-center justify-between gap-4"
             style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 20 }}>⏰</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#fcd34d' }}>
                {inactiveClients!.length} cliente{inactiveClients!.length > 1 ? 's' : ''} sin agendar en 30+ días
              </p>
              <p className="text-xs" style={{ color: 'rgba(252,211,77,0.7)' }}>
                Considera enviarles un mensaje con un descuento especial
              </p>
            </div>
          </div>
          <Link href="/dashboard/clientes?tab=inactivos"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#fcd34d',
                          border: '1px solid rgba(245,158,11,0.3)', textDecoration: 'none' }}>
            Ver inactivos →
          </Link>
        </div>
      )}

      <ClientesClient
        clients={allClients ?? []}
        inactiveCount={inactiveClients?.length ?? 0}
        businessId={business.id}
      />
    </div>
  )
}
