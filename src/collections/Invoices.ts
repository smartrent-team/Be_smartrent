import { CollectionConfig } from 'payload'
import { isSuperAdminOrManager, tenantOwnsData } from '../access'
import { payos } from '../utils/payos'

export const Invoices: CollectionConfig = {
  slug: 'invoices',
  admin: {
    useAsTitle: 'invoiceCode',
    defaultColumns: ['invoiceCode', 'room', 'tenant', 'totalAmount', 'paymentStatus'],
    group: 'Điện nước & Hóa đơn',
  },
  access: {
    read: tenantOwnsData,
    create: isSuperAdminOrManager,
    update: isSuperAdminOrManager,
    delete: isSuperAdminOrManager,
  },
  fields: [
    {
      name: 'invoiceCode',
      type: 'text',
      required: true,
      label: 'Mã hóa đơn',
    },
    {
      name: 'room',
      type: 'relationship',
      relationTo: 'rooms',
      required: true,
      label: 'Phòng',
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      label: 'Khách thuê (Người nhận)',
    },
    {
      name: 'utilityLog',
      type: 'relationship',
      relationTo: 'utility-logs',
      label: 'Chỉ số điện nước',
    },
    {
      name: 'roomPrice',
      type: 'number',
      required: true,
      label: 'Tiền phòng',
    },
    {
      name: 'electricCost',
      type: 'number',
      label: 'Tiền điện',
    },
    {
      name: 'waterCost',
      type: 'number',
      label: 'Tiền nước',
    },
    {
      name: 'serviceCost',
      type: 'number',
      label: 'Phí dịch vụ khác',
    },
    {
      name: 'totalAmount',
      type: 'number',
      required: true,
      label: 'Tổng thanh toán',
    },
    {
      name: 'paymentStatus',
      type: 'select',
      options: [
        { label: 'Chưa thanh toán', value: 'unpaid' },
        { label: 'Thanh toán một phần', value: 'partial' },
        { label: 'Đã thanh toán', value: 'paid' },
      ],
      defaultValue: 'unpaid',
      label: 'Trạng thái thanh toán',
    },
    {
      name: 'issuedAt',
      type: 'date',
      label: 'Ngày xuất hóa đơn',
    },
    {
      name: 'paidAt',
      type: 'date',
      label: 'Ngày thanh toán xong',
    },
    {
      name: 'qrPayload',
      type: 'text',
      label: 'Dữ liệu VietQR',
      admin: { readOnly: true },
    },
    {
      name: 'checkoutUrl',
      type: 'text',
      label: 'Link thanh toán PayOS',
      admin: { readOnly: true },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        if (operation === 'create' && !data.invoiceCode) {
          const date = new Date()
          const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`

          const lastInvoice = await req.payload.find({
            collection: 'invoices',
            where: {
              invoiceCode: {
                like: `INV-${yearMonth}-`,
              },
            },
            sort: '-createdAt',
            limit: 1,
          })

          let nextNumber = 1
          if (lastInvoice.docs.length > 0) {
            const lastNumStr = lastInvoice.docs[0].invoiceCode.split('-').pop() || '0'
            nextNumber = parseInt(lastNumStr) + 1
          }

          data.invoiceCode = `INV-${yearMonth}-${String(nextNumber).padStart(4, '0')}`
          if (!data.issuedAt) {
            data.issuedAt = new Date().toISOString()
          }
        }
      },
    ],
    afterChange: [
      async ({ doc, req, operation, context }) => {
        if (context.skipPayOSHooks) return

        if (doc.paymentStatus === 'unpaid' && !doc.checkoutUrl && doc.totalAmount > 0) {
          try {
            const returnUrl = process.env.PAYOS_RETURN_URL || `${process.env.APP_URL || 'http://localhost:3000'}/payment-success`
            const cancelUrl = process.env.PAYOS_CANCEL_URL || `${process.env.APP_URL || 'http://localhost:3000'}/payment-cancel`

            const paymentLink = await payos.paymentRequests.create({
              orderCode: doc.id, // Ensure this maps to a number in production or use an auto-increment ID field
              amount: doc.totalAmount,
              description: `TT Phong ${doc.room}`,
              returnUrl,
              cancelUrl,
            })

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
