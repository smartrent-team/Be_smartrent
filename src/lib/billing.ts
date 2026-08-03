/**
 * billing.ts
 *
 * Các hàm tính chi phí tiện ích.
 * Giá mặc định được re-export từ service-pricing để tập trung ở một nơi.
 * Các caller nên ưu tiên dùng calcElectricCost / calcWaterCost từ service-pricing
 * kèm giá lấy từ getBranchPricing(), chỉ fallback về hàm này khi không có branch context.
 */

export {
  DEFAULT_ELECTRIC_PRICE as ELECTRICITY_PRICE_PER_KWH,
  DEFAULT_WATER_PRICE    as WATER_PRICE_PER_M3,
} from './service-pricing'

/**
 * Tính tiền điện — dùng đơn giá truyền vào (mặc định fallback 3.500đ/kWh).
 */
export function calculateElectricityCost(
  oldIndex: number,
  newIndex: number,
  pricePerKwh = 3_500
): number {
  if (newIndex < oldIndex) {
    throw new Error('Chỉ số điện mới không được nhỏ hơn chỉ số điện cũ.')
  }
  return (newIndex - oldIndex) * pricePerKwh
}

/**
 * Tính tiền nước — dùng đơn giá truyền vào (mặc định fallback 30.000đ/m³).
 */
export function calculateWaterCost(
  oldIndex: number,
  newIndex: number,
  pricePerM3 = 30_000
): number {
  if (newIndex < oldIndex) {
    throw new Error('Chỉ số nước mới không được nhỏ hơn chỉ số nước cũ.')
  }
  return (newIndex - oldIndex) * pricePerM3
}
