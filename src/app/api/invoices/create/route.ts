import { verifyRole } from '@/lib/rbac'
import { createInvoice } from '@/app/(admin)/invoices/actions'
import { NextResponse, type NextRequest } from 'next/server'
import {
  getBranchPricing,
  getRoomBranchId,
  calcElectricCost,
  calcWaterCost,
} from '@/lib/service-pricing'

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    if (auth.role === 'tenant') {
      return NextResponse.json({ error: 'Tenant không có quyền tạo hóa đơn' }, { status: 403 })
    }

    const body = await request.json()
    const {
      roomId,
      tenantId,
      utilityLogId,
      roomPrice,
      serviceCost,
      electricCost,
      waterCost,
      electricOld,
      electricNew,
      waterOld,
      waterNew,
      // repairCost: nếu mobile truyền thì dùng luôn,
      // nếu không truyền → server tự fetch từ maintenance_tickets resolved
      repairCost,
    } = body

    if (!roomId || roomPrice === undefined) {
      return NextResponse.json({ error: 'Thiếu roomId hoặc roomPrice' }, { status: 400 })
    }

    const supabase = auth.supabase!

    // ── 1. Branch pricing ────────────────────────────────────────────────────
    const branchId = await getRoomBranchId(supabase, Number(roomId))
    const pricing  = branchId ? await getBranchPricing(supabase, branchId) : null

    // ── 2. Tiền điện ─────────────────────────────────────────────────────────
    let finalElectricCost: number
    if (electricCost !== undefined) {
      finalElectricCost = Number(electricCost)
    } else if (electricOld !== undefined && electricNew !== undefined) {
      finalElectricCost = calcElectricCost(
        Number(electricOld), Number(electricNew),
        pricing?.electricPrice ?? 3_500,
      )
    } else {
      finalElectricCost = 0
    }

    // ── 3. Tiền nước ─────────────────────────────────────────────────────────
    let finalWaterCost: number
    if (waterCost !== undefined) {
      finalWaterCost = Number(waterCost)
    } else if (waterOld !== undefined && waterNew !== undefined) {
      finalWaterCost = calcWaterCost(
        Number(waterOld), Number(waterNew),
        pricing?.waterPrice ?? 30_000,
      )
    } else {
      finalWaterCost = 0
    }

    // ── 4. Phí dịch vụ cố định ───────────────────────────────────────────────
    const finalServiceCost = serviceCost !== undefined
      ? Number(serviceCost)
      : (pricing?.fixedServiceCost ?? 0)

    // ── 5. Chi phí sửa chữa ──────────────────────────────────────────────────
    // Nếu mobile truyền repairCost thì dùng luôn (đã được preview trước).
    // Nếu không, tự fetch tổng repair_cost từ các ticket resolved + chưa được tính vào HĐ.
    let finalRepairCost = 0
    if (repairCost !== undefined) {
      finalRepairCost = Math.max(0, Number(repairCost))
    } else {
      const { data: resolvedTickets } = await supabase
        .from('maintenance_tickets')
        .select('id, repair_cost')
        .eq('room_id', Number(roomId))
        .eq('status', 'resolved')
        .not('repair_cost', 'is', null)
        .gt('repair_cost', 0)
        // Chỉ lấy ticket chưa được tính vào hóa đơn nào (invoice_id IS NULL)
        .is('invoice_id', null)

      if (resolvedTickets && resolvedTickets.length > 0) {
        finalRepairCost = resolvedTickets.reduce(
          (sum: number, t: { repair_cost: number }) => sum + (t.repair_cost || 0),
          0
        )
      }
    }

    // ── 6. Tạo hóa đơn ──────────────────────────────────────────────────────
    const result = await createInvoice(
      {
        room_id:        Number(roomId),
        tenant_id:      tenantId     ? Number(tenantId)     : undefined,
        utility_log_id: utilityLogId ? Number(utilityLogId) : undefined,
        roomPrice:      Number(roomPrice),
        serviceCost:    finalServiceCost,
        electricCost:   finalElectricCost,
        waterCost:      finalWaterCost,
        repairCost:     finalRepairCost,
        electricOld:    electricOld !== undefined ? Number(electricOld) : undefined,
        electricNew:    electricNew !== undefined ? Number(electricNew) : undefined,
        waterOld:       waterOld    !== undefined ? Number(waterOld)    : undefined,
        waterNew:       waterNew    !== undefined ? Number(waterNew)    : undefined,
      },
      supabase,
    )

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    // ── 7. Đánh dấu tickets đã được tính vào hóa đơn này ────────────────────
    if (finalRepairCost > 0 && result.invoiceId) {
      await supabase
        .from('maintenance_tickets')
        .update({ invoice_id: result.invoiceId })
        .eq('room_id', Number(roomId))
        .eq('status', 'resolved')
        .not('repair_cost', 'is', null)
        .gt('repair_cost', 0)
        .is('invoice_id', null)
    }

    return NextResponse.json({
      success:     true,
      invoiceId:   result.invoiceId,
      invoiceCode: result.invoiceCode,
      tenantId:    result.tenantId,
      payment:     result.payment,
      pricing: {
        electricPrice:    pricing?.electricPrice    ?? 3_500,
        waterPrice:       pricing?.waterPrice       ?? 30_000,
        fixedServiceCost: pricing?.fixedServiceCost ?? 0,
        repairCost:       finalRepairCost,
      },
      ...(result.paymentWarning ? { paymentWarning: result.paymentWarning } : {}),
    })

  } catch (error: unknown) {
    console.error('Error in api/invoices/create:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}
