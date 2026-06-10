import { v2 as cloudinary } from 'cloudinary'

// Cấu hình Cloudinary bằng biến môi trường
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

export default cloudinary

/**
 * Tối ưu hóa URL ảnh từ Cloudinary để giảm dung lượng (phục vụ Mobile App).
 * Chuyển đổi định dạng sang WebP, chất lượng tự động, giới hạn chiều rộng.
 */
export function optimizeCloudinaryUrl(url: string, width = 800): string {
  if (!url || !url.includes('cloudinary.com')) return url

  const uploadToken = '/upload/'
  const index = url.indexOf(uploadToken)

  if (index === -1) return url

  // Kiểm tra xem URL đã có tham số transform chưa
  const afterUpload = url.substring(index + uploadToken.length)
  if (/^[a-z]_[a-zA-Z0-9.,]+/.test(afterUpload)) {
    return url // Đã có transform
  }

  const transformations = `w_${width},c_limit,q_auto,f_webp/`
  return url.substring(0, index + uploadToken.length) + transformations + afterUpload
}
