import { CollectionConfig } from 'payload'
import { isSuperAdminOrManager } from '../access'

export const UtilityLogs: CollectionConfig = {
  slug: 'utility-logs',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['room', 'month', 'year', 'electricUsage', 'waterUsage'],
    group: 'Điện nước & Hóa đơn',
  },
  access: {
    read: isSuperAdminOrManager, // Thay bằng managerOwnsData('branch') nếu có liên kết room -> branch
    create: isSuperAdminOrManager,
    update: isSuperAdminOrManager,
    delete: isSuperAdminOrManager,
  },
  fields: [
    {
      name: 'room',
      type: 'relationship',
      relationTo: 'rooms',
      required: true,
      label: 'Phòng',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'month',
          type: 'number',
          required: true,
          label: 'Tháng',
          min: 1,
          max: 12,
        },
        {
          name: 'year',
          type: 'number',
          required: true,
          label: 'Năm',
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'electricOld',
          type: 'number',
          required: true,
          label: 'Số điện cũ',
        },
        {
          name: 'electricNew',
          type: 'number',
          required: true,
          label: 'Số điện mới',
        },
        {
          name: 'electricUsage',
          type: 'number',
          label: 'Tiêu thụ điện',
          admin: { readOnly: true },
          hooks: {
            beforeChange: [
              ({ siblingData }) => {
                if (siblingData.electricNew && siblingData.electricOld) {
                  return siblingData.electricNew - siblingData.electricOld
                }
                return 0
              },
            ],
          },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'waterOld',
          type: 'number',
          required: true,
          label: 'Số nước cũ',
        },
        {
          name: 'waterNew',
          type: 'number',
          required: true,
          label: 'Số nước mới',
        },
        {
          name: 'waterUsage',
          type: 'number',
          label: 'Tiêu thụ nước',
          admin: { readOnly: true },
          hooks: {
            beforeChange: [
              ({ siblingData }) => {
                if (siblingData.waterNew && siblingData.waterOld) {
                  return siblingData.waterNew - siblingData.waterOld
                }
                return 0
              },
            ],
          },
        },
      ],
    },
    {
      name: 'recordedBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'Người ghi chỉ số',
      admin: { readOnly: true },
      hooks: {
        beforeChange: [
          ({ req, operation, value }) => {
            if (operation === 'create' && req.user) return req.user.id
            return value
          },
        ],
      },
    },
  ],
}
