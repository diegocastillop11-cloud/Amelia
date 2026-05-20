import { NextResponse }                                from 'next/server'
import { createClient }                               from '@/lib/supabase/server'
import { exchangeCode, getLongLivedToken, getMe }     from '@/lib/meta'
import { cookies }                                    from 'next/headers'

const BASE = process.env.NEXT_PUBLIC_APP_URL!

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) return NextResponse.redirect(`${BASE}/dashboard/marketing?tab=meta&meta=error`)

  const jar        = await cookies()
  const savedState = jar.get('meta_oauth_state')?.value
  if (!state || state !== savedState)
    return NextResponse.redirect(`${BASE}/dashboard/marketing?tab=meta&meta=error`)

  jar.delete('meta_oauth_state')
  if (!code) return NextResponse.redirect(`${BASE}/dashboard/marketing?tab=meta&meta=error`)

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(`${BASE}/auth/login`)

    const { data: biz } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id)
      .single()
    if (!biz) throw new Error('Negocio no encontrado')

    // Intercambiar código → token corto → token largo (60 días)
    const { access_token: shortToken } = await exchangeCode(code)
    const { access_token, expires_in } = await getLongLivedToken(shortToken)
    const me = await getMe(access_token)

    await supabase.from('meta_connections').upsert({
      business_id:      biz.id,
      access_token,
      meta_user_id:     me.id,
      token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString(),
      updated_at:       new Date().toISOString(),
    }, { onConflict: 'business_id' })

    return NextResponse.redirect(`${BASE}/dashboard/marketing?tab=meta&meta=connected`)
  } catch (err) {
    console.error('Meta OAuth error:', err)
    return NextResponse.redirect(`${BASE}/dashboard/marketing?tab=meta&meta=error`)
  }
}
