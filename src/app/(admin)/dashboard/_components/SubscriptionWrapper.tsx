import { verifyRole } from '@/lib/rbac'
import SubscriptionBanner from './SubscriptionBanner'

export default async function SubscriptionWrapper() {
  const auth = await verifyRole()
  if (auth.error || !auth.user || auth.role !== 'super_admin') return null

  const supabase = auth.supabase!
  
  const { data: user } = await supabase.from('users').select('organization_id').eq('id', auth.dbUserId).single()
  if (!user || !user.organization_id) return null

  const { data: org } = await supabase.from('organizations').select('plan_type, max_branches, max_rooms, subscription_end_date').eq('id', user.organization_id).single()
  if (!org) return null

  const { count: currentBranches } = await supabase.from('branches').select('*', { count: 'exact', head: true }).eq('organization_id', user.organization_id)
  const { count: currentRooms } = await supabase.from('rooms').select('id, branches!inner(organization_id)', { count: 'exact', head: true }).eq('branches.organization_id', user.organization_id)

  return (
    <SubscriptionBanner 
      planType={org.plan_type}
      maxBranches={org.max_branches}
      maxRooms={org.max_rooms}
      currentBranches={currentBranches || 0}
      currentRooms={currentRooms || 0}
      subscriptionEndDate={org.subscription_end_date}
    />
  )
}
