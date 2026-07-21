# Hướng dẫn tích hợp API Thống kê cho App Flutter (Manager & Super Admin)

Tài liệu này mô tả cách gọi API thống kê và các API lấy danh sách chi tiết (hiển thị khi nhấn vào các mục thống kê) dành cho giao diện Dashboard (Admin/Manager) trên App Flutter.

---

## 1. API Lấy Tổng Quan Thống Kê

Hiển thị các chỉ số trên trang chủ Dashboard (Doanh thu, dư nợ, số lượng phòng...).

- **Endpoint:** `GET /api/statistics`
- **Header bắt buộc:**
  ```http
  Authorization: Bearer <token_cua_manager_hoac_super_admin>
  ```
- **Quyền hạn (Role):** 
  - `manager`: API sẽ tự động chỉ trả về thống kê của chi nhánh (branch) mà manager đó đang quản lý.
  - `super_admin`: API trả về số liệu tổng của tất cả các chi nhánh.
  - `tenant`: Sẽ bị từ chối (403 Forbidden).

- **Response thành công (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "totalRevenue": 15000000,      // Tổng doanh thu (VNĐ - đã thanh toán trong tháng)
      "totalDebt": 5000000,          // Tổng dư nợ (VNĐ - chưa thanh toán/thanh toán 1 phần)
      "totalRooms": 20,              // Tổng số phòng trong hệ thống (hoặc chi nhánh)
      "occupiedRooms": 15,           // Số phòng đang có người ở
      "occupancyRate": 75,           // Tỷ lệ lấp đầy (%)
      "paidInvoicesCount": 10,       // Số lượng hóa đơn đã thu
      "unpaidInvoicesCount": 3       // Số lượng hóa đơn chưa thu
    }
  }
  ```

---

## 2. Các API Lấy Chi Tiết (Khi User nhấn vào từng thẻ thống kê)

Khi Manager/Super Admin nhấn vào một con số thống kê trên UI (ví dụ: nhấn vào "Số hóa đơn chưa thu"), App Flutter sẽ gọi API danh sách có sẵn, kết hợp với các `query parameters` để tự động lọc dữ liệu. 

*(Tất cả API dưới đây đều yêu cầu truyền Header `Authorization: Bearer <token>`)*

### 2.1. Chi tiết "Tổng doanh thu" / "Hóa đơn đã thu"
Khi nhấn vào phần doanh thu hoặc hóa đơn đã thu, cần hiển thị danh sách các hóa đơn đã thanh toán.
- **Endpoint:** `GET /api/invoices/list?status=paid`
- **Paging:** Có thể truyền thêm `&page=1&limit=20`

### 2.2. Chi tiết "Tổng dư nợ" / "Hóa đơn chưa thu"
Khi nhấn vào phần dư nợ, cần hiển thị danh sách các hóa đơn cư dân chưa đóng tiền.
- **Endpoint:** `GET /api/invoices/list?status=unpaid` (Hoặc có thể gọi 2 lần/gộp chung để lấy cả `partial`)

### 2.3. Chi tiết "Số phòng đang có người ở" / "Tỷ lệ lấp đầy"
Khi nhấn vào tỷ lệ lấp đầy, hiển thị danh sách phòng đang có cư dân thuê (có kèm thông tin người thuê).
- **Endpoint:** `GET /api/rooms/list?status=occupied`

### 2.4. Chi tiết "Tổng số phòng"
Khi nhấn vào tổng số phòng, hiển thị toàn bộ phòng (cả trống lẫn có người ở).
- **Endpoint:** `GET /api/rooms/list`

> **💡 LƯU Ý BẢO MẬT (Dành cho Dev Backend & Flutter):**
> Các API `/api/invoices/list` và `/api/rooms/list` đều đã được Backend gắn logic **Tự động filter theo chi nhánh (Branch)**. Nghĩa là bên App Flutter **KHÔNG CẦN** phải truyền `branch_id` lên. API sẽ tự động đọc token, biết ai là Manager của tòa nào và chỉ trả về danh sách thuộc tòa nhà đó. Đội Flutter cứ gọi đúng endpoint ở trên là được!
