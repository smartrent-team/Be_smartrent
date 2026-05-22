import { CollectionConfig } from 'payload'
import { isSuperAdmin, isSuperAdminOrManager } from '../access'

export const Branches: CollectionConfig = {
  slug: 'branches',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'address', 'status', 'createdAt'],
    group: 'Quản lý cơ sở',
  },
  access: {
    read: isSuperAdminOrManager,
    create: isSuperAdmin,
    update: isSuperAdmin,
    delete: isSuperAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Tên cơ sở',
    },
    {
      name: 'address',
      type: 'text',
      label: 'Địa chỉ',
    },
    {
      name: 'phone',
      type: 'text',
      label: 'Số điện thoại liên hệ',
    },
    {
      name: 'description',
      type: 'textarea',
      label: 'Mô tả',
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'active',
      options: [
        { label: 'Hoạt động', value: 'active' },
        { label: 'Ngừng hoạt động', value: 'inactive' },
      ],
      label: 'Trạng thái',
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'Người tạo',
      admin: {
        readOnly: true,
      },
      hooks: {
        beforeChange: [
          ({ req, operation, value }) => {
            if (operation === 'create' && req.user) {
              return req.user.id
            }
            return value
          },
        ],
      },
    },
  ],
}
