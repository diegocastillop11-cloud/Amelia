import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.email !== process.env.SUPERADMIN_EMAIL) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { email, full_name, business_name, category, slug } = await req.json()

    // Crear usuario en Supabase Auth usando service role
    const { createClient: createSupabase } = await import('@supabase/supabase-js')
    const adminClient = createSupabase(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: newUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name },
      })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    // Crear negocio
    const { error: bizError } = await adminClient.from('businesses').insert({
      owner_id: newUser.user.id,
      name: business_name,
      slug,
      category,
    })

    if (bizError) {
      await adminClient.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json({ error: bizError.message }, { status: 500 })
    }

    // Generar link de invitación para que el cliente establezca su contraseña
    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: 'invite',
        email,
        options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/dashboard` },
      })

    const inviteLink = linkError ? null : linkData?.properties?.action_link ?? null

    return NextResponse.json({ success: true, user_id: newUser.user.id, invite_link: inviteLink })
  } catch (error) {
    console.error('Error creando cliente:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
