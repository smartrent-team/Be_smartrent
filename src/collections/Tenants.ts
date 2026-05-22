import { CollectionConfig } from 'payload'

export const Tenants: CollectionConfig = {
  slug: 'tenants',
  admin: { useAsTitle: 'fullName' },
  fields: [
    { name: 'fullName', type: 'text', required: true, label: 'Họ tên' },
    { name: 'idNumber', type: 'text', required: true, label: 'Số CCCD' },
    { name: 'phoneNumber', type: 'text', label: 'Số điện thoại' },
    { name: 'dob', type: 'date', label: 'Ngày sinh' },
    { name: 'address', type: 'text', label: 'Địa chỉ thường trú' },
    { name: 'room', type: 'relationship', relationTo: 'rooms', label: 'Phòng đang thuê' },
    { name: 'idCardImage', type: 'upload', relationTo: 'media', label: 'Ảnh CCCD' },
  ],
}
