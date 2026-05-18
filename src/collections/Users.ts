import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [
    {
      name: 'fullName',
      type: 'text',
      label: 'Họ và tên',
    },
    {
      name: 'role',
      type: 'select',
      defaultValue: 'tenant',
      required: true,
      options: [
        { label: 'Chủ nhà (Landlord)', value: 'landlord' },
        { label: 'Cư dân (Tenant)', value: 'tenant' },
      ],
      saveToJWT: true,
    },
  ],
}
