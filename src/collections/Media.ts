import type { CollectionConfig } from 'payload'
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary'

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
    create: () => true, // Phân quyền lại nếu cần
    update: () => true,
    delete: () => true,
  },
  upload: {
    disableLocalStorage: true, // Tắt lưu file trên server
    adminThumbnail: 'url', // Hiển thị thumbnail từ thuộc tính url
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      label: 'Văn bản thay thế (Alt Text)',
    },
    {
      name: 'cloudinaryUrl',
      type: 'text',
      admin: {
        readOnly: true,
      },
      label: 'Đường dẫn Cloudinary',
    },
    {
      name: 'cloudinaryPublicId',
      type: 'text',
      admin: {
        hidden: true,
      },
    },
    {
      name: 'url',
      type: 'text',
      admin: {
        readOnly: true,
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        // Chỉ xử lý khi có file đẩy lên
        if ((operation === 'create' || operation === 'update') && req.file && req.file.data) {
          try {
            const result = await uploadToCloudinary(req.file.data, req.file.name)
            
            data.cloudinaryUrl = result.secure_url
            data.cloudinaryPublicId = result.public_id
            
            // Ép Payload sử dụng URL của Cloudinary thay vì đường dẫn cục bộ
            data.url = result.secure_url
            data.filename = req.file.name
            data.filesize = req.file.size
            data.mimeType = req.file.mimetype
          } catch (err) {
            console.error('Lỗi upload ảnh lên Cloudinary:', err)
            throw new Error('Tải ảnh lên Cloudinary thất bại')
          }
        }
        return data
      },
    ],
    afterDelete: [
      async ({ doc }) => {
        // Xóa ảnh trên Cloudinary khi xóa document trong DB
        if (doc.cloudinaryPublicId) {
          try {
            await deleteFromCloudinary(doc.cloudinaryPublicId)
          } catch (err) {
            console.error('Lỗi xóa ảnh Cloudinary:', err)
          }
        }
      },
    ],
  },
}
