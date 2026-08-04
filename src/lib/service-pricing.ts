/**
 * service-pricing.ts
 *
 * Helper lấy giá dịch vụ từ bảng branch_services + services.
 * Dùng chung cho tất cả API routes cần tính hóa đơn động.
 *
 * Schema quan trọng:
 *   services       : id, name, service_type ('fixed'|'metered'), billing_type ('per_room'|'per_person'|'per_unit')
 *   branch_services: service_id, branch_id, price, unit, is_active
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// ─── Fallback constants (dùng khi branch chưa cấu hình giá) ───────────────
export const DEFAULT_ELECTRIC_PRICE = 3_500   // đ/kWh
export const DEFAULT_WATER_PRICE    = 30_000  // đ/m³

// ─── Types ─────────────────────────────────────────────────────────────────

export interface BranchServiceRow {
  service_id: number
  branch_id:  number
  price:      number
  unit:       string | null
  is_active:  boolean
  service: {
    id:           number
    name:         string
    service_type: 'fixed' | 'metered'
    billing_type: 'per_room' | 'per_person' | 'per_unit'
  }
}

export interface BranchPricing {
  /** Đơn giá điện (đ/kWh) lấy từ branch_services, fallback về DEFAULT */
  electricPrice: number
  /** Đơn giá nước (đ/m³) lấy từ branch_services, fallback về DEFAULT */
  waterPrice: number
  /** Tổng phí dịch vụ cố định per-room (đ/tháng) — KHÔNG bao gồm per_unit */
  fixedServiceCost: number
  /** Chi tiết từng dịch vụ cố định đang active */
  fixedServices: Array<{
    serviceId:   number
    name:        string
    price:       number
    unit:        string | null
    billingType: 'per_room' | 'per_person' | 'per_unit'
  }>
}

// ─── Core helper ───────────────────────────────────────────────────────────

/**
 * Lấy toàn bộ cấu hình giá của một chi nhánh từ branch_services.
 *
 * @param supabase  Admin / service-role Supabase client
 * @param branchId  ID chi nhánh
 * @returns BranchPricing — không bao giờ throw, fallback về giá mặc định
 */
export async function getBranchPricing(
  supabase: SupabaseClient,
  branchId: number
): Promise<BranchPricing> {
  const { data, error } = await supabase
    .from('branch_services')
    .select(`
      service_id,
      branch_id,
      price,
      unit,
      is_active,
      service:services (
        id,
        name,
        service_type,
        billing_type
      )
    `)
    .eq('branch_id', branchId)
    .eq('is_active', true)

  if (error || !data) {
    console.warn(`[service-pricing] Không thể lấy branch_services cho branch ${branchId}:`, error?.message)
    return _defaultPricing()
  }

  const rows = data as unknown as BranchServiceRow[]

  let electricPrice = DEFAULT_ELECTRIC_PRICE
  let waterPrice    = DEFAULT_WATER_PRICE
  const fixedServices: BranchPricing['fixedServices'] = []

  for (const row of rows) {
    const svc = Array.isArray(row.service) ? row.service[0] : row.service
    if (!svc) continue

    if (svc.service_type === 'metered') {
      // Phân biệt điện vs nước theo tên (chuẩn hoá lowercase)
      const nameLower = svc.name.toLowerCase()
      if (nameLower.includes('điện') || nameLower.includes('dien') || nameLower.includes('electric')) {
        electricPrice = Number(row.price)
      } else if (nameLower.includes('nước') || nameLower.includes('nuoc') || nameLower.includes('water')) {
        waterPrice = Number(row.price)
      }
      continue
    }

    if (svc.service_type === 'fixed') {
      fixedServices.push({
        serviceId:   svc.id,
        name:        svc.name,
        price:       Number(row.price),
        unit:        row.unit,
        billingType: svc.billing_type,
      })
    }
  }

  // Tổng phí cố định per-room (per_room) — per_person sẽ tính riêng khi có số người
  const fixedServiceCost = fixedServices
    .filter(s => s.billingType === 'per_room')
    .reduce((sum, s) => sum + s.price, 0)

  return { electricPrice, waterPrice, fixedServiceCost, fixedServices }
}

/**
 * Tính tiền điện dựa trên chỉ số + đơn giá từ branch_services.
 */
export function calcElectricCost(
  oldIndex: number,
  newIndex: number,
  pricePerKwh: number
): number {
  const usage = Math.max(0, newIndex - oldIndex)
  return usage * pricePerKwh
}

/**
 * Tính tiền nước dựa trên chỉ số + đơn giá từ branch_services.
 */
export function calcWaterCost(
  oldIndex: number,
  newIndex: number,
  pricePerM3: number
): number {
  const usage = Math.max(0, newIndex - oldIndex)
  return usage * pricePerM3
}

/**
 * Lấy branch_id của một phòng.
 * Trả về null nếu không tìm thấy.
 */
export async function getRoomBranchId(
  supabase: SupabaseClient,
  roomId: number
): Promise<number | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select('branch_id')
    .eq('id', roomId)
    .single()

  if (error || !data) return null
  return data.branch_id as number
}

/**
 * Tính tổng phí dịch vụ cố định có tính đến số lượng xe (per_unit).
 *
 * @param pricing       Kết quả từ getBranchPricing
 * @param vehicleCount  Số xe trong phòng (mặc định 0)
 * @param tenantCount   Số người trong phòng (mặc định 1, dùng cho per_person)
 */
export function calcTotalServiceCost(
  pricing: BranchPricing,
  vehicleCount = 0,
  tenantCount  = 1,
): number {
  return pricing.fixedServices.reduce((sum, svc) => {
    switch (svc.billingType) {
      case 'per_room':   return sum + svc.price
      case 'per_person': return sum + svc.price * Math.max(1, tenantCount)
      case 'per_unit':   return sum + svc.price * vehicleCount
      default:           return sum
    }
  }, 0)
}

// ─── Private ───────────────────────────────────────────────────────────────

function _defaultPricing(): BranchPricing {
  return {
    electricPrice:    DEFAULT_ELECTRIC_PRICE,
    waterPrice:       DEFAULT_WATER_PRICE,
    fixedServiceCost: 0,
    fixedServices:    [],
  }
}
