import { CollectionConfig } from 'payload'
import { isSuperAdmin, isSuperAdminOrManager } from '../access'

export const Branches: CollectionConfig = {
  slug: 'branches',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'address', 'createdAt'],
    group: 'Quản lý cơ sở',
  },
  // Chỉ super_admin mới được tạo/xóa cơ sở.
  // Manager chỉ đọc cơ sở của mình (được lọc qua access function).
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
  ],
}
