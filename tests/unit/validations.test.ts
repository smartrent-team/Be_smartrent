import { phoneSchema, invoiceSchema } from '@/lib/validations';

describe('Validations', () => {
  describe('phoneSchema', () => {
    it('should validate a correct phone number', () => {
      const result = phoneSchema.safeParse('0987654321');
      expect(result.success).toBe(true);
    });

    it('should reject a phone number not starting with 0', () => {
      const result = phoneSchema.safeParse('1987654321');
      expect(result.success).toBe(false);
    });

    it('should reject a phone number with less than 10 digits', () => {
      const result = phoneSchema.safeParse('098765432');
      expect(result.success).toBe(false);
    });

    it('should reject a phone number with characters', () => {
      const result = phoneSchema.safeParse('098765432a');
      expect(result.success).toBe(false);
    });
  });

  describe('invoiceSchema', () => {
    it('should validate correctly when new indices are greater than old indices', () => {
      const validInvoice = {
        room_id: 1,
        electricOld: 100,
        electricNew: 150,
        waterOld: 50,
        waterNew: 60,
      };
      const result = invoiceSchema.safeParse(validInvoice);
      expect(result.success).toBe(true);
    });

    it('should fail validation when electricNew is less than electricOld', () => {
      const invalidInvoice = {
        room_id: 1,
        electricOld: 150,
        electricNew: 100,
      };
      const result = invoiceSchema.safeParse(invalidInvoice);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Số điện mới phải lớn hơn hoặc bằng số điện cũ');
      }
    });

    it('should fail validation when waterNew is less than waterOld', () => {
      const invalidInvoice = {
        room_id: 1,
        waterOld: 60,
        waterNew: 50,
      };
      const result = invoiceSchema.safeParse(invalidInvoice);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Số nước mới phải lớn hơn hoặc bằng số nước cũ');
      }
    });
  });
});
