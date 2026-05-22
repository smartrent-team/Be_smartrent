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
      name: 'contractCode',
      type: 'text',
      required: true,
      label: 'Mã hợp đồng',
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      label: 'Cư dân',
    },
    {
      name: 'room',
      type: 'relationship',
      relationTo: 'rooms',
      required: true,
      label: 'Phòng',
    },
    {
      name: 'startDate',
      type: 'date',
      required: true,
      label: 'Ngày bắt đầu',
    },
    {
      name: 'endDate',
      type: 'date',
      label: 'Ngày kết thúc',
    },
    {
      name: 'depositAmount',
      type: 'number',
      label: 'Tiền cọc',
    },
    {
      name: 'monthlyPrice',
      type: 'number',
      label: 'Giá thuê hàng tháng',
    },
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
    },
    {
      name: 'images',
      type: 'array',
      label: 'Ảnh chụp hợp đồng',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
          label: 'Ảnh',
        },
        {
          name: 'pageNumber',
          type: 'number',
          label: 'Số trang',
        },
      ],
    },
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
