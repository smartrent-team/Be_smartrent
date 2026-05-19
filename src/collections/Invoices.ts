import { CollectionConfig } from 'payload'
import { isAdminOrLandlord, tenantOwnsData } from '../access'
import { payos } from '../utils/payos'

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
    { name: 'checkoutUrl', type: 'text', label: 'Link thanh toán PayOS' },
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
    afterChange: [
      async ({ doc, req, operation, context }) => {
        // Tránh vòng lặp vô hạn
        if (context.skipPayOSHooks) return

        // Chỉ tạo link thanh toán khi hóa đơn chưa thanh toán (unpaid) và chưa có checkoutUrl
        if (doc.status === 'unpaid' && !doc.checkoutUrl) {
          try {
            const returnUrl = process.env.PAYOS_RETURN_URL || `${process.env.APP_URL || 'http://localhost:3000'}/payment-success`
            const cancelUrl = process.env.PAYOS_CANCEL_URL || `${process.env.APP_URL || 'http://localhost:3000'}/payment-cancel`

            // Tạo link thanh toán PayOS. orderCode phải là kiểu number (ID hóa đơn)
            const paymentLink = await payos.paymentRequests.create({
              orderCode: doc.id,
              amount: doc.amount,
              description: `TT Phong ${doc.id}`,
              returnUrl,
              cancelUrl,
            })

            // Cập nhật lại hóa đơn với checkoutUrl và qrPayload
            await req.payload.update({
              collection: 'invoices',
              id: doc.id,
              data: {
                checkoutUrl: paymentLink.checkoutUrl,
                qrPayload: paymentLink.qrCode,
              },
              context: { skipPayOSHooks: true },
              req,
            })
          } catch (error) {
            console.error('Failed to create PayOS payment link:', error)
          }
        }
      },
    ],
  },
}
