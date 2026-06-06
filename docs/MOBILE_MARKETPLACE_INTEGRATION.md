# Hướng dẫn tích hợp Marketplace (Chợ nội bộ) cho Mobile App (Flutter)

Tài liệu này cung cấp hướng dẫn chi tiết để Developer Mobile (Flutter) tích hợp tính năng Chợ pass đồ nội bộ Realtime vào ứng dụng.

## 1. Data Model (Dart)

API được thiết kế trả về dữ liệu phẳng (flat object), giúp bạn dễ dàng dùng `json_serializable` hoặc `freezed` để parse.

```dart
class MarketplacePost {
  final String id;
  final int branchId;
  final String title;
  final String description;
  final double price;
  final List<String> images;
  final String status; // 'active', 'pending_approval', 'rejected', 'sold'
  final DateTime createdAt;
  
  // Thông tin liên hệ trực tiếp của người bán (Tự động join từ DB)
  final String ownerName;
  final String ownerPhone;
  final String ownerRoom;
  final String ownerInitial;

  MarketplacePost({
    required this.id,
    required this.branchId,
    required this.title,
    required this.description,
    required this.price,
    required this.images,
    required this.status,
    required this.createdAt,
    required this.ownerName,
    required this.ownerPhone,
    required this.ownerRoom,
    required this.ownerInitial,
  });

  factory MarketplacePost.fromJson(Map<String, dynamic> json) {
    // Tự sinh bằng json_serializable hoặc viết tay
  }
}
```

## 2. API Endpoints (REST)

| Endpoint | Method | Role | Mô tả |
|----------|--------|------|-------|
| `/api/marketplace` | `GET` | Tenant, Manager | Lấy danh sách bài đăng. Trả về mảng `docs`. |
| `/api/marketplace` | `POST` | Tenant, Manager | Tạo bài đăng mới. Yêu cầu `title`, `description`, `price`, `images`. |
| `/api/marketplace/{id}/status` | `PUT` | Manager | Cập nhật trạng thái (`active`, `sold`, `rejected`). |

**Lưu ý:** Xem chi tiết Request/Response tại giao diện Swagger (`/api/docs`).

## 3. Tích hợp Realtime (WebSockets) với Supabase Flutter

Đây là điểm ăn tiền của tính năng. Bạn không cần pull-to-refresh liên tục. Hãy lắng nghe sự kiện thay đổi từ bảng `marketplace_posts` thông qua BLoC/Stream.

### Luồng 1: Tải danh sách ban đầu
Khi vào màn hình Chợ, hãy gọi `GET /api/marketplace` để lấy danh sách bài đăng hiện tại và hiển thị lên UI. API đã tự động lọc các bài đăng `active` của chi nhánh hiện tại.

### Luồng 2: Lắng nghe sự kiện Realtime (Supabase Channel)

```dart
import 'package:supabase_flutter/supabase_flutter.dart';

// Khởi tạo stream listener trong BLoC / ViewModel
final supabase = Supabase.instance.client;

final channel = supabase.channel('public:marketplace_posts').onPostgresChanges(
    event: PostgresChangeEvent.all, // Nghe toàn bộ sự kiện: INSERT, UPDATE, DELETE
    schema: 'public',
    table: 'marketplace_posts',
    callback: (PostgresChangePayload payload) {
      final eventType = payload.eventType;
      final newData = payload.newRecord;
      final oldData = payload.oldRecord;

      if (eventType == PostgresChangeEvent.insert) {
        // Có người mới đăng bài
        // Lưu ý: Payload từ Realtime là dữ liệu thô (raw), KHÔNG chứa ownerName, ownerRoom.
        // Bạn có thể fetch lại thông tin chi tiết bằng GET /api/marketplace
        // HOẶC gọi một API fetch detail theo ID.
        _fetchAndAddNewPost(newData['id']);
      } 
      else if (eventType == PostgresChangeEvent.update) {
        // Bài đăng đổi trạng thái (ví dụ: đã bán 'sold')
        final updatedStatus = newData['status'];
        if (updatedStatus == 'sold') {
          // Xoá khỏi danh sách hiển thị HOẶC hiện label "Đã bán"
          _markPostAsSold(newData['id']);
        }
      }
      else if (eventType == PostgresChangeEvent.delete) {
        // Xoá bài
        _removePost(oldData['id']);
      }
    }
  ).subscribe();
```

## 4. Trải nghiệm người dùng (Luồng chốt Sale nhanh)

Khi người mua muốn mua một món đồ vừa thấy trên tường:
1. Người dùng bấm vào bài đăng.
2. Giao diện hiện lên chi tiết món đồ, bao gồm **Số điện thoại** (`ownerPhone`) và **Số phòng** (`ownerRoom`).
3. Dùng package `url_launcher` để tích hợp 2 nút thao tác nhanh:
   ```dart
   import 'package:url_launcher/url_launcher.dart';

   // Nút gọi điện
   ElevatedButton(
     onPressed: () async {
       final Uri url = Uri.parse('tel:${post.ownerPhone}');
       if (!await launchUrl(url)) throw 'Could not launch $url';
     },
     child: Text('Gọi điện'),
   )

   // Nút nhắn tin SMS
   ElevatedButton(
     onPressed: () async {
       final Uri url = Uri.parse('sms:${post.ownerPhone}');
       if (!await launchUrl(url)) throw 'Could not launch $url';
     },
     child: Text('Gửi SMS'),
   )
   ```
4. Người mua chạy sang phòng (`ownerRoom`) để xem trực tiếp hoặc gọi chốt giá.
5. Sau khi bán xong, người bán hoặc Manager vào App bấm chuyển trạng thái sang "Đã bán". Lúc này Realtime Trigger gửi sự kiện cập nhật để tắt hiển thị món hàng đó trên tất cả các máy khác.
