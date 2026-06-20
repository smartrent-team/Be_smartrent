import { NextResponse, type NextRequest } from 'next/server'
import { verifyRole } from '@/lib/rbac'
import cloudinary from '@/lib/cloudinary'

export async function GET(request: NextRequest) {
  try {
    // 1. Chỉ cho phép user đã đăng nhập (Quản lý / Khách thuê) mới được tải ảnh
    const auth = await verifyRole()
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error || 'Chưa xác thực' }, { status: auth.status || 401 })
    }

    // 2. Tạo timestamp hiện tại
    const timestamp = Math.round(new Date().getTime() / 1000)

    // Lấy tên folder từ param, mặc định là general
    const { searchParams } = new URL(request.url)
    const folder = searchParams.get('folder') || 'general'

    // 3. Khởi tạo Payload để ký
    const paramsToSign = {
      timestamp,
      folder
    }

    // 4. Sinh chữ ký bảo mật bằng API Secret
    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET!
    )

    // 5. Trả về cấu hình để Client tự upload
    return NextResponse.json({
      success: true,
      signature,
      timestamp,
      folder,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
