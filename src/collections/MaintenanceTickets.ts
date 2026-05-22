import { CollectionConfig } from 'payload'
import { isAdminOrLandlord, tenantOwnsData } from '../access'
import { sendPushNotification } from '../utils/sendPushNotification'

export const MaintenanceTickets: CollectionConfig = {
  slug: 'maintenance-tickets',
  access: {
    read: tenantOwnsData,
    create: () => true, // Everyone can create? Or maybe only tenants? 
    // Requirement says: tenant only sees own. Landlord sees all.
    update: isAdminOrLandlord,
    delete: isAdminOrLandlord,
  },
  hooks: {
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation === 'create') {
          try {
            const tokens = await req.payload.find({
              collection: 'device-tokens',
              where: { user: { exists: true } },
            })
            for (const item of tokens.docs) {
              await sendPushNotification(
                item.token,
                'Yêu cầu sửa chữa mới!',
                `Có báo cáo lỗi mới: ${doc.title}`
              )
            }
          } catch (error) {
            console.error('Lỗi notification create:', error)
          }
        }

        if (operation === 'update') {
          try {
            if (doc.tenant) {
              const tenantId = typeof doc.tenant === 'object' ? doc.tenant.id : doc.tenant
              const tokens = await req.payload.find({
                collection: 'device-tokens',
                where: { tenant: { equals: tenantId } },
              })
              for (const item of tokens.docs) {
                await sendPushNotification(
                  item.token,
                  'Cập nhật yêu cầu sửa chữa',
                  `Yêu cầu "${doc.title}" đã chuyển trạng thái thành: ${doc.status}`
                )
              }
            }
          } catch (error) {
            console.error('Lỗi notification update:', error)
          }
        }
      },
    ],
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'tenant', 'room'],
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
}
