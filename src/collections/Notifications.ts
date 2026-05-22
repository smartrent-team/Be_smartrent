import { CollectionConfig } from 'payload'

export const Notifications: CollectionConfig = {
  slug: 'notifications',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'user', 'type', 'isRead', 'createdAt'],
    group: 'Hệ thống',
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      const u = user as any
      if (u.role === 'super_admin') return true
      return { user: { equals: user.id } }
    },
    create: () => true, // System có thể tự tạo
    update: ({ req: { user } }) => {
      if (!user) return false
      return { user: { equals: user.id } } // User tự đánh dấu đã đọc
    },
    delete: ({ req: { user } }) => {
      if (!user) return false
      const u = user as any
      if (u.role === 'super_admin') return true
      return { user: { equals: user.id } }
    },
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'Người nhận',
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Tiêu đề',
    },
    {
      name: 'body',
      type: 'textarea',
      label: 'Nội dung',
    },
    {
      name: 'type',
      type: 'select',
      options: [
        { label: 'Hóa đơn', value: 'invoice' },
        { label: 'Sửa chữa', value: 'maintenance' },
        { label: 'Hệ thống', value: 'system' },
      ],
      label: 'Loại thông báo',
    },
    {
      name: 'isRead',
      type: 'checkbox',
      defaultValue: false,
      label: 'Đã đọc',
    },
  ],
}
