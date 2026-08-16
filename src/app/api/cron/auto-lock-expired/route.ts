import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'

/**
 * GET /api/cron/auto-lock-expired
 *
 * Được gọi bởi cron job hàng ngày (ví dụ: lúc 0:00 mỗi ngày).
 * Tự động xử lý khi hợp đồng hết hạn:
 *  - Nếu phòng còn người ở chung: hoàn tất trả phòng cho cư dân yêu cầu.
 *  - Nếu đây là người cuối trong phòng: chỉ hoàn tất khi hóa đơn tháng mới nhất của phòng đã thanh toán.
 */
export async function GET(request: NextRequest) {
  try {
    // Bảo vệ route cron bằng Authorization header hoặc secret header
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const authHeader = request.headers.get('authorization')
      const cronHeader = request.headers.get('x-cron-secret')
      const isAuthorized =
        authHeader === `Bearer ${cronSecret}` || cronHeader === cronSecret
      if (!isAuthorized) {
        return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 401 })
      }
    }

    // Dùng verifyRole để lấy supabase client với quyền service (hoặc admin)
    const auth = await verifyRole()
    if (!auth.supabase) {
      return NextResponse.json({ error: 'Không thể khởi tạo Supabase client' }, { status: 500 })
    }

    const supabase = auth.supabase
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 1. Tìm tất cả hợp đồng đã hết hạn (end_date <= hôm nay) và còn status 'active' hoặc pending_checkout
    const { data: expiredContracts, error: contractsErr } = await supabase
      .from('contracts')
      .select('id, tenant_id, room_id, end_date, deposit_amount, status')
      .lte('end_date', today.toISOString())
      .in('status', ['active', 'pending_checkout'])

    if (contractsErr) {
      console.error('[auto-lock-expired] Lỗi truy vấn hợp đồng:', contractsErr)
      return NextResponse.json({ error: 'Lỗi truy vấn hợp đồng', details: contractsErr.message }, { status: 500 })
    }

    if (!expiredContracts || expiredContracts.length === 0) {
      return NextResponse.json({ success: true, message: 'Không có hợp đồng hết hạn cần xử lý.', processed: 0 })
    }

    const results: Array<{
      contractId: number
      tenantId: number
      action: string
      reason?: string
    }> = []

    const { dispatchNotification } = await import('@/lib/notification_dispatch')

    for (const contract of expiredContracts) {
      const { tenant_id: tenantId, room_id: roomId, deposit_amount: depositAmount } = contract

      // 2. Kiểm tra checkout_request của tenant này
      const { data: checkoutReq } = await supabase
        .from('checkout_requests')
        .select('id, status')
        .eq('tenant_id', tenantId)
        .in('status', ['confirmed', 'invoiced', 'pending_settlement'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Nếu không có checkout request thì bỏ qua (chưa có yêu cầu trả phòng)
      if (!checkoutReq) {
        results.push({ contractId: contract.id, tenantId, action: 'skipped', reason: 'Không có checkout_request' })
        continue
      }

      // 3. Lấy thông tin tenant
      const { data: tenantRow } = await supabase
        .from('tenants')
        .select('user_id')
        .eq('id', tenantId)
        .single()

      const { data: roomRow } = await supabase
        .from('rooms')
        .select('room_code, floor')
        .eq('id', roomId)
        .single()

      const roomCode = roomRow?.room_code
        ? roomRow.floor
          ? `Phòng ${roomRow.room_code} Tầng ${roomRow.floor}`
          : `Phòng ${roomRow.room_code}`
        : `Phòng ID ${roomId}`

      // 4. Kiểm tra còn ai ở trong phòng sau khi loại cư dân hiện tại không.
      const { count: remainingTenants } = await supabase
        .from('contracts')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', roomId)
        .in('status', ['active', 'pending_checkout'])
        .neq('id', contract.id)

      const isLastTenantInRoom = !remainingTenants || remainingTenants === 0

      if (isLastTenantInRoom) {
        // Người cuối rời phòng: bắt buộc hóa đơn tháng mới nhất của phòng đã thanh toán.
        const { data: latestMonthlyInvoice } = await supabase
          .from('invoices')
          .select('id, payment_status, total_amount, invoice_code, invoice_type')
          .eq('room_id', roomId)
          .or('invoice_type.is.null,invoice_type.eq.monthly')
          .order('issued_at', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!latestMonthlyInvoice) {
          const { data: managers } = await supabase
            .from('users')
            .select('id')
            .in('role', ['manager', 'super_admin'])

          for (const manager of managers ?? []) {
            try {
              await dispatchNotification(
                supabase,
                { userId: manager.id },
                {
                  title: `Chưa có hóa đơn tháng: ${roomCode}`,
                  body: `Hợp đồng tại ${roomCode} đã hết hạn và đây là người cuối rời phòng. Vui lòng tạo hóa đơn tháng trước khi hoàn tất trả phòng.`,
                  type: 'invoice',
                  relatedId: String(tenantId),
                }
              )
            } catch (_) { /* ignore */ }
          }

          results.push({ contractId: contract.id, tenantId, action: 'blocked_no_monthly_invoice' })
          continue
        }

        if (latestMonthlyInvoice.payment_status !== 'paid') {
          try {
            if (tenantRow?.user_id) {
              await dispatchNotification(
                supabase,
                { userId: String(tenantRow.user_id) },
                {
                  title: 'Cần thanh toán hóa đơn tháng',
                  body: `Hợp đồng tại ${roomCode} đã hết hạn. Vui lòng thanh toán hóa đơn ${latestMonthlyInvoice.invoice_code} (${Number(latestMonthlyInvoice.total_amount).toLocaleString('vi-VN')}đ) để hoàn tất trả phòng.`,
                  type: 'invoice',
                  relatedId: String(latestMonthlyInvoice.id),
                }
              )
            }
          } catch (_) { /* ignore */ }

          const { data: managers } = await supabase
            .from('users')
            .select('id')
            .in('role', ['manager', 'super_admin'])
          for (const manager of managers ?? []) {
            try {
              await dispatchNotification(
                supabase,
                { userId: manager.id },
                {
                  title: `Hóa đơn tháng chưa thanh toán: ${roomCode}`,
                  body: `Đây là người cuối rời ${roomCode}, nhưng hóa đơn ${latestMonthlyInvoice.invoice_code} chưa thanh toán nên chưa thể hoàn tất trả phòng.`,
                  type: 'invoice',
                  relatedId: String(latestMonthlyInvoice.id),
                }
              )
            } catch (_) { /* ignore */ }
          }

          results.push({ contractId: contract.id, tenantId, action: 'blocked_unpaid_monthly_invoice' })
          continue
        }
      }

      // 5. Đủ điều kiện → Khóa tài khoản cư dân và hoàn tất trả phòng
      try {
        // Khóa tài khoản trong bảng users (public)
        const { error: lockUserErr } = await supabase
          .from('users')
          .update({ status: 'locked', updated_at: new Date().toISOString() })
          .eq('id', tenantRow?.user_id ?? 0)

        if (lockUserErr) {
          console.error(`[auto-lock-expired] Lỗi khóa user ${tenantRow?.user_id}:`, lockUserErr)
        }

        // Cập nhật hợp đồng sang expired
        await supabase
          .from('contracts')
          .update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('id', contract.id)

        // Cập nhật checkout_request sang completed
        await supabase
          .from('checkout_requests')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', checkoutReq.id)

        // Đánh dấu đúng cư dân này đã trả phòng, kể cả khi phòng vẫn còn người ở chung.
        await supabase
          .from('tenants')
          .update({ move_out_date: new Date().toISOString() })
          .eq('id', tenantId)

        // Nếu không còn ai → giải phóng phòng
        if (isLastTenantInRoom) {
          await supabase
            .from('rooms')
            .update({ status: 'available' })
            .eq('id', roomId)
        }

        // Gửi thông báo cho cư dân
        if (tenantRow?.user_id) {
          await dispatchNotification(
            supabase,
            { userId: String(tenantRow.user_id) },
            {
              title: 'Hợp đồng đã kết thúc',
              body: `Hợp đồng tại ${roomCode} đã kết thúc. Tài khoản của bạn đã được đóng. Cảm ơn bạn đã sử dụng dịch vụ.`,
              type: 'contract',
              relatedId: String(tenantId),
            }
          )
        }

        // Thông báo Super Admin
        const { data: superAdmins } = await supabase.from('users').select('id').eq('role', 'super_admin')
        for (const sa of superAdmins ?? []) {
          try {
            await dispatchNotification(
              supabase,
              { userId: sa.id },
              {
                title: `Tài khoản cư dân đã bị khóa: ${roomCode}`,
                body: `Hợp đồng của cư dân tại ${roomCode} đã hết hạn. Tài khoản cư dân đã tự động bị khóa. Tiền cọc: ${(depositAmount ?? 0).toLocaleString('vi-VN')}đ cần được hoàn trả.`,
                type: 'contract',
                relatedId: String(tenantId),
              }
            )
          } catch (_) { /* ignore */ }
        }

        results.push({
          contractId: contract.id,
          tenantId,
          action: isLastTenantInRoom ? 'locked_expired_and_released_room' : 'locked_and_expired',
        })
      } catch (lockErr) {
        console.error(`[auto-lock-expired] Lỗi khóa cư dân ${tenantId}:`, lockErr)
        results.push({ contractId: contract.id, tenantId, action: 'error', reason: String(lockErr) })
      }
    }

    return NextResponse.json({
      success: true,
      processed: expiredContracts.length,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error: unknown) {
    console.error('[auto-lock-expired] Lỗi không xác định:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ', details: msg }, { status: 500 })
  }
}
