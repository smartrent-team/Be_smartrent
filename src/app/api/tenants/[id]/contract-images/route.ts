import { NextResponse, type NextRequest } from 'next/server'

import { createContractDirectly, updateContractImagesDirectly } from '@/core/contracts'
import { verifyRole } from '@/lib/rbac'

function parseContractImages(body: unknown): string[] {
  if (!Array.isArray(body)) return []

  return body.filter(
    (url: unknown): url is string => typeof url === 'string' && url.startsWith('http')
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status || 401 })
    }

    if (auth.role === 'tenant') {
      return NextResponse.json({ error: 'Không có quyền cập nhật hợp đồng' }, { status: 403 })
    }

    const { id } = await params
    const tenantId = Number.parseInt(id, 10)
    if (!Number.isFinite(tenantId)) {
      return NextResponse.json({ error: 'ID cư dân không hợp lệ' }, { status: 400 })
    }

    const body = await request.json()
    const contractImages = parseContractImages(body.contractImages)
    const parsedRoomId = body.roomId != null ? Number(body.roomId) : null
    const roomIdFromBody = Number.isFinite(parsedRoomId) ? parsedRoomId : null

    const supabase = auth.supabase!

    const { data: tenantRow, error: tenantError } = await supabase
      .from('tenants')
      .select('id, room_id')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenantRow) {
      return NextResponse.json({ error: 'Không tìm thấy cư dân' }, { status: 404 })
    }

    const roomId = roomIdFromBody ?? tenantRow.room_id
    if (!roomId) {
      return NextResponse.json(
        { error: 'Cư dân chưa có phòng — không thể lưu hợp đồng' },
        { status: 400 }
      )
    }

    if (auth.role === 'manager') {
      if (!auth.branchId) {
        return NextResponse.json({ error: 'Manager chưa được gán chi nhánh' }, { status: 403 })
      }

      const { data: roomRow } = await supabase
        .from('rooms')
        .select('branch_id')
        .eq('id', roomId)
        .single()

      if (roomRow && roomRow.branch_id !== auth.branchId) {
        return NextResponse.json({ error: 'Không có quyền với phòng này' }, { status: 403 })
      }
    }

    const { data: activeContracts, error: contractLookupError } = await supabase
      .from('contracts')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('id', { ascending: false })
      .limit(1)

    if (contractLookupError) {
      console.error('contract-images lookup:', contractLookupError)
      return NextResponse.json(
        {
          error: 'Không truy vấn được hợp đồng',
          details: contractLookupError.message,
        },
        { status: 500 }
      )
    }

    const activeContractId = activeContracts?.[0]?.id ?? null

    if (activeContractId) {
      const updated = await updateContractImagesDirectly(activeContractId, contractImages)

      if (!updated) {
        return NextResponse.json(
          {
            error: 'Không lưu được ảnh hợp đồng',
            details: 'Không tìm thấy hợp đồng đang hoạt động',
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        contractId: updated.id,
        contractImages: updated.contractImages,
      })
    }

    if (contractImages.length === 0) {
      return NextResponse.json({ error: 'Danh sách ảnh hợp đồng trống' }, { status: 400 })
    }

    const { data: roomRow } = await supabase
      .from('rooms')
      .select('base_price')
      .eq('id', roomId)
      .single()

    const created = await createContractDirectly({
      contractCode: `HD-${roomId}-${tenantId}-${Date.now().toString().slice(-4)}`,
      tenantId,
      roomId,
      startDate: new Date().toISOString(),
      depositAmount: 0,
      monthlyPrice: roomRow?.base_price ?? 0,
      status: 'active',
      contractImages,
    })

    return NextResponse.json({
      success: true,
      contractId: created.id,
      contractImages: created.contractImages,
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('contract-images:', error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ', details: errorMessage },
      { status: 500 }
    )
  }
}
