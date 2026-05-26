import { CollectionConfig } from 'payload'
import { isSuperAdmin, isSuperAdminOrManager, managerOwnsData } from '../access'

export const Rooms: CollectionConfig = {
  slug: 'rooms',
  admin: {
    useAsTitle: 'roomCode',
    defaultColumns: ['roomCode', 'branch', 'basePrice', 'status'],
    group: 'Quản lý cơ sở',
  },
  access: {
    read: managerOwnsData('branch'),
    create: isSuperAdminOrManager,
    update: managerOwnsData('branch'),
    delete: isSuperAdmin,
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'branch',
          type: 'relationship',
          relationTo: 'branches',
          required: true,
          label: 'Cơ sở',
          admin: {
            description: 'Cơ sở chứa phòng này',
            width: '50%',
          },
        },
        {
          name: 'roomCode',
          type: 'text',
          required: true,
          label: 'Mã phòng',
          admin: { width: '50%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'floor',
          type: 'number',
          label: 'Tầng',
          admin: { width: '33%' },
        },
        {
          name: 'area',
          type: 'number',
          label: 'Diện tích (m2)',
          admin: { width: '33%' },
        },
        {
          name: 'status',
          type: 'select',
          options: [
            { label: 'Trống', value: 'available' },
            { label: 'Đã thuê', value: 'occupied' },
            { label: 'Bảo trì', value: 'maintenance' },
          ],
          defaultValue: 'available',
          label: 'Trạng thái',
          admin: { width: '34%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'basePrice',
          type: 'number',
          required: true,
          label: 'Giá thuê cơ bản',
          admin: { width: '33%' },
        },
        {
          name: 'electricPrice',
          type: 'number',
          label: 'Đơn giá điện (đ/kWh)',
          admin: { width: '33%' },
        },
        {
          name: 'waterPrice',
          type: 'number',
          label: 'Đơn giá nước (đ/khối)',
          admin: { width: '34%' },
        },
      ],
    },
  ],
}
