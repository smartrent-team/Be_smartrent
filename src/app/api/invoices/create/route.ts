import { verifyRole } from '@/lib/rbac'
import { createInvoice } from '@/app/(admin)/invoices/actions'
import { NextResponse, type NextRequest } from 'next/server'

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
    } = body

    if (!roomId || roomPrice === undefined) {
      return NextResponse.json({ error: 'Thiếu roomId hoặc roomPrice' }, { status: 400 })
    }

    // Auto-calculate utility costs if not supplied but indices exist
    let finalElectricCost = electricCost
    if (finalElectricCost === undefined && electricOld !== undefined && electricNew !== undefined) {
      finalElectricCost = Math.max(0, Number(electricNew) - Number(electricOld)) * 3500
    }

    let finalWaterCost = waterCost
    if (finalWaterCost === undefined && waterOld !== undefined && waterNew !== undefined) {
      finalWaterCost = Math.max(0, Number(waterNew) - Number(waterOld)) * 30000
    }

    // Call the server action createInvoice passing the auth.supabase client
    const result = await createInvoice({
      room_id: Number(roomId),
      tenant_id: tenantId ? Number(tenantId) : undefined,
      utility_log_id: utilityLogId ? Number(utilityLogId) : undefined,
      roomPrice: Number(roomPrice),
      serviceCost: serviceCost ? Number(serviceCost) : 0,
      electricCost: finalElectricCost ? Number(finalElectricCost) : 0,
      waterCost: finalWaterCost ? Number(finalWaterCost) : 0,
      electricOld: electricOld ? Number(electricOld) : undefined,
      electricNew: electricNew ? Number(electricNew) : undefined,
      waterOld: waterOld ? Number(waterOld) : undefined,
      waterNew: waterNew ? Number(waterNew) : undefined,
    }, auth.supabase)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      invoiceId: result.invoiceId,
      invoiceCode: result.invoiceCode,
      tenantId: result.tenantId,
      payment: result.payment,
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
