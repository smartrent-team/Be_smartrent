import type { SupabaseClient } from '@supabase/supabase-js'
import { dispatchNotification } from '@/lib/notification_dispatch'

/**
 * Quét tất cả hóa đơn có due_date đã qua mà chưa thanh toán,
 * gửi thông báo nhắc nhở cho tenant và manager.
 * Dedup cứng theo (user_id, related_id="invoice:{id}", type="invoice_overdue").
 */
export async function syncOverdueInvoiceNotifications(supabase: SupabaseClient) {
  const now = new Date().toISOString()

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_code,
      total_amount,
      due_date,
      tenant_id,
      room_id,
      tenant:tenants(user_id),
      room:rooms(room_code, branch_id)
    `)
    .eq('payment_status', 'unpaid')
    .lt('due_date', now)
    .not('tenant_id', 'is', null)

  if (error) {
    console.error('Failed to load overdue invoices:', error)
    return
  }

  for (const invoice of invoices ?? []) {
    const relatedId = `invoice:${invoice.id}`

    const tenantData = invoice.tenant as unknown
    const tenantObj = Array.isArray(tenantData)
      ? (tenantData[0] as { user_id?: string } | undefined)
      : (tenantData as { user_id?: string } | null)

    const roomData = invoice.room as unknown
    const roomObj = Array.isArray(roomData)
      ? (roomData[0] as { room_code?: string; branch_id?: number } | undefined)
      : (roomData as { room_code?: string; branch_id?: number } | null)

    if (!tenantObj?.user_id) continue

    // Kiểm tra đã gửi chưa
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', tenantObj.user_id)
      .eq('related_id', relatedId)
      .eq('type', 'invoice_overdue')
      .maybeSingle()

    if (existing) continue

    const amount = Number(invoice.total_amount).toLocaleString('vi-VN')
    const dueStr = new Date(invoice.due_date as string).toLocaleDateString('vi-VN')
    const roomCode = roomObj?.room_code ?? '?'

    // Thông báo tenant
    await dispatchNotification(
      supabase,
      { userId: tenantObj.user_id, tenantId: invoice.tenant_id as number ?? null },
      {
        title: 'Hóa đơn chưa thanh toán — đã quá hạn',
        body: `Hóa đơn ${invoice.invoice_code} phòng ${roomCode} số tiền ${amount}đ đã quá hạn thanh toán (hạn: ${dueStr}). Vui lòng thanh toán ngay!`,
        type: 'invoice_overdue',
        relatedId,
      }
    )

    // Thông báo manager + super_admin của chi nhánh
    if (roomObj?.branch_id != null) {
      const { data: managers } = await supabase
        .from('users')
        .select('id')
        .or(`role.eq.super_admin,and(role.eq.manager,branch_id.eq.${roomObj.branch_id})`)

      for (const mgr of managers ?? []) {
        const mgrId = (mgr as { id?: string }).id
        if (!mgrId) continue

        const { data: mgrExisting } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', mgrId)
          .eq('related_id', relatedId)
          .eq('type', 'invoice_overdue')
          .maybeSingle()

        if (mgrExisting) continue

        await dispatchNotification(
          supabase,
          { userId: mgrId },
          {
            title: 'Cư dân chưa thanh toán hóa đơn',
            body: `Hóa đơn ${invoice.invoice_code} phòng ${roomCode} (${amount}đ) đã quá hạn ngày ${dueStr}.`,
            type: 'invoice_overdue',
            relatedId,
          }
        )
      }
    }
  }
}
