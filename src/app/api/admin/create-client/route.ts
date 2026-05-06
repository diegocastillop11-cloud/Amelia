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
    let userId: string

    const { data: created, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name },
      })

    if (createError) {
      // Si ya existe el usuario en Auth, lo buscamos y reutilizamos
      if (createError.message.toLowerCase().includes('already')) {
        const { data: list } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
        const existing = list?.users?.find(u => u.email === email)
        if (!existing)
          return NextResponse.json({ error: createError.message }, { status: 400 })

        // Verificar que no tenga ya un negocio
        const { data: existingBiz } = await adminClient
          .from('businesses').select('id').eq('owner_id', existing.id).maybeSingle()
        if (existingBiz)
          return NextResponse.json({ error: 'Este usuario ya tiene un negocio registrado.' }, { status: 400 })

        userId = existing.id
      } else {
        return NextResponse.json({ error: createError.message }, { status: 400 })
      }
    } else {
      userId = created.user.id
    }

    // Crear negocio
    const { error: bizError } = await adminClient.from('businesses').insert({
      owner_id: userId,
      name: business_name,
      slug,
      category,
    })

    if (bizError) {
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

    return NextResponse.json({ success: true, user_id: userId, invite_link: inviteLink })
  } catch (error) {
    console.error('Error creando cliente:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
