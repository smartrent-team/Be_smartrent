# 🏢 Smart Rent Management System (RMS) - Backend

Hệ thống quản lý chuỗi nhà trọ thông minh (RMS) được xây dựng trên nền tảng **Payload CMS 3.x**, **Next.js 16**, kết nối cơ sở dữ liệu **Supabase PostgreSQL** tích hợp phân quyền bảo mật cấp cao (RBAC & RLS) và tự động sinh mã VietQR động qua cổng thanh toán **PayOS**.

---

## 🚀 Tính Năng Chính

*   **👥 Phân Quyền Vai Trò (RBAC):** Định cấu hình 3 cấp độ tài khoản bảo mật:
    *   `super_admin`: Toàn quyền quản trị hệ thống.
    *   `manager`: Quản lý vận hành chi nhánh/cơ sở nhà trọ được gán.
    *   `tenant`: Cư dân thuê phòng (chỉ có quyền xem thông tin cá nhân, hợp đồng và thanh toán hóa đơn của chính mình).
*   **🛡️ Bảo Mật Đa Tầng (Defense-in-Depth):**
    *   *Tầng ứng dụng (Payload CMS):* Lọc dữ liệu qua các hàm Access Control.
    *   *Tầng cơ sở dữ liệu (Supabase RLS):* Kích hoạt **Row Level Security (RLS)** trên Postgres kiểm soát truy cập thông qua mã JWT Token.
*   **💳 Sinh Mã VietQR Động (PayOS Integration):**
    *   Tự động tạo mã thanh toán VietQR động và liên kết PayOS ngay khi xuất hóa đơn chưa thanh toán (`unpaid`).
    *   Tự động đồng bộ cập nhật trạng thái hóa đơn thành "Đã thanh toán" (`paid`) theo thời gian thực thông qua hệ thống bảo mật **Webhook Callback**.

*   **📖 Swagger UI Tích Hợp Sẵn:**
    *   Tài liệu đặc tả API chuẩn hóa trực quan và chạy test trực tiếp ngay trên server thông qua đường dẫn `/docs`.

---

## 🛠️ Công Nghệ Sử Dụng

*   **Framework:** Next.js 16 (App Router) & Payload CMS 3.x
*   **Database:** PostgreSQL (Supabase Connection Pooler)
*   **Payment Gateway:** PayOS SDK (`@payos/node`)
*   **ORM / DB Adapter:** `@payloadcms/db-postgres`
*   **API Spec:** OpenAPI 3.0 & Swagger UI

---

## ⚙️ Hướng Dẫn Cài Đặt & Chạy Local

### 1. Cài đặt các thư viện phụ thuộc:
```bash
pnpm install
```

### 2. Thiết lập biến môi trường (`.env`):
Tạo file `.env` ở thư mục gốc và điền đầy đủ các thông tin sau:
```env
# Supabase Pooler (IPv4 Cổng 6543)
DATABASE_URL="postgresql://postgres.xifjbxdrruqtoobzlfqz:Ttai140999!!@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Khóa bí mật JWT Payload
PAYLOAD_SECRET="8d73b28d5b619b4d2384b245"

# PayOS API Keys
CLIENT_ID="2689d09d-804c-4a07-bafd-7a45a0d41190"
API_KEY="68cb0219-5990-4e47-b436-3a68a83248a2"
CHECKSUM_KEY="key0c8ab0a750fb37054a48a41361d1e727fc8d87db7693ba6e2e4c8a0473d69070"

# App URL
APP_URL="http://localhost:3000"
```

### 3. Chạy Server ở chế độ Phát triển (Development):
```bash
pnpm dev
```
Sau khi khởi chạy thành công:
*   Trang chủ Next.js: `http://localhost:3000`
*   Trang Quản trị Admin Dashboard: `http://localhost:3000/admin`
*   Tài liệu API Swagger UI: **`http://localhost:3000/docs`**

---

## 📁 Cấu Trúc Thư Mục Dự Án Chính

```text
├── public/                  # Các file tĩnh (Chứa đặc tả openapi.json)
├── src/
│   ├── access/              # Chứa các hàm phân quyền ứng dụng (RBAC)
│   ├── app/
│   │   ├── (payload)/       # Giao diện admin của Payload CMS
│   │   ├── (frontend)/      # Các trang Next.js phía client
│   │   │   └── docs/        # Route handler phục vụ Swagger UI
│   ├── collections/         # Các Schema định nghĩa dữ liệu (Models)
│   │   ├── Users.ts         # Tài khoản hệ thống
│   │   ├── Rooms.ts         # Phòng trọ
│   │   ├── Invoices.ts      # Hóa đơn & Hooks PayOS
│   │   └── ...              # Các collections khác (Tenants, Contracts...)
│   ├── endpoints/           # Các Custom API Handlers (Webhook PayOS)
│   ├── utils/               # Công cụ hỗ trợ (Khởi tạo PayOS client)
│   └── payload.config.ts    # File cấu hình trung tâm Payload CMS
├── flutter_integration/     # Mã nguồn mẫu tích hợp xác thực & API cho Flutter
└── ENVIRONMENT.md           # Tài liệu chi tiết kết nối mạng cho điện thoại & Flutter
```

---

## 🛡️ Hướng Dẫn Kiểm Tra Cơ Chế RLS (Supabase)

Để đảm bảo RLS hoạt động hoàn hảo và an toàn:
1. Truy cập trang web **Supabase Dashboard** của dự án.
2. Kiểm tra trong phần **Table Editor** của các bảng `rooms` và `invoices` xem cột **RLS enabled** đã được bật sáng (màu xanh lá cây) chưa.
3. Trong trường hợp bạn muốn chỉnh sửa, tất cả cấu hình RLS đã được viết sẵn bằng SQL thuần rất chi tiết trong tài liệu của dự án.

---

## 🤝 Đóng Góp Phát Triển

Dự án sử dụng chuẩn Git **Conventional Commits** để quản lý lịch sử mã nguồn:
*   `feat(...)`: Thêm tính năng mới (Ví dụ: `feat(auth)`, `feat(payment)`)
*   `fix(...)`: Sửa lỗi hệ thống
*   `docs(...)`: Cập nhật tài liệu
*   `refactor(...)`: Tối ưu hóa cấu trúc code
