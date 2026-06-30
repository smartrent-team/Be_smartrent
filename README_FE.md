# Hướng Dẫn Phát Triển Dành Cho Frontend (Frontend Guide)

Tài liệu này cung cấp cái nhìn tổng quan về cấu trúc, quy chuẩn và các nhiệm vụ mà đội ngũ Frontend (FE) cần thực hiện trong dự án **Room Management System (RMS)**.

## 1. Công Nghệ Sử Dụng (Tech Stack)

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS v4
- **UI Components:** Shadcn UI (Radix UI)
- **Icons:** Lucide React
- **Form & Validation:** Zod
- **State Management:** Zustand
- **Backend Service:** Supabase (Auth, Database)
- **Toast Notifications:** Sonner

## 2. Cấu Trúc Thư Mục (Directory Structure)

Dự án tuân theo chuẩn Next.js App Router:

```text
src/
├── app/
│   ├── (admin)/            # Route Group cho trang quản trị (Dashboard)
│   │   ├── branches/       # Quản lý khu trọ
│   │   ├── dashboard/      # Thống kê tổng quan
│   │   ├── invoices/       # Quản lý hóa đơn & thanh toán
│   │   ├── managers/       # Quản lý nhân viên/quản lý
│   │   ├── rooms/          # Quản lý phòng
│   │   ├── tenants/        # Quản lý người thuê
│   │   └── tickets/        # Yêu cầu hỗ trợ
│   ├── api/                # API Routes (nếu có)
│   ├── globals.css         # Global CSS
│   ├── layout.tsx          # Root Layout
│   └── page.tsx            # Landing page (hoặc trang login tùy cấu hình)
├── components/
│   ├── ui/                 # Các component cơ bản từ Shadcn UI (Button, Input, Table...)
│   └── shared/             # Các component dùng chung (Header, Sidebar, UserNav...)
└── lib/                    # Chứa các hàm tiện ích (utils) và cấu hình Supabase
```

*Lưu ý: Các components chỉ dùng cho một trang cụ thể (ví dụ: bảng danh sách phòng, form thêm phòng) nên được đặt trong thư mục `_components` bên trong thư mục route đó (ví dụ: `src/app/(admin)/rooms/_components/`).*

## 3. Quy Chuẩn Code (Coding Standards)

1. **Server vs Client Components:**
   - Mặc định, Next.js App Router sử dụng **Server Components**. Giữ logic fetch dữ liệu ở Server Components càng nhiều càng tốt để tối ưu SEO và hiệu năng.
   - Chỉ sử dụng **Client Components** (thêm `'use client'` ở đầu file) khi component cần có tính tương tác: dùng React hooks (`useState`, `useEffect`), event listeners (`onClick`, `onChange`), hoặc sử dụng các UI components cần state của browser (như Dialog, Select, Accordion...).

2. **Gọi API & Fetch Data:**
   - Ưu tiên sử dụng **Server Actions** (các file `actions.ts`) để tương tác với cơ sở dữ liệu (Supabase) an toàn từ server.
   - FE sẽ gọi các hàm trong `actions.ts` trực tiếp từ components hoặc thông qua `useTransition`.

3. **Styling (UI):**
   - Sử dụng utility classes của **Tailwind CSS**.
   - Đối với component UI có sẵn, tận dụng tối đa **Shadcn UI**. Nếu thiếu component, có thể cài thêm theo tài liệu của Shadcn.
   - Để nối class linh hoạt, sử dụng hàm `cn()` (thường được cấu hình sẵn trong `lib/utils.ts` sử dụng `clsx` và `tailwind-merge`).

4. **Quản Lý Form:**
   - Dùng **React Hook Form** (tích hợp trong Shadcn UI component `<Form />`) kết hợp với **Zod** để xác thực (validate) dữ liệu trước khi gửi lên server.

## 4. Nhiệm Vụ Của Frontend (FE Tasks)

FE Developer khi tham gia vào dự án cần thực hiện các công việc sau:

### ✅ 1. Xây Dựng UI & Tích Hợp Dữ Liệu Các Chức Năng Quản Trị `(admin)`
Các thư mục chức năng đã được tạo khung sẵn. FE cần hoàn thiện UI (bảng hiển thị, form thêm/sửa/xóa) và kết nối với Server Actions:
- **Dashboard:** Vẽ biểu đồ doanh thu, thống kê phòng trống (sử dụng Recharts đã được cài sẵn).
- **Rooms:** Bảng danh sách phòng, chi tiết phòng, form chỉnh sửa nội thất (fixtures).
- **Tenants:** Quản lý thông tin người thuê, xem hợp đồng.
- **Invoices:** Quản lý hóa đơn tiền điện, nước, dịch vụ. Tích hợp thanh toán và trạng thái (Đã thu, Chưa thu).
- **Tickets:** Quản lý và cập nhật trạng thái các yêu cầu sửa chữa.

### ✅ 2. Xử Lý Trạng Thái UI (Loading, Error, Success)
- Hiển thị **Skeleton** hoặc Spinners (Loading UI) khi dữ liệu đang được fetch (tận dụng `loading.tsx` của Next.js hoặc state isLoading).
- Xử lý các trường hợp dữ liệu rỗng (Empty States).
- Xử lý lỗi (Error Boundaries) bằng các file `error.tsx`.
- Hiển thị thông báo (Toasts) bằng thư viện **Sonner** khi thao tác (thêm/sửa/xóa) thành công hoặc thất bại.

### ✅ 3. Đảm Bảo Giao Diện Responsive
- Giao diện Admin Dashboard cần hoạt động tốt trên cả màn hình Desktop, Tablet và Mobile. Thiết kế Layout có sidebar có thể thu gọn (collapsible sidebar).

### ✅ 4. Tương Tác Thanh Toán (PayOS)
- Nếu có yêu cầu hiển thị QR Code thanh toán, đảm bảo UI hiển thị rõ ràng, dễ quét và có polling / WebSocket (Supabase Realtime) để tự động cập nhật trạng thái khi khách hàng thanh toán xong.

## 5. Tài Nguyên Hữu Ích

- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [Shadcn UI Documentation](https://ui.shadcn.com/docs)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
