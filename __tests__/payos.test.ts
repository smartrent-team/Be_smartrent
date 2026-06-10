import { toTenantPaymentError } from '../src/core/invoice-payment';

describe('PayOS Error Mapping Logic', () => {
  it('trả về lỗi chung nếu technicalWarning bị null', () => {
    expect(toTenantPaymentError(null)).toBe('Không thể tạo link thanh toán lúc này. Vui lòng thử lại sau hoặc liên hệ ban quản lý.');
  });

  it('xử lý lỗi chưa đủ 2000đ', () => {
    expect(toTenantPaymentError('Số tiền hóa đơn phải từ 2.000đ để thanh toán qua PayOS.')).toBe('Hóa đơn chưa đủ điều kiện thanh toán (tối thiểu 2.000đ).');
  });

  it('xử lý lỗi chủ trọ chưa cấu hình PayOS', () => {
    expect(toTenantPaymentError('Chủ trọ chưa cấu hình cổng thanh toán PayOS.')).toBe('Chủ trọ chưa cấu hình thanh toán tự động. Vui lòng chọn chuyển khoản thủ công.');
  });

  it('xử lý lỗi các nguyên nhân kỹ thuật khác', () => {
    expect(toTenantPaymentError('PayOS API Timeout')).toBe('Thanh toán tạm thời chưa khả dụng. Vui lòng liên hệ ban quản lý.');
  });
});
