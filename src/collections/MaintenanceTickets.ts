import { CollectionConfig } from 'payload'
import { isAdminOrLandlord, tenantOwnsData } from '../access'

export const MaintenanceTickets: CollectionConfig = {
  slug: 'maintenance-tickets',
  access: {
    read: tenantOwnsData,
    create: () => true, // Everyone can create? Or maybe only tenants? 
    // Requirement says: tenant only sees own. Landlord sees all.
    update: isAdminOrLandlord,
    delete: isAdminOrLandlord,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'tenant', 'room'],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Tiêu đề yêu cầu',
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
      label: 'Mô tả chi tiết',
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'open',
      options: [
        { label: 'Chưa xử lý', value: 'open' },
        { label: 'Đang xử lý', value: 'in-progress' },
        { label: 'Đã hoàn thành', value: 'resolved' },
      ],
      label: 'Trạng thái',
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      label: 'Người yêu cầu',
    },
    {
      name: 'room',
      type: 'relationship',
      relationTo: 'rooms',
      required: true,
      label: 'Phòng',
    },
  ],
}
