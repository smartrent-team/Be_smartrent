# 📘 Hướng Dẫn Cấu Hình Môi Trường & Tài Liệu API (RMS Backend)

Tài liệu này cung cấp toàn bộ hướng dẫn cấu hình môi trường, cách kết nối ứng dụng Frontend (Flutter / React) tới Backend Payload CMS, và danh mục tài liệu API chi tiết để phát triển hệ thống Quản lý chuỗi nhà trọ thông minh (RMS).

---

## 1. Hướng Dẫn Cấu Hình Môi Trường (.env)

Hệ thống Backend sử dụng các biến môi trường sau trong file `.env` ở thư mục gốc:

```env
# 🔌 Kết nối Database (Supabase Pooler URL - IPv4)
DATABASE_URL=postgresql://postgres.xifjbxdrruqtoobzlfqz:Ttai140999!!@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# 🔑 Khóa bí mật mã hóa JWT của Payload CMS
PAYLOAD_SECRET=8d73b28d5b619b4d2384b245

# 💳 Cấu hình cổng thanh toán PayOS
CLIENT_ID=2689d09d-804c-4a07-bafd-7a45a0d41190
API_KEY=68cb0219-5990-4e47-b436-3a68a83248a2
CHECKSUM_KEY=key0c8ab0a750fb37054a48a41361d1e727fc8d87db7693ba6e2e4c8a0473d69070

# 🌐 URL của ứng dụng (Dùng cho Webhook & link chuyển hướng thanh toán)
APP_URL=http://localhost:3000
```

---

## 2. Cách Kết Nối Thiết Bị Di Động (Flutter) Với Local Backend

Khi chạy Backend ở local (`pnpm dev`), server mặc định chạy ở địa chỉ `http://localhost:3000`. Thiết bị di động (máy thật hoặc giả lập) **không thể** kết nối trực tiếp qua `localhost`.

### Cách 1: Sử dụng chung mạng Wi-Fi (Khuyên dùng)
1. Xác định địa chỉ IP cục bộ của máy tính chạy backend (ví dụ: `192.168.2.119` như hiển thị ở terminal khi chạy `pnpm dev`).
2. Kết nối điện thoại di động và máy tính của bạn vào **cùng một mạng Wi-Fi**.
3. Cấu hình URL Base trong Flutter:
   ```dart
   String baseUrl = "http://192.168.2.119:3000";
   ```

### Cách 2: Sử dụng công cụ Tunneling (Ngrok / Localtunnel)
Nếu bạn muốn test qua mạng 4G hoặc thiết bị ở xa:
1. Mở terminal mới và chạy ngrok: `ngrok http 3000`
2. Sử dụng URL HTTPS do ngrok cung cấp làm Base URL cho ứng dụng Flutter:
   ```dart
   String baseUrl = "https://xxxx-xxx-xxx.ngrok-free.app";
   ```

---

## 3. Hướng Dẫn Cơ Chế Xác Thực (Authentication API)

Payload CMS tích hợp sẵn hệ thống xác thực bảo mật dựa trên **JWT (JSON Web Token)**.

### 🔑 Đăng Nhập (Login)
*   **Endpoint:** `/api/users/login`
*   **Method:** `POST`
*   **Headers:** `Content-Type: application/json`
*   **Body:**
    ```json
    {
      "email": "manager1@rms.com",
      "password": "yourpassword"
    }
    ```
*   **Phản hồi thành công (200 OK):**
    Hệ thống sẽ trả về cookie xác thực và một JSON chứa thông tin người dùng kèm trường **`token`**:
    ```json
    {
      "message": "Auth Passed",
      "user": {
        "id": 1,
        "email": "manager1@rms.com",
        "fullName": "Nguyễn Văn A",
        "role": "manager",
        "branch": 1
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```

### 🛡️ Cách Gửi Token Cho Các Request Tiếp Theo
Để gọi các API được bảo mật (bao gồm tất cả các bảng được cấu hình RLS), ứng dụng Flutter / Frontend phải gửi kèm Token trong **Header** của mỗi request:
*   **Header Name:** `Authorization`
*   **Value Format:** `JWT <TOKEN>` (Lưu ý: Payload sử dụng từ khóa **`JWT`** thay vì `Bearer`).
    ```http
    Authorization: JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    ```

### 🚪 Đăng Xuất (Logout)
*   **Endpoint:** `/api/users/logout`
*   **Method:** `POST`
*   **Headers:** `Authorization: JWT <TOKEN>`

---

## 4. Danh Mục REST API Các Collection (Tự động sinh bởi Payload)

