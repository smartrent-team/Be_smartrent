import type { SupabaseClient } from '@supabase/supabase-js'
import { dispatchNotification } from '@/lib/notification_dispatch'

export type CheckoutPaymentBlock = {
  isLastTenantInRoom: boolean
  isBlocked: boolean
  unpaidInvoiceCount: number
  unpaidInvoiceTotal: number
  latestInvoiceCode: string | null
}

type InvoiceRow = {
  id: number
  invoice_code: string | null
  total_amount: number | null
  payment_status: string | null
}

function formatMoney(amount: number): string {
  return `${amount.toLocaleString('vi-VN')}đ`
}

export async function getCheckoutPaymentBlock(
  supabase: SupabaseClient,
  tenantId: number,
  roomId: number
): Promise<CheckoutPaymentBlock> {
  const { count: otherTenantsCount } = await supabase
    .from('tenants')
    .select('id', { count: 'exact', head: true })
    .eq('room_id', roomId)
    .is('move_out_date', null)
    .neq('id', tenantId)

  const isLastTenantInRoom = (otherTenantsCount ?? 0) === 0

  if (!isLastTenantInRoom) {
    return {
      isLastTenantInRoom,
      isBlocked: false,
      unpaidInvoiceCount: 0,
      unpaidInvoiceTotal: 0,
      latestInvoiceCode: null,
    }
  }

  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, invoice_code, total_amount, payment_status')
    .eq('room_id', roomId)
    .in('payment_status', ['unpaid', 'partial'])
    .order('issued_at', { ascending: false })
    .order('created_at', { ascending: false })

  const unpaidInvoices = (invoices ?? []) as InvoiceRow[]
  const unpaidInvoiceTotal = unpaidInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.total_amount ?? 0),
    0
  )

  return {
    isLastTenantInRoom,
    isBlocked: unpaidInvoices.length > 0,
    unpaidInvoiceCount: unpaidInvoices.length,
    unpaidInvoiceTotal,
    latestInvoiceCode: unpaidInvoices[0]?.invoice_code ?? null,
  }
}

export async function sendCheckoutPaymentReminder(
  supabase: SupabaseClient,
  tenantId: number,
  roomId: number,
  block: CheckoutPaymentBlock,
  options?: { force?: boolean }
): Promise<void> {
  if (!block.isBlocked) return

  const relatedId = `checkout-unpaid-invoices:${tenantId}`
  const amountText = formatMoney(block.unpaidInvoiceTotal)
  const invoiceText = block.latestInvoiceCode
    ? `${block.unpaidInvoiceCount} hóa đơn chưa thanh toán, gần nhất ${block.latestInvoiceCode}`
    : `${block.unpaidInvoiceCount} hóa đơn chưa thanh toán`

  if (!options?.force) {
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('related_id', relatedId)
      .eq('type', 'invoice')
      .limit(1)
      .maybeSingle()

    if (existing) return
  }

  const [{ data: tenant }, { data: room }] = await Promise.all([
    supabase
      .from('tenants')
      .select('id, user_id, users(full_name)')
      .eq('id', tenantId)
      .single(),
    supabase
      .from('rooms')
      .select('id, room_code, branch_id')
      .eq('id', roomId)
      .single(),
  ])

  const tenantUserId = tenant?.user_id ? String(tenant.user_id) : null
  const tenantUser = tenant?.users as { full_name?: string | null } | { full_name?: string | null }[] | null
  const tenantName = Array.isArray(tenantUser)
    ? tenantUser[0]?.full_name || 'Cư dân'
    : tenantUser?.full_name || 'Cư dân'
  const roomCode = room?.room_code ? `Phòng ${room.room_code}` : `Phòng ID ${roomId}`

  if (tenantUserId) {
    await dispatchNotification(
      supabase,
      { userId: tenantUserId, tenantId },
      {
        title: 'Cần thanh toán hóa đơn trước khi trả phòng',
        body: `${roomCode} còn ${invoiceText}, tổng ${amountText}. Vui lòng thanh toán để quản lý xác nhận yêu cầu trả phòng.`,
        type: 'invoice',
        relatedId,
      }
    )
  }

  let managerQuery = supabase.from('users').select('id').eq('role', 'manager')
  if (room?.branch_id) {
    managerQuery = managerQuery.eq('branch_id', room.branch_id)
  }

  const { data: managers } = await managerQuery
  const { data: superAdmins } = await supabase.from('users').select('id').eq('role', 'super_admin')

  const recipients = [...(managers ?? []), ...(superAdmins ?? [])]
  for (const recipient of recipients) {
    await dispatchNotification(
      supabase,
      { userId: String(recipient.id) },
      {
        title: 'Yêu cầu trả phòng đang bị chặn',
        body: `${tenantName} (${roomCode}) là cư dân cuối trong phòng nhưng còn ${invoiceText}, tổng ${amountText}. Cần yêu cầu thanh toán trước khi xác nhận trả phòng.`,
        type: 'invoice',
        relatedId,
      }
    )
  }
}
