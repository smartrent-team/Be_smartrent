import { SystemSidebar } from '@/components/shared/SystemSidebar'
import { Header } from '@/components/shared/Header'
import { createClient } from '@/infrastructure/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

export default async function SystemAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // We use admin client to bypass RLS when verifying system roles to avoid infinite recursion policies issues
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Chặn tất cả mọi người ngoại trừ system_admin
  let query = supabaseAdmin.from('users').select('role')
  if (user.email && user.phone) {
    query = query.or(`email.eq.${user.email},phone.eq.${user.phone}`)
  } else if (user.email) {
    query = query.eq('email', user.email)
  } else if (user.phone) {
    query = query.eq('phone', user.phone)
  }
  
  const { data: profile } = await query.single()

  if (!profile || profile.role !== 'system_admin') {
    // Nếu không phải system_admin, cho out về trang lỗi hoặc login kèm thông báo
    redirect('/login?message=' + encodeURIComponent('Truy cập bị từ chối. Bạn không phải là System Admin.'))
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-slate-900 md:block">
        <SystemSidebar />
      </div>
      <div className="flex flex-col">
        <Header email={user.email} />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  )
}
