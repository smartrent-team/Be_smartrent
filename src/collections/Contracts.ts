import { CollectionConfig } from 'payload'

export const Contracts: CollectionConfig = {
  slug: 'contracts',
  admin: { useAsTitle: 'contractCode' },
  fields: [
    { name: 'contractCode', type: 'text', required: true, label: 'Mã hợp đồng' },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      label: 'Cư dân',
    },
    {
      name: 'room',
      type: 'relationship',
      relationTo: 'rooms',
      required: true,
      label: 'Phòng',
    },
    { name: 'startDate', type: 'date', required: true, label: 'Ngày bắt đầu' },
    { name: 'endDate', type: 'date', label: 'Ngày kết thúc' },
    { name: 'deposit', type: 'number', label: 'Tiền cọc' },
    { name: 'contractFile', type: 'upload', relationTo: 'media', label: 'File hợp đồng (PDF)' },
  ],
  hooks: {
    afterChange: [
      async ({ doc, req, operation }) => {
        if (operation === 'create' && doc.room) {
          await req.payload.update({
            collection: 'rooms',
            id: doc.room,
            data: {
              status: 'occupied',
            },
            req,
          })
        }
      },
    ],
  },
}
