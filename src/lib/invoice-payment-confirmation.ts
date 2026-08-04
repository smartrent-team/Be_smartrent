import type { SupabaseClient } from '@supabase/supabase-js'
import { dispatchNotification } from '@/lib/notification_dispatch'

type TenantRef = {
  id?: number
  user_id?: string
} | null

type InvoiceRecord = {
  id: number
  invoice_code: string
  total_amount: number
  payment_status: string
  tenant?: TenantRef | TenantRef[]
  room?: any
}

type ConfirmInvoicePaymentResult =
  | {
      success: true
      invoiceId: number
      invoiceCode: string
      alreadyConfirmed: boolean
    }
  | {
      success: false
      error: string
    }

function normalizeTenant(value: InvoiceRecord['tenant']): { id?: number; user_id?: string } | null {
  if (!value) return null
  if (Array.isArray(value)) {
    return (value[0] as { id?: number; user_id?: string } | undefined) ?? null
  }
  return value
}

function normalizeRoom(value: any): { room_code?: string; branch_id?: number } | null {
  if (!value) return null
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

export async function confirmInvoicePaymentAndNotify(
  supabase: SupabaseClient,
  paymentLinkId: string,
  paidAmount: number
): Promise<ConfirmInvoicePaymentResult> {
  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('id, invoice_code, total_amount, payment_status, room_id, tenant:tenant_id(id, user_id), room:room_id(room_code, branch_id)')
    .eq('payment_link_id', paymentLinkId)
    .maybeSingle()

  if (fetchError) {
    return { success: false, error: fetchError.message }
  }

  if (!invoice) {
    return { success: false, error: 'Không tìm thấy hóa đơn' }
  }

  if (invoice.payment_status === 'paid') {
    return {
      success: true,
      invoiceId: invoice.id,
      invoiceCode: invoice.invoice_code,
      alreadyConfirmed: true,
    }
  }

  if (Number(invoice.total_amount) !== paidAmount) {
    return { success: false, error: 'Số tiền thanh toán không khớp' }
  }

  const { data: updatedInvoice, error: updateError } = await supabase
    .from('invoices')
    .update({
      payment_status: 'paid',
      paid_at: new Date().toISOString(),
    })
    .eq('id', invoice.id)
    .eq('payment_status', 'unpaid')
    .select('id, invoice_code, total_amount, room_id, tenant:tenant_id(id, user_id), room:room_id(room_code, branch_id)')
    .maybeSingle()

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  if (!updatedInvoice) {
    return {
      success: true,
      invoiceId: invoice.id,
      invoiceCode: invoice.invoice_code,
      alreadyConfirmed: true,
    }
  }

  // Thông báo cho TẤT CẢ cư dân đang ở trong phòng khi thanh toán thành công
  const invoiceRoomId = (updatedInvoice as any).room_id ?? (invoice as any).room_id
  if (invoiceRoomId) {
    const { data: allRoomTenants } = await supabase
      .from('tenants')
      .select('id, user_id')
      .eq('room_id', invoiceRoomId)
      .is('move_out_date', null)
    for (const t of allRoomTenants ?? []) {
      if (t.user_id) {
        await dispatchNotification(
          supabase,
          { userId: t.user_id, tenantId: t.id },
          {
            title: 'Đã nhận tiền phòng',
            body: `Hóa đơn ${updatedInvoice.invoice_code} số tiền ${Number(updatedInvoice.total_amount).toLocaleString('vi-VN')}đ đã được thanh toán thành công.`,
            type: 'payment',
          }
        )
      }
    }
  } else {
    // Fallback: thông báo chỉ cho tenant trên hóa đơn nếu không có room_id
    const tenant = normalizeTenant((updatedInvoice as unknown as InvoiceRecord).tenant)
    if (tenant?.user_id) {
      await dispatchNotification(
        supabase,
        { userId: tenant.user_id, tenantId: tenant.id ?? null },
        {
          title: 'Đã nhận tiền phòng',
          body: `Hóa đơn ${updatedInvoice.invoice_code} số tiền ${Number(updatedInvoice.total_amount).toLocaleString('vi-VN')}đ đã được thanh toán thành công.`,
          type: 'payment',
        }
      )
    }
  }

  const roomObj = normalizeRoom((updatedInvoice as unknown as InvoiceRecord).room)
  let managerQuery = supabase.from('profiles').select('id')
  if (roomObj?.branch_id != null) {
    managerQuery = managerQuery.or(`role.eq.super_admin,and(role.eq.manager,branch_id.eq.${roomObj.branch_id})`)
  } else {
    managerQuery = managerQuery.eq('role', 'super_admin')
  }

  const { data: managers } = await managerQuery
  if (managers && managers.length > 0) {
    const roomStr = roomObj?.room_code ? ` (Phòng ${roomObj.room_code})` : ''
    for (const manager of managers) {
      await dispatchNotification(
        supabase,
        { userId: manager.id },
        {
          title: 'Thanh toán mới',
          body: `Hóa đơn ${updatedInvoice.invoice_code}${roomStr} đã được thanh toán thành công qua VNPay (${Number(updatedInvoice.total_amount).toLocaleString('vi-VN')}đ).`,
          type: 'payment',
        }
      )
    }
  }

  return {
    success: true,
    invoiceId: updatedInvoice.id,
    invoiceCode: updatedInvoice.invoice_code,
    alreadyConfirmed: false,
  }
}
