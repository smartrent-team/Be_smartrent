// Cấu hình đơn giá mặc định
export const ELECTRICITY_PRICE_PER_KWH = 3500; // 3.500đ / số
export const WATER_PRICE_PER_M3 = 30000;      // 30.000đ / khối

/**
 * Tính toán tiền điện dựa trên chỉ số công tơ
 */
export function calculateElectricityCost(oldIndex: number, newIndex: number): number {
  if (newIndex < oldIndex) {
    throw new Error('Chỉ số điện mới không được nhỏ hơn chỉ số điện cũ.')
  }
  return (newIndex - oldIndex) * ELECTRICITY_PRICE_PER_KWH
}

/**
 * Tính toán tiền nước dựa trên chỉ số công tơ
 */
export function calculateWaterCost(oldIndex: number, newIndex: number): number {
  if (newIndex < oldIndex) {
    throw new Error('Chỉ số nước mới không được nhỏ hơn chỉ số nước cũ.')
  }
  return (newIndex - oldIndex) * WATER_PRICE_PER_M3
}
