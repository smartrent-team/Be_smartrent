import { calculateElectricityCost, calculateWaterCost, DEFAULT_ELECTRICITY_PRICE_PER_KWH, DEFAULT_WATER_PRICE_PER_M3 } from '@/core/billing';

describe('Billing Logic', () => {
  describe('calculateElectricityCost', () => {
    it('should calculate cost correctly when newIndex > oldIndex', () => {
      const oldIndex = 100;
      const newIndex = 150;
      const expectedCost = (150 - 100) * DEFAULT_ELECTRICITY_PRICE_PER_KWH;
      expect(calculateElectricityCost(oldIndex, newIndex)).toBe(expectedCost);
    });

    it('should return 0 when newIndex === oldIndex', () => {
      expect(calculateElectricityCost(100, 100)).toBe(0);
    });

    it('should throw an error when newIndex < oldIndex', () => {
      expect(() => calculateElectricityCost(150, 100)).toThrow('Chỉ số điện mới không được nhỏ hơn chỉ số điện cũ.');
    });
  });

  describe('calculateWaterCost', () => {
    it('should calculate cost correctly when newIndex > oldIndex', () => {
      const oldIndex = 50;
      const newIndex = 60;
      const expectedCost = (60 - 50) * DEFAULT_WATER_PRICE_PER_M3;
      expect(calculateWaterCost(oldIndex, newIndex)).toBe(expectedCost);
    });

    it('should return 0 when newIndex === oldIndex', () => {
      expect(calculateWaterCost(50, 50)).toBe(0);
    });

    it('should throw an error when newIndex < oldIndex', () => {
      expect(() => calculateWaterCost(60, 50)).toThrow('Chỉ số nước mới không được nhỏ hơn chỉ số nước cũ.');
    });
  });
});
