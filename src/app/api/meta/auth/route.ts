import { NextResponse }  from 'next/server'
import { createClient }  from '@/lib/supabase/server'
import { getOAuthUrl }   from '@/lib/meta'
import { cookies }       from 'next/headers'
import { randomUUID }    from 'crypto'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const state = randomUUID()
  const jar   = await cookies()

  jar.set('meta_oauth_state', state, {
    httpOnly:  true,
    secure:    process.env.NODE_ENV === 'production',
    maxAge:    600,
    path:      '/',
    sameSite:  'lax',
  })

  return NextResponse.redirect(getOAuthUrl(state))
}
