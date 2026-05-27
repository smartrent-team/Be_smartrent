import { z } from 'zod';

// 1. Validate Phone Number (10 chữ số, bắt đầu bằng 0)
const phoneRegex = /^0[0-9]{9}$/;
export const phoneSchema = z.string().regex(phoneRegex, 'Số điện thoại phải bao gồm 10 chữ số và bắt đầu bằng số 0');

// 2. Validate Room
export const roomSchema = z.object({
  roomNumber: z.string().min(1, 'Vui lòng nhập tên/số phòng'),
  branch: z.coerce.number().int().positive('Vui lòng chọn chi nhánh'),
  price: z.coerce.number().int().min(0, 'Giá phòng không được âm'),
  area: z.coerce.number().int().min(0, 'Diện tích không được âm').optional(),
  floor: z.coerce.number().int().min(1, 'Tầng không hợp lệ').optional(),
});

// 3. Validate Tenant
export const tenantSchema = z.object({
  name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự'),
  phone: phoneSchema,
  room_id: z.coerce.number().int().positive('Vui lòng chọn phòng'),
  move_in_date: z.string().min(1, 'Ngày vào ở không được để trống'),
  deposit_amount: z.coerce.number().int().min(0, 'Tiền cọc không được âm'),
});

// 4. Validate Ticket
export const ticketSchema = z.object({
  roomId: z.coerce.number().int().positive(),
  tenantId: z.coerce.number().int().positive(),
  title: z.string().min(5, 'Tiêu đề cần ít nhất 5 ký tự'),
  description: z.string().min(10, 'Mô tả cần ít nhất 10 ký tự'),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  images: z.array(z.string()).optional(),
});

// 5. Validate Invoice
export const invoiceSchema = z.object({
  room_id: z.coerce.number().int().positive('Vui lòng chọn phòng'),
  roomPrice: z.coerce.number().int().min(0, 'Tiền phòng không được âm').optional(),
  serviceCost: z.coerce.number().int().min(0, 'Phí dịch vụ không được âm').optional(),
  electricOld: z.coerce.number().int().min(0, 'Số điện cũ không được âm').optional(),
  electricNew: z.coerce.number().int().min(0, 'Số điện mới không được âm').optional(),
  waterOld: z.coerce.number().int().min(0, 'Số nước cũ không được âm').optional(),
  waterNew: z.coerce.number().int().min(0, 'Số nước mới không được âm').optional(),
}).refine(data => (data.electricNew || 0) >= (data.electricOld || 0), {
  message: 'Số điện mới phải lớn hơn hoặc bằng số điện cũ',
  path: ['electricNew']
}).refine(data => (data.waterNew || 0) >= (data.waterOld || 0), {
  message: 'Số nước mới phải lớn hơn hoặc bằng số nước cũ',
  path: ['waterNew']
});

// 6. Validate Contract
export const contractSchema = z.object({
  tenant_id: z.coerce.number().int().positive(),
  room_id: z.coerce.number().int().positive(),
  start_date: z.string().min(1, 'Ngày bắt đầu không được để trống'),
  end_date: z.string().optional(),
  deposit_amount: z.coerce.number().int().min(0).optional(),
  contract_images: z.array(z.string()).optional(),
});

// Helper phân tích lỗi
export const formatZodError = (error: z.ZodError) => {
  return error.issues.map(err => err.message).join(', ');
};
