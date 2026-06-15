import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'
import { extractDepositFromContractText } from '@/lib/aiDepositExtractor'

export const dynamic = 'force-dynamic'

type ContractRow = {
  id: number
  tenant_id: number
  room_id: number
  contract_text: string | null
  deposit_amount: number | null
  contract_images: string[] | null
  tenants?: { user_id: string; room?: { branch_id: number | null } | null } | null
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyRole()
    if (auth.error || !auth.user || !auth.role) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    const { id } = await params
    const contractId = Number(id)
    if (!Number.isFinite(contractId)) {
      return NextResponse.json({ error: 'ID hợp đồng không hợp lệ' }, { status: 400 })
    }

    const supabase = auth.supabase!

    const { data: contract, error } = await supabase
      .from('contracts')
      .select(`
        id,
        tenant_id,
        room_id,
        contract_text,
        deposit_amount,
        contract_images,
        tenants (
          user_id,
          room:rooms (
            branch_id
          )
        )
      `)
      .eq('id', contractId)
      .maybeSingle()

    if (error) throw error
    if (!contract) {
      return NextResponse.json({ error: 'Không tìm thấy hợp đồng' }, { status: 404 })
    }

    const contractRow = contract as unknown as ContractRow
    const tenantUserId = contractRow.tenants?.user_id

    if (auth.role === 'tenant' && tenantUserId !== auth.dbUserId) {
      return NextResponse.json({ error: 'Bạn không có quyền truy cập hợp đồng này' }, { status: 403 })
    }

    if (auth.role === 'manager' && auth.branchId != null) {
      const branchId = contractRow.tenants?.room?.branch_id
      if (branchId != null && branchId !== auth.branchId) {
        return NextResponse.json({ error: 'Bạn không có quyền truy cập hợp đồng chi nhánh khác' }, { status: 403 })
      }
    }

    const contractText = contractRow.contract_text?.trim() ?? ''
    const extraction = await extractDepositFromContractText(contractText)

    const { error: updateError } = await supabase
      .from('contracts')
      .update({
        deposit_amount: extraction.depositAmount,
        deposit_currency: extraction.currency,
        deposit_raw_text: extraction.rawTextMatched,
        deposit_confidence: extraction.confidence,
      })
      .eq('id', contractId)

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      data: {
        contractId,
        ...extraction,
        hasContractText: contractText.length > 0,
        imageCount: Array.isArray(contractRow.contract_images)
          ? contractRow.contract_images.length
          : 0,
      },
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
