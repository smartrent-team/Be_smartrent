import { CollectionConfig } from 'payload'
import { isSuperAdminOrManager } from '../access'
import { sendPushNotification } from '../utils/sendPushNotification'

export const UtilityLogs: CollectionConfig = {
  slug: 'utility-logs',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['room', 'month', 'year', 'electricUsage', 'waterUsage'],
    group: 'Điện nước & Hóa đơn',
  },
  access: {
    read: isSuperAdminOrManager, // Thay bằng managerOwnsData('branch') nếu có liên kết room -> branch
    create: isSuperAdminOrManager,
    update: isSuperAdminOrManager,
    delete: isSuperAdminOrManager,
  },
  fields: [
    {
      name: 'room',
      type: 'relationship',
      relationTo: 'rooms',
      required: true,
      label: 'Phòng',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'month',
          type: 'number',
          required: true,
          label: 'Tháng',
          min: 1,
          max: 12,
        },
        {
          name: 'year',
          type: 'number',
          required: true,
          label: 'Năm',
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'electricOld',
          type: 'number',
          required: true,
          label: 'Số điện cũ',
        },
        {
          name: 'electricNew',
          type: 'number',
          required: true,
          label: 'Số điện mới',
        },
        {
          name: 'electricUsage',
          type: 'number',
          label: 'Tiêu thụ điện',
          admin: { readOnly: true },
          hooks: {
            beforeChange: [
              ({ siblingData }) => {
                if (siblingData.electricNew && siblingData.electricOld) {
                  return siblingData.electricNew - siblingData.electricOld
                }
                return 0
              },
            ],
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'waterOld',
          type: 'number',
          required: true,
          label: 'Số nước cũ',
        },
        {
          name: 'waterNew',
          type: 'number',
          required: true,
          label: 'Số nước mới',
        },
        {
          name: 'waterUsage',
          type: 'number',
          label: 'Tiêu thụ nước',
          admin: { readOnly: true },
          hooks: {
            beforeChange: [
              ({ siblingData }) => {
                if (siblingData.waterNew && siblingData.waterOld) {
                  return siblingData.waterNew - siblingData.waterOld
                }
                return 0
              },
            ],
          },
        },
      ],
    },
    {
      name: 'recordedBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'Người ghi chỉ số',
      admin: { readOnly: true },
      hooks: {
        beforeChange: [
          ({ req, operation, value }) => {
            if (operation === 'create' && req.user) return req.user.id
            return value
          },
        ],
      },
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation === 'create') {
          try {
            const roomId = typeof doc.room === 'object' ? doc.room.id : doc.room

            // 1. Lấy thông tin phòng để biết tiền thuê (basePrice)
            const roomDoc = await req.payload.findByID({
              collection: 'rooms',
              id: roomId,
              req,
            })
            const roomPrice = roomDoc.basePrice || 0

            // 2. Lấy Hợp đồng đang Active để biết Cư dân đang ở là ai
            const activeContracts = await req.payload.find({
              collection: 'contracts',
              where: {
                room: { equals: roomId },
                status: { equals: 'active' },
              },
              limit: 1,
              req,
            })

            let tenantId = null
            if (activeContracts.docs.length > 0) {
              const contract = activeContracts.docs[0]
              tenantId = typeof contract.tenant === 'object' ? contract.tenant.id : contract.tenant
            }

            // 3. Tính tiền điện nước (Giá cố định: Điện 3.8k, Nước 30k)
            const electricCost = (doc.electricUsage || 0) * 3800
            const waterCost = (doc.waterUsage || 0) * 30000
            const totalAmount = roomPrice + electricCost + waterCost

            // 4. Tự động sinh Hóa đơn
            await req.payload.create({
              collection: 'invoices',
              data: {
                invoiceCode: '', // Sẽ được tự động sinh đè lên ở hook của Invoices
                room: roomId,
                tenant: tenantId,
                utilityLog: doc.id,
                roomPrice,
                electricCost,
                waterCost,
                serviceCost: 0,
                totalAmount,
                paymentStatus: 'unpaid',
              },
              req,
            })

            // 5. Bắn thông báo về máy Cư dân
            if (tenantId) {
              const tenantDoc = await req.payload.findByID({
                collection: 'tenants',
                id: tenantId,
                req,
              })
              const tenantUserId = typeof tenantDoc.user === 'object' ? tenantDoc.user.id : tenantDoc.user

              if (tenantUserId) {
                const tokens = await req.payload.find({
                  collection: 'device-tokens',
                  where: { tenant: { equals: tenantId } },
                  req,
                })

                const title = '🧾 Hóa đơn tháng mới'
                const body = `Hóa đơn phòng ${roomDoc.roomCode} tháng ${doc.month} đã được lập. Tổng thanh toán: ${totalAmount.toLocaleString('vi-VN')}đ`

                for (const item of tokens.docs) {
                  await sendPushNotification(item.token, title, body)
                }

                await req.payload.create({
                  collection: 'notifications',
                  data: {
                    user: tenantUserId as number,
                    title,
                    body,
                    type: 'invoice',
                    isRead: false,
                  },
                  req,
                })
              }
            }
          } catch (error) {
            console.error('Lỗi khi tự động sinh hóa đơn:', error)
          }
        }
      },
    ],
  },
}
