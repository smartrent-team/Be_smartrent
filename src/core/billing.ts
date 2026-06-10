// Cấu hình đơn giá mặc định toàn hệ thống (fallback)
export const DEFAULT_ELECTRICITY_PRICE_PER_KWH = 3500; // 3.500đ / số
export const DEFAULT_WATER_PRICE_PER_M3 = 30000;      // 30.000đ / khối

/**
 * Tính toán tiền điện dựa trên chỉ số công tơ và đơn giá (nếu có)
 */
export function calculateElectricityCost(oldIndex: number, newIndex: number, pricePerUnit?: number | null): number {
  if (newIndex < oldIndex) {
    throw new Error('Chỉ số điện mới không được nhỏ hơn chỉ số điện cũ.')
  }
  const price = pricePerUnit ?? DEFAULT_ELECTRICITY_PRICE_PER_KWH;
  return (newIndex - oldIndex) * price;
}

/**
 * Tính toán tiền nước dựa trên chỉ số công tơ và đơn giá (nếu có)
 */
export function calculateWaterCost(oldIndex: number, newIndex: number, pricePerUnit?: number | null): number {
  if (newIndex < oldIndex) {
    throw new Error('Chỉ số nước mới không được nhỏ hơn chỉ số nước cũ.')
  }
  const price = pricePerUnit ?? DEFAULT_WATER_PRICE_PER_M3;
  return (newIndex - oldIndex) * price;
}
