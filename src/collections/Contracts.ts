import { CollectionConfig } from 'payload'
import { isSuperAdminOrManager, tenantOwnsData } from '../access'

export const Contracts: CollectionConfig = {
  slug: 'contracts',
  admin: {
    useAsTitle: 'contractCode',
    defaultColumns: ['contractCode', 'tenant', 'room', 'status'],
    group: 'Khách thuê',
  },
  access: {
    read: tenantOwnsData,
    create: isSuperAdminOrManager,
    update: isSuperAdminOrManager,
    delete: isSuperAdminOrManager,
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Thông tin hợp đồng',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'contractCode', type: 'text', required: true, label: 'Mã hợp đồng', admin: { width: '50%' } },
                {
                  name: 'status',
                  type: 'select',
                  options: [
                    { label: 'Có hiệu lực', value: 'active' },
                    { label: 'Hết hạn', value: 'expired' },
                    { label: 'Đã chấm dứt', value: 'terminated' },
                  ],
                  defaultValue: 'active',
                  label: 'Trạng thái',
                  admin: { width: '50%' },
                },
              ]
            },
            {
              type: 'row',
              fields: [
                { name: 'tenant', type: 'relationship', relationTo: 'tenants', required: true, label: 'Cư dân', admin: { width: '50%' } },
                { name: 'room', type: 'relationship', relationTo: 'rooms', required: true, label: 'Phòng', admin: { width: '50%' } },
              ]
            },
            {
              type: 'row',
              fields: [
                { name: 'startDate', type: 'date', required: true, label: 'Ngày bắt đầu', admin: { width: '50%' } },
                { name: 'endDate', type: 'date', label: 'Ngày kết thúc', admin: { width: '50%' } },
              ]
            },
            {
              type: 'row',
              fields: [
                { name: 'depositAmount', type: 'number', label: 'Tiền cọc', admin: { width: '50%' } },
                { name: 'monthlyPrice', type: 'number', label: 'Giá thuê hàng tháng', admin: { width: '50%' } },
              ]
            },
          ]
        },
        {
          label: 'Tài liệu đính kèm',
          fields: [
            {
              name: 'images',
              type: 'array',
              label: 'Ảnh chụp hợp đồng',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'image', type: 'upload', relationTo: 'media', required: true, label: 'Ảnh', admin: { width: '50%' } },
                    { name: 'pageNumber', type: 'number', label: 'Số trang', admin: { width: '50%' } },
                  ]
                }
              ],
            },
          ]
        }
      ]
    }
  ],
  hooks: {
    afterChange: [
      async ({ doc, req, operation }) => {
        if (operation === 'create' && doc.room) {
          await req.payload.update({
            collection: 'rooms',
            id: typeof doc.room === 'object' ? doc.room.id : doc.room,
            data: {
              status: 'occupied',
            },
            req,
          })
        }
      },
    ],
  },
}
