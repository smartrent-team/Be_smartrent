export function replaceContractImagesForRoomChange(
  previousImages: string[] | null | undefined,
  newImages: string[] | null | undefined
): string[] {
  const normalizedPrevious = (previousImages ?? []).filter(
    (url): url is string => typeof url === 'string' && url.trim().length > 0
  )
  const normalizedNew = (newImages ?? []).filter(
    (url): url is string => typeof url === 'string' && url.trim().length > 0
  )

  if (normalizedNew.length > 0) {
    return [...new Set(normalizedNew)]
  }

  if (normalizedPrevious.length > 0) {
    return [...new Set(normalizedPrevious)]
  }

  return []
}

export function buildRoomChangeHistoryPayload(input: {
  contractCode: string
  tenantId: number
  newRoomId: number
  moveInIso: string
  endIso: string | null
  monthlyPrice: number
  depositAmount: number | null | undefined
  previousImages: string[] | null | undefined
  newImages: string[] | null | undefined
}) {
  return {
    contract_code: input.contractCode,
    tenant_id: input.tenantId,
    room_id: input.newRoomId,
    start_date: input.moveInIso,
    end_date: input.endIso,
    status: 'active',
    deposit_amount: input.depositAmount ?? 0,
    monthly_price: input.monthlyPrice,
    contract_images: replaceContractImagesForRoomChange(
      input.previousImages,
      input.newImages
    ),
  }
}

export function buildExpiredHistoricalContractUpdate(input: {
  moveInIso: string
  endIso?: string | null
}) {
  return {
    status: 'expired',
    end_date: input.endIso ?? input.moveInIso,
  }
}
