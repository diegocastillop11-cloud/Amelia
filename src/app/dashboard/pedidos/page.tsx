import { createClient } from '@/lib/supabase/server'
import PedidosClient from './PedidosClient'

export default async function PedidosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: business } = await supabase
    .from('businesses').select('id').eq('owner_id', user!.id).single()

  const { data: orders } = business
    ? await supabase.from('orders').select('*').eq('business_id', business.id)
        .order('created_at', { ascending: false })
    : { data: [] }

  return <PedidosClient orders={orders ?? []} />
}
