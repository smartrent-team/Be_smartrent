import type { CollectionConfig, FieldAccess } from 'payload'
import { isSuperAdmin, isSuperAdminOrManager } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'fullName', 'role', 'branch'],
    group: 'Quản lý người dùng',
  },
  auth: true,
  // Chỉ super_admin mới được tạo/xóa/phân quyền user.
  // Các user khác chỉ đọc/sửa thông tin của chính mình (xử lý ở cấp field).
  access: {
    create: isSuperAdmin,
    delete: isSuperAdmin,
  },
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
      // saveToJWT: true cho phép đọc role từ JWT mà không cần query DB
      saveToJWT: true,
      options: [
        { label: 'Quản trị hệ thống (Super Admin)', value: 'super_admin' },
        { label: 'Quản lý cơ sở (Manager)', value: 'manager' },
        { label: 'Cư dân (Tenant)', value: 'tenant' },
      ],
      // Chỉ super_admin mới được thay đổi role của người khác
      access: {
        update: (({ req: { user } }) => !!(user as any && (user as any).role === 'super_admin')) as FieldAccess,
      },
    },
    {
      name: 'branch',
      type: 'relationship',
      relationTo: 'branches',
      label: 'Cơ sở quản lý',
      // Chỉ hiển thị trường này khi role là manager
      admin: {
        condition: (data) => data?.role === 'manager',
        description: 'Cơ sở mà Manager này được phân công quản lý',
      },
      // Lưu branch_id vào JWT để dùng trong RLS và access control
      saveToJWT: true,
    },
  ],
}
