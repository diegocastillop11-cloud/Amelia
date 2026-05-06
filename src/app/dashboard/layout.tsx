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

  return (
    <div className="flex h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* Superadmin ve su sidebar especial con switcher admin↔cliente */}
      {isSuperAdmin ? (
        <AdminSidebar />
      ) : (
        <Sidebar userEmail={user.email ?? ''} />
      )}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
