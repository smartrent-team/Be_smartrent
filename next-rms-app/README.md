# Hệ Thống Quản Lý Phòng Trọ (Room Management System - RMS)

Dự án này là một hệ thống phần mềm chuyên dụng để quản lý phòng trọ, hóa đơn, người thuê và yêu cầu hỗ trợ (tickets). Hệ thống được xây dựng trên nền tảng Next.js (App Router) với hiệu năng cao, giao diện thân thiện và tích hợp thanh toán tự động qua PayOS.

## 🌟 Tính Năng Nổi Bật

- **Bảng Điều Khiển (Dashboard):** Xem tổng quan tình hình kinh doanh, doanh thu, phòng trống.
- **Quản Lý Phòng & Người Thuê:** Theo dõi hợp đồng, thông tin khách thuê.
- **Quản Lý Hóa Đơn (Invoices):** Tự động tính tiền điện nước, dịch vụ. Tích hợp thanh toán QR Code tự động qua PayOS.
- **Quản Lý Yêu Cầu (Tickets):** Xử lý báo hỏng hóc, sửa chữa từ người thuê.
- **Giao Diện Hiện Đại:** Sử dụng Tailwind CSS v4, Shadcn UI mang lại trải nghiệm tối ưu.

## 🛠 Công Nghệ Sử Dụng

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Cơ Sở Dữ Liệu & Xác Thực:** [Supabase](https://supabase.com/)
- **UI/UX:** [Tailwind CSS v4](https://tailwindcss.com/) & [Shadcn UI](https://ui.shadcn.com/)
- **Thanh Toán Tự Động:** [PayOS](https://payos.vn/)
- **Quản Lý Hình Ảnh:** [Cloudinary](https://cloudinary.com/)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand)
- **Validation:** [Zod](https://zod.dev/)

## 🚀 Hướng Dẫn Cài Đặt

### 1. Yêu cầu hệ thống
- Node.js (phiên bản 18 trở lên)
- pnpm / npm / yarn

### 2. Cài đặt thư viện
```bash
npm install
```

### 3. Cấu hình Biến Môi Trường (Environment Variables)
Tạo file `.env.local` ở thư mục gốc của dự án và điền các thông số sau:

```env
# 1. Supabase (Database & Auth)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# 2. PayOS (Thanh toán QR tự động)
PAYOS_CLIENT_ID=your_payos_client_id
PAYOS_API_KEY=your_payos_api_key
PAYOS_CHECKSUM_KEY=your_payos_checksum_key

# 3. Cloudinary (Lưu trữ ảnh)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# 4. Firebase (Push Notifications - Tùy chọn)
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY="your_firebase_private_key"
```

> **Lưu ý Bảo mật:** Không bao giờ commit file `.env.local` lên GitHub.

### 4. Chạy ứng dụng

```bash
npm run dev
```

Mở trình duyệt và truy cập [http://localhost:3000](http://localhost:3000).

## 🔒 Hướng Dẫn Bảo Mật

### 1. Row Level Security (RLS) - Supabase
Để đảm bảo dữ liệu phòng trọ và hóa đơn không bị rò rỉ, bạn cần cấu hình RLS trên Supabase. Bạn có thể sao chép và chạy đoạn mã SQL trong thư mục `supabase/migrations/01_setup_rls.sql` trực tiếp trên SQL Editor của Supabase. Đoạn mã này đảm bảo rằng chỉ có quản trị viên (hoặc những tài khoản được ủy quyền) mới có thể đọc/ghi dữ liệu.

### 2. PayOS Webhook
Hệ thống sử dụng `payos.verifyPaymentWebhookData()` để tự động xác thực chữ ký (signature) của các webhook thanh toán gửi về. Hãy đảm bảo biến `PAYOS_CHECKSUM_KEY` được nhập chính xác để tránh bị giả mạo thanh toán.

---
*Dự án được xây dựng và hỗ trợ bởi AI (Antigravity).*