Tất cả các API dưới đây đều yêu cầu truyền kèm Header `Authorization: JWT <TOKEN>`. Bộ lọc RLS ở Database sẽ tự động ẩn đi các dòng dữ liệu không thuộc quyền hạn của người dùng.

### 🏢 1. Quản lý Cơ sở (Branches)
*   **Lấy danh sách cơ sở:** `GET /api/branches`
*   **Lấy chi tiết 1 cơ sở:** `GET /api/branches/{id}`
*   **Tạo mới cơ sở:** `POST /api/branches` (Chỉ Super Admin)
*   **Cập nhật cơ sở:** `PATCH /api/branches/{id}`
*   **Xóa cơ sở:** `DELETE /api/branches/{id}`

### 🚪 2. Quản lý Phòng (Rooms)
*   **Lấy danh sách phòng:** `GET /api/rooms` *(Manager chỉ thấy phòng thuộc cơ sở mình quản lý)*
*   **Lấy chi tiết phòng:** `GET /api/rooms/{id}`
*   **Thêm mới phòng:** `POST /api/rooms`
*   **Cập nhật phòng:** `PATCH /api/rooms/{id}`

### 👤 3. Quản lý Cư Dân (Tenants)
*   **Lấy danh sách cư dân:** `GET /api/tenants`
*   **Lấy chi tiết cư dân:** `GET /api/tenants/{id}`
*   **Đăng ký cư dân:** `POST /api/tenants`
*   **Cập nhật thông tin cư dân:** `PATCH /api/tenants/{id}`

### 📝 4. Hợp Đồng Thuê Phòng (Contracts)
*   **Lấy danh sách hợp đồng:** `GET /api/contracts`
*   **Tạo mới hợp đồng:** `POST /api/contracts` *(Tự động đổi trạng thái phòng sang "đang thuê")*
*   **Cập nhật hợp đồng:** `PATCH /api/contracts/{id}`

### 💵 5. Hóa Đơn & Thanh Toán (Invoices)
*   **Lấy danh sách hóa đơn:** `GET /api/invoices` *(Tenant chỉ thấy hóa đơn của chính mình)*
*   **Tạo hóa đơn:** `POST /api/invoices`
    *   *Payload hook sẽ tự động gọi API PayOS để sinh link thanh toán `checkoutUrl` và mã QR `qrPayload` ngay sau khi tạo hóa đơn thành công.*
*   **Cập nhật hóa đơn:** `PATCH /api/invoices/{id}`

### 🛠️ 6. Báo Hỏng & Sửa Chữa (MaintenanceTickets)
*   **Lấy danh sách báo hỏng:** `GET /api/maintenance-tickets`
*   **Gửi báo hỏng mới:** `POST /api/maintenance-tickets`
*   **Cập nhật trạng thái sửa chữa:** `PATCH /api/maintenance-tickets/{id}`

---

## 5. Các Custom API Đặc Biệt

### 🤖 A. Xử lý Định Danh CCCD bằng AI/OCR (KYC API)
*   **Endpoint:** `/api/process-kyc`
*   **Method:** `POST`
*   **Headers:** `Content-Type: multipart/form-data`, `Authorization: JWT <TOKEN>`
*   **Body (Form Data):**
    *   `idCardImage`: File ảnh chụp CCCD tải lên.
*   **Mô tả:** API này sẽ xử lý ảnh, nhận diện thông tin cá nhân trên CCCD bằng AI OCR và trả về thông tin dạng văn bản có cấu trúc để điền tự động vào hồ sơ cư dân.

### 🔔 B. Webhook Nhận Thông Báo Từ PayOS
*   **Endpoint:** `/api/payos-webhook`
*   **Method:** `POST`
*   **Headers:** `Content-Type: application/json`
*   **Mô tả:** Được gọi tự động từ máy chủ PayOS khi cư dân chuyển khoản thành công. API sẽ tự động xác thực chữ ký bảo mật và cập nhật trạng thái hóa đơn tương ứng sang `paid` (Đã thu).

---

## 💡 Ví Dụ Gọi API Bằng `curl` Để Kiểm Tra (Test)

### 1. Gọi API đăng nhập lấy token:
```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "manager1@rms.com", "password": "yourpassword"}'
```

### 2. Gọi API lấy danh sách phòng (Sử dụng Token trả về ở trên):
```bash
curl -X GET http://localhost:3000/api/rooms \
  -H "Authorization: JWT <DÁN_TOKEN_VÀO_ĐÂY>"
```
