import { CollectionConfig } from 'payload'
import { isSuperAdmin, isSuperAdminOrManager } from '../access'

export const Payments: CollectionConfig = {
  slug: 'payments',
  admin: {
    useAsTitle: 'transactionCode',
    defaultColumns: ['invoice', 'transactionCode', 'amount', 'paidAt'],
    group: 'Điện nước & Hóa đơn',
  },
  access: {
    read: isSuperAdminOrManager, // Thay bằng managerOwnsData cho manager nếu cần
    create: isSuperAdminOrManager, // Hoặc webhook tự tạo
    update: isSuperAdminOrManager,
    delete: isSuperAdmin,
  },
  fields: [
    {
      name: 'invoice',
      type: 'relationship',
      relationTo: 'invoices',
      required: true,
      label: 'Hóa đơn',
    },
    {
      name: 'bankCode',
      type: 'text',
      label: 'Mã ngân hàng',
    },
    {
      name: 'transactionCode',
      type: 'text',
      unique: true,
      label: 'Mã giao dịch',
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      label: 'Số tiền thanh toán',
    },
    {
      name: 'paidAt',
      type: 'date',
      required: true,
      label: 'Ngày thanh toán',
    },
    {
      name: 'rawPayload',
      type: 'json',
      label: 'Dữ liệu Webhook',
      admin: { readOnly: true },
    },
  ],
}
