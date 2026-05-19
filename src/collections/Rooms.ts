// collections/Rooms.ts
import { CollectionConfig } from 'payload'
import { isSuperAdmin, isSuperAdminOrManager, managerOwnsData } from '../access'

export const Rooms: CollectionConfig = {
  slug: 'rooms', // Tên định danh trong database và API
  admin: {
    useAsTitle: 'roomNumber',
    defaultColumns: ['roomNumber', 'branch', 'price', 'status'],
    group: 'Quản lý cơ sở',
  },
  // super_admin: toàn quyền
  // manager: chỉ thấy phòng thuộc branch của mình (lọc qua managerOwnsData)
  // tenant: không được thêm/sửa/xóa phòng
  access: {
    read: managerOwnsData('branch'),
    create: isSuperAdminOrManager,
    update: managerOwnsData('branch'),
    delete: isSuperAdmin,
  },
  fields: [
    {
      // Trường branch được đặt lên đầu — đây là cột cốt lõi của RLS
      name: 'branch',
      type: 'relationship',
      relationTo: 'branches',
      required: true,
      label: 'Cơ sở',
      // Manager chỉ thấy branch của mình trong dropdown (xử lý phía access)
      admin: {
        description: 'Cơ sở chứa phòng này',
      },
    },
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
      label: 'Trạng thái',
    },
  ],
}
