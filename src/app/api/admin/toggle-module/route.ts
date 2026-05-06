import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { MODULES_CONFIG, ModuleKey } from '@/lib/modules'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_KEYS = MODULES_CONFIG.map(m => m.key)

export async function PATCH(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: owner } = await supabase
    .from('owners').select('is_superadmin').eq('id', user.id).single()
  if (!owner?.is_superadmin)
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { business_id, module_key, enabled } = await req.json()
  if (!business_id || !VALID_KEYS.includes(module_key as ModuleKey) || typeof enabled !== 'boolean')
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const { createClient: createSupabase } = await import('@supabase/supabase-js')
  const admin = createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch current modules or create defaults
  const { data: lic } = await admin.from('licenses').select('modules').eq('business_id', business_id).single()
  const current = (lic?.modules ?? {}) as Record<string, boolean>
  current[module_key] = enabled

  const { error } = await admin.from('licenses')
    .upsert({ business_id, modules: current }, { onConflict: 'business_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
