import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import WhatsAppClient   from '@/components/whatsapp/WhatsAppClient'

export default async function WhatsAppPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          WhatsApp Bot
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          Amelia atiende a tus clientes automáticamente por WhatsApp, 24/7
        </p>
      </div>
      <WhatsAppClient />
    </div>
  )
}
