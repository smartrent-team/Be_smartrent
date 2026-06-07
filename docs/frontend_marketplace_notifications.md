# Hướng dẫn Tích hợp Thông báo Marketplace cho Frontend (Flutter)

Tài liệu này liệt kê các bước cần thiết ở phía Frontend (Mobile App bằng Flutter) để tích hợp luồng thông báo Push Notification khi:
1. **Tenant** đăng bài lên Market (báo cho Manager).
2. **Manager** duyệt/từ chối bài đăng (báo lại cho Tenant).

Backend đã cấu hình gửi thông báo Push Notification (FCM) với `type` tương ứng cho mỗi hành động, đồng thời lưu vào bảng `notifications` trên Supabase. Vì vậy, Frontend về cơ bản sẽ tự động hiển thị thông báo. Các bước dưới đây chủ yếu để **tối ưu trải nghiệm khi người dùng nhấn vào thông báo**.

---

## 1. Các `type` thông báo từ Backend

Hệ thống Backend hiện tại đang gửi đi 2 loại thông báo (trong field `data.type` của FCM):

*   **`marketplace_post`**: Gửi cho Manager khi có một Tenant vừa tạo bài đăng mới và đang chờ duyệt.
    *   **Data gửi kèm:** `{ "postId": "<id_cua_bai_dang>" }`
*   **`marketplace_status`**: Gửi cho Tenant khi Manager vừa thao tác duyệt (`active`), từ chối (`rejected`) hoặc đánh dấu đã bán (`sold`).
    *   **Data gửi kèm:** `{ "postId": "<id_cua_bai_dang>", "status": "<trang_thai_moi>" }`

## 2. Công việc cần làm ở Frontend

### Bước 2.1: Hiển thị trong màn hình "Chuông thông báo" (Nếu chưa có)
*   **Hành động:** Khi query danh sách thông báo từ bảng `notifications` trên Supabase, cần hỗ trợ hiển thị Icon và Nội dung tương ứng cho 2 type `marketplace_post` và `marketplace_status`.
*   **Ví dụ giao diện:**
    *   Manager: *Cần duyệt: Có bài đăng mới "Tìm người ở ghép" từ Nguyễn Văn A đang chờ duyệt.*
    *   Tenant: *Cập nhật bài đăng: Bài đăng "Tìm người ở ghép" của bạn đã được duyệt.*

### Bước 2.2: Bắt sự kiện On-Tap (Khi nhấn vào Push Notification)
Trong thư viện `firebase_messaging` ở Flutter, bạn cần thêm switch-case vào hàm lắng nghe sự kiện nhấn thông báo.

Thường nằm ở 2 hàm:
1. `FirebaseMessaging.onMessageOpenedApp.listen(...)` (Khi app đang ở background).
2. `FirebaseMessaging.instance.getInitialMessage()` (Khi app bị tắt hoàn toàn và được mở lên từ thông báo).

**Mã giả (Pseudo-code) cho Flutter:**

```dart
void handleNotificationTap(RemoteMessage message) {
  final data = message.data;
  final type = data['type'];
  final postId = data['postId'];

  switch (type) {
    case 'marketplace_post':
      // Dành cho Manager: Chuyển hướng tới màn hình Chi tiết bài đăng để duyệt
      if (postId != null) {
         navigatorKey.currentState?.pushNamed(
           '/manager/marketplace/detail', 
           arguments: { 'postId': postId }
         );
      }
      break;

    case 'marketplace_status':
      // Dành cho Tenant: Chuyển hướng tới màn hình Quản lý bài đăng của tôi
      // hoặc Chi tiết bài đăng vừa được cập nhật
      if (postId != null) {
         navigatorKey.currentState?.pushNamed(
           '/tenant/marketplace/detail', 
           arguments: { 'postId': postId }
         );
      }
      break;
      
    // ... các type khác như ticket, invoice
  }
}
```

### Bước 2.3: (Tùy chọn) Reload lại dữ liệu Market khi đang mở App
Nếu user (Manager/Tenant) **đang mở sẵn màn hình Market** (Foreground) mà có Push Notification bay tới:
*   Trong sự kiện `FirebaseMessaging.onMessage.listen(...)`, bạn có thể check `type` là `marketplace_*` để gọi hàm fetch lại danh sách (Reload List) mà không cần user phải kéo để pull-to-refresh.

---

## 3. Tóm tắt

1. **Hiển thị Push Notification:** Tự động có sẵn (không cần code thêm).
2. **Lịch sử thông báo (In-app):** Bổ sung UI icon/màu sắc cho 2 type mới `marketplace_post`, `marketplace_status`.
3. **Điều hướng (Navigation):** Bắt sự kiện chạm vào thông báo để chuyển hướng dựa theo `type` và `postId` trong biến `data`.
