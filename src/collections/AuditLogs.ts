import { CollectionConfig } from 'payload'
import { isSuperAdmin } from '../access'

export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  admin: {
    useAsTitle: 'action',
    defaultColumns: ['action', 'entityType', 'user', 'createdAt'],
    group: 'Hệ thống',
  },
  access: {
    read: isSuperAdmin,
    create: () => true, // Payload hooks tự tạo
    update: () => false, // Không ai được sửa log
    delete: isSuperAdmin, // Chỉ super admin được xóa (dọn rác)
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      label: 'Người thực hiện',
    },
    {
      name: 'action',
      type: 'select',
      options: [
        { label: 'Tạo mới', value: 'create' },
        { label: 'Cập nhật', value: 'update' },
        { label: 'Xóa', value: 'delete' },
        { label: 'Đăng nhập', value: 'login' },
      ],
      required: true,
      label: 'Hành động',
    },
    {
      name: 'entityType',
      type: 'text',
      label: 'Bảng dữ liệu',
    },
    {
      name: 'entityId',
      type: 'text',
      label: 'ID Bảng dữ liệu',
    },
    {
      name: 'oldData',
      type: 'json',
      label: 'Dữ liệu cũ',
    },
    {
      name: 'newData',
      type: 'json',
      label: 'Dữ liệu mới',
    },
  ],
}
