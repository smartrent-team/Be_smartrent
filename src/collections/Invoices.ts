import { CollectionConfig } from 'payload'
import { isAdminOrLandlord, tenantOwnsData } from '../access'

export const Invoices: CollectionConfig = {
  slug: 'invoices',
  access: {
    read: tenantOwnsData,
    create: isAdminOrLandlord,
    update: isAdminOrLandlord,
    delete: isAdminOrLandlord,
  },
  fields: [
    { name: 'invoiceNumber', type: 'text', required: true, label: 'Mã hóa đơn' },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      label: 'Khách thanh toán',
    },
    { name: 'amount', type: 'number', required: true, label: 'Số tiền' },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Chưa thu', value: 'unpaid' },
        { label: 'Đã thu', value: 'paid' },
      ],
      defaultValue: 'unpaid',
    },
    { name: 'qrPayload', type: 'text', label: 'Dữ liệu VietQR' },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        if (operation === 'create') {
          const date = new Date()
          const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`

          // Tìm hóa đơn cuối cùng trong tháng này
          const lastInvoice = await req.payload.find({
            collection: 'invoices',
            where: {
              invoiceNumber: {
                like: `INV-${yearMonth}-`,
              },
            },
            sort: '-createdAt',
            limit: 1,
          })

          let nextNumber = 1
          if (lastInvoice.docs.length > 0) {
            const lastNumStr = lastInvoice.docs[0].invoiceNumber.split('-').pop() || '0'
            nextNumber = parseInt(lastNumStr) + 1
          }

          data.invoiceNumber = `INV-${yearMonth}-${String(nextNumber).padStart(4, '0')}`
        }
      },
    ],
  },
}
