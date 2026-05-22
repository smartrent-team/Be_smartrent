import { CollectionConfig } from 'payload'
import { isSuperAdminOrManager, tenantOwnsData } from '../access'

export const Tenants: CollectionConfig = {
  slug: 'tenants',
  admin: {
    useAsTitle: 'identityNumber', // Since fullName is in Users, we use identityNumber or custom
    defaultColumns: ['user', 'room', 'identityNumber', 'moveInDate'],
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
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'Tài khoản User',
      admin: {
        description: 'Tài khoản đăng nhập của khách thuê này',
      },
    },
    {
      name: 'room',
      type: 'relationship',
      relationTo: 'rooms',
      required: true,
      label: 'Phòng đang thuê',
    },
    {
      name: 'identityNumber',
      type: 'text',
      required: true,
      label: 'Số CCCD/CMND',
    },
    {
      name: 'emergencyContact',
      type: 'text',
      label: 'Liên hệ khẩn cấp',
    },
    {
      name: 'moveInDate',
      type: 'date',
      required: true,
      label: 'Ngày chuyển vào',
    },
    {
      name: 'moveOutDate',
      type: 'date',
      label: 'Ngày chuyển đi',
    },
    {
      name: 'idCardImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Ảnh CCCD',
    },
  ],
}
