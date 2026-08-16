export const EFFECTIVE_CONTRACT_STATUSES = [
  'active',
  'pending_checkout',
  'pending_liquidation',
  'inspection',
  'pending_settlement',
] as const

export type ContractSelectionCandidate = {
  id?: number | string | null
  status?: string | null
  start_date?: string | null
  end_date?: string | null
  created_at?: string | null
}

function getContractSortValue(contract: ContractSelectionCandidate): number {
  const dateCandidates = [contract.start_date, contract.end_date, contract.created_at].filter(
    (value): value is string => typeof value === 'string' && value.length > 0
  )

  if (dateCandidates.length === 0) {
    const safeId = typeof contract.id === 'number' ? contract.id : Number(contract.id ?? 0)
    return Number.isFinite(safeId) ? safeId : 0
  }

  const newestDate = dateCandidates
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => b - a)[0]

  if (Number.isFinite(newestDate)) {
    return newestDate
  }

  const safeId = typeof contract.id === 'number' ? contract.id : Number(contract.id ?? 0)
  return Number.isFinite(safeId) ? safeId : 0
}

export function isEffectiveContractStatus(status?: string | null): boolean {
  return !!status && EFFECTIVE_CONTRACT_STATUSES.includes(status as (typeof EFFECTIVE_CONTRACT_STATUSES)[number])
}

export function getLatestEffectiveContract<T extends ContractSelectionCandidate>(
  contracts: T[] | null | undefined
): T | null {
  if (!contracts || contracts.length === 0) return null

  const effectiveCandidates = contracts.filter((contract) =>
    isEffectiveContractStatus(contract.status)
  )

  const candidates = effectiveCandidates.length > 0 ? effectiveCandidates : contracts

  return candidates.reduce<T | null>((latest, current) => {
    if (!latest) return current
    if (getContractSortValue(current) > getContractSortValue(latest)) {
      return current
    }
    return latest
  }, null)
}
