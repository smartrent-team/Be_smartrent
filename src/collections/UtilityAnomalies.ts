import { CollectionConfig } from 'payload'
import { isSuperAdminOrManager } from '../access'

export const UtilityAnomalies: CollectionConfig = {
  slug: 'utility-anomalies',
  admin: {
    useAsTitle: 'message',
    defaultColumns: ['utilityLog', 'type', 'severity', 'resolved'],
    group: 'Điện nước & Hóa đơn',
  },
  access: {
    read: isSuperAdminOrManager,
    create: isSuperAdminOrManager,
    update: isSuperAdminOrManager,
    delete: isSuperAdminOrManager,
  },
  fields: [
    {
      name: 'utilityLog',
      type: 'relationship',
      relationTo: 'utility-logs',
      required: true,
      label: 'Chỉ số liên quan',
    },
    {
      name: 'type',
      type: 'select',
      options: [
        { label: 'Điện', value: 'electric' },
        { label: 'Nước', value: 'water' },
      ],
      required: true,
      label: 'Loại bất thường',
    },
    {
      name: 'severity',
      type: 'select',
      options: [
        { label: 'Cảnh báo', value: 'warning' },
        { label: 'Nghiêm trọng', value: 'critical' },
      ],
      required: true,
      label: 'Mức độ',
    },
    {
      name: 'message',
      type: 'textarea',
      label: 'Nội dung',
    },
    {
      name: 'resolved',
      type: 'checkbox',
      defaultValue: false,
      label: 'Đã giải quyết',
    },
  ],
}
