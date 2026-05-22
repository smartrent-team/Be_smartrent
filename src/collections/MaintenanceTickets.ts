import { CollectionConfig } from 'payload'
import { isSuperAdminOrManager, tenantOwnsData } from '../access'
import { sendPushNotification } from '../utils/sendPushNotification'

export const MaintenanceTickets: CollectionConfig = {
  slug: 'maintenance-tickets',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'priority', 'tenant', 'room'],
    group: 'Hỗ trợ & Bảo trì',
  },
  access: {
    read: tenantOwnsData,
    create: () => true, // Giả sử tenant cũng có thể tự tạo (kiểm soát qua payload user req)
    update: isSuperAdminOrManager,
    delete: isSuperAdminOrManager,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Tiêu đề yêu cầu',
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
      label: 'Mô tả chi tiết',
    },
    {
      name: 'priority',
      type: 'select',
      options: [
        { label: 'Thấp', value: 'low' },
        { label: 'Trung bình', value: 'medium' },
        { label: 'Cao', value: 'high' },
        { label: 'Khẩn cấp', value: 'urgent' },
      ],
      defaultValue: 'medium',
      label: 'Mức độ ưu tiên',
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'open',
      options: [
        { label: 'Chưa xử lý', value: 'open' },
        { label: 'Đang xử lý', value: 'in-progress' },
        { label: 'Đã hoàn thành', value: 'resolved' },
      ],
      label: 'Trạng thái',
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      label: 'Người yêu cầu',
    },
    {
      name: 'room',
      type: 'relationship',
      relationTo: 'rooms',
      required: true,
      label: 'Phòng',
    },
    {
      name: 'assignedManager',
      type: 'relationship',
      relationTo: 'users',
      label: 'Người phụ trách (Manager)',
      admin: {
        condition: (data) => true,
      },
    },
    {
      name: 'images',
      type: 'array',
      label: 'Hình ảnh đính kèm (Tối đa 3 ảnh)',
      maxRows: 3,
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
          label: 'Ảnh',
        },
      ],
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation === 'create') {
          try {
            // Gửi cho tất cả Manager/Super Admin
            const tokens = await req.payload.find({
              collection: 'device-tokens',
              where: { user: { exists: true } },
            })
            
            const title = 'Yêu cầu sửa chữa mới!'
            const body = `Có báo cáo lỗi mới: ${doc.title}`
            
            // Bắn FCM
            for (const item of tokens.docs) {
              await sendPushNotification(item.token, title, body)
            }
            
            // Lấy danh sách manager users để lưu vào bảng Notifications
            const managerIds = [...new Set(tokens.docs.map(t => typeof t.user === 'object' ? t.user?.id : t.user).filter(Boolean))]
            for (const mId of managerIds) {
              await req.payload.create({
                collection: 'notifications',
                data: {
                  user: mId as string,
                  title,
                  body,
                  type: 'maintenance',
                  isRead: false
                }
              })
            }
          } catch (error) {
            console.error('Lỗi notification create:', error)
          }
        }

        if (operation === 'update') {
          try {
            if (doc.tenant) {
              const tenantId = typeof doc.tenant === 'object' ? doc.tenant.id : doc.tenant
              
              // Tìm user id của tenant này
              const tenantDoc = await req.payload.findByID({
                collection: 'tenants',
                id: tenantId,
              })
              const tenantUserId = typeof tenantDoc.user === 'object' ? tenantDoc.user.id : tenantDoc.user

              // Tìm device token của riêng tenant này
              const tokens = await req.payload.find({
                collection: 'device-tokens',
                where: { tenant: { equals: tenantId } },
              })
              
              const title = 'Cập nhật yêu cầu sửa chữa'
              const body = `Yêu cầu "${doc.title}" đã chuyển trạng thái thành: ${doc.status}`

              // Bắn FCM
              for (const item of tokens.docs) {
                await sendPushNotification(item.token, title, body)
              }
              
              // Lưu vào bảng Notifications cho cư dân
              if (tenantUserId) {
                await req.payload.create({
                  collection: 'notifications',
                  data: {
                    user: tenantUserId as string,
                    title,
                    body,
                    type: 'maintenance',
                    isRead: false
                  }
                })
              }
            }
          } catch (error) {
            console.error('Lỗi notification update:', error)
          }
        }
      },
    ],
  },
}
