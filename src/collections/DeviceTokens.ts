import { CollectionConfig } from 'payload'

export const DeviceTokens: CollectionConfig = {
  slug: 'device-tokens',
  admin: {
    useAsTitle: 'token',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'token',
      type: 'text',
      required: true,
      unique: true,
      label: 'FCM Device Token',
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      label: 'Người dùng (Manager/Admin)',
      admin: {
        description: 'Điền nếu đây là thiết bị của Quản lý',
      },
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      label: 'Cư dân (Tenant)',
      admin: {
        description: 'Điền nếu đây là thiết bị của Cư dân',
      },
    },
    {
      name: 'platform',
      type: 'select',
      options: [
        { label: 'iOS', value: 'ios' },
        { label: 'Android', value: 'android' },
        { label: 'Web', value: 'web' },
      ],
      label: 'Nền tảng',
    },
  ],
}
