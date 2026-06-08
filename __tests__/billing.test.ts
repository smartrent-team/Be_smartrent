import { calculateElectricityCost, calculateWaterCost, ELECTRICITY_PRICE_PER_KWH, WATER_PRICE_PER_M3 } from '../src/lib/billing';

describe('Billing Logic', () => {
  describe('calculateElectricityCost', () => {
    it('nên tính đúng tiền điện theo công thức', () => {
      const oldIndex = 100;
      const newIndex = 150;
      // Số điện = 50, Tiền = 50 * 3500 = 175000
      const expectedCost = (150 - 100) * ELECTRICITY_PRICE_PER_KWH;
      expect(calculateElectricityCost(oldIndex, newIndex)).toBe(expectedCost);
    });

    it('nên ném ra lỗi nếu chỉ số điện mới nhỏ hơn chỉ số cũ', () => {
      const oldIndex = 150;
      const newIndex = 100;
      expect(() => calculateElectricityCost(oldIndex, newIndex)).toThrow('Chỉ số điện mới không được nhỏ hơn chỉ số điện cũ.');
    });

    it('tiền điện bằng 0 nếu chỉ số không đổi', () => {
      const oldIndex = 100;
      const newIndex = 100;
      expect(calculateElectricityCost(oldIndex, newIndex)).toBe(0);
    });
  });

  describe('calculateWaterCost', () => {
    it('nên tính đúng tiền nước theo khối', () => {
      const oldIndex = 20;
      const newIndex = 25;
      // Số khối = 5, Tiền = 5 * 30000 = 150000
      const expectedCost = (25 - 20) * WATER_PRICE_PER_M3;
      expect(calculateWaterCost(oldIndex, newIndex)).toBe(expectedCost);
    });

    it('nên ném ra lỗi nếu chỉ số nước mới nhỏ hơn chỉ số cũ', () => {
      const oldIndex = 25;
      const newIndex = 20;
      expect(() => calculateWaterCost(oldIndex, newIndex)).toThrow('Chỉ số nước mới không được nhỏ hơn chỉ số nước cũ.');
    });
  });
});
