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
      name: 'branch',
      type: 'relationship',
      relationTo: 'branches',
      required: true,
      label: 'Cơ sở',
      admin: {
        description: 'Cơ sở chứa phòng này',
      },
    },
    {
      name: 'roomCode',
      type: 'text',
      required: true,
      label: 'Mã phòng',
    },
    {
      name: 'floor',
      type: 'number',
      label: 'Tầng',
    },
    {
      name: 'area',
      type: 'number',
      label: 'Diện tích (m2)',
    },
    {
      name: 'basePrice',
      type: 'number',
      required: true,
      label: 'Giá thuê cơ bản',
    },
    {
      name: 'electricPrice',
      type: 'number',
      label: 'Đơn giá điện (đ/kWh)',
    },
    {
      name: 'waterPrice',
      type: 'number',
      label: 'Đơn giá nước (đ/khối)',
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
    },
  ],
}
