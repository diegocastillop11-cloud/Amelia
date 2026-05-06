import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const isSuperAdmin = user.email === process.env.SUPERADMIN_EMAIL

  let plan = 'free'
  let modules: Record<string, boolean> | null = null

  if (!isSuperAdmin) {
    const { data: biz } = await supabase.from('businesses').select('id').eq('owner_id', user.id).maybeSingle()
    if (biz) {
      const { data: lic } = await supabase.from('licenses')
        .select('plan, modules').eq('business_id', biz.id).maybeSingle()
      if (lic) { plan = lic.plan; modules = lic.modules }
    }
  }

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg-base)' }}>
      {isSuperAdmin ? (
        <AdminSidebar />
      ) : (
        <Sidebar userEmail={user.email ?? ''} plan={plan} modules={modules} />
      )}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
