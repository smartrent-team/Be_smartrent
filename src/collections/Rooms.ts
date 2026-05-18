// collections/Rooms.ts
import { CollectionConfig } from 'payload'

export const Rooms: CollectionConfig = {
  slug: 'rooms', // Tên định danh trong database và API
  admin: {
    useAsTitle: 'roomNumber',
    defaultColumns: ['roomNumber', 'price', 'status'],
  },
  fields: [
    {
      name: 'roomNumber',
      type: 'text',
      required: true,
      label: 'Số phòng',
    },
    {
      name: 'price',
      type: 'number',
      required: true,
      label: 'Giá thuê',
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
    },
  ],
}
