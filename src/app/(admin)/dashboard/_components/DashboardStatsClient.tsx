'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Component vô hình — chỉ lắng nghe Supabase Realtime cho các bảng
 * rooms / invoices / tenants rồi gọi router.refresh() để server component
 * DashboardStats re-fetch dữ liệu mới nhất.
 */
export default function DashboardRealtimeRefresher() {
  const router = useRouter()
  const supabase = createClient()

  const refresh = useCallback(() => router.refresh(), [router])

  useEffect(() => {
    const channel = supabase
      .channel('realtime-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' },    refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' },  refresh)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, refresh])

  // Không render gì — chỉ là side-effect listener
  return null
}
