# Cập Nhật Luồng Quản Lý Khách Thuê (Tenant Management Workflow)

Tài liệu này mô tả chi tiết các thay đổi trong quy trình thêm mới, chỉnh sửa và hiển thị danh sách Khách thuê, nhằm giải quyết các lỗi liên quan đến logic trùng lặp tài khoản và lỗi hiển thị thông tin.

## 1. Vấn đề trước đây

- **Hiển thị trùng lặp tài khoản:** Một tài khoản người dùng khi bị xoá (deactivated) và sau đó được tạo lại với cùng số điện thoại thì trên giao diện danh sách Khách thuê (`tenants/page.tsx`) sẽ hiển thị 2-3 dòng (bao gồm cả các hồ sơ thuê phòng cũ của tài khoản đó).
- **Thiếu xác nhận khi tạo lại:** Khi nhân viên tạo khách thuê mới bằng số điện thoại cũ đã từng tồn tại trên hệ thống, hệ thống ghi đè hoặc tạo mới mà không có bước xác nhận với nhân viên về việc có muốn cập nhật lại hồ sơ cư dân cũ hay không.
- **Lỗi cập nhật hợp đồng và phòng:** Hàm `editTenantAction` khi thực hiện đổi phòng không xử lý chính xác giá trị phòng cũ và trạng thái hợp đồng, dẫn tới lỗi trạng thái phòng (`available`/`occupied`) không đồng bộ.

## 2. Các thay đổi đã thực hiện

### 2.1. Server Actions (`src/app/(admin)/tenants/actions.ts`)

- **Bổ sung `checkTenantPhoneAction`:** Action này cho phép kiểm tra nhanh từ client xem số điện thoại nhập vào đã tồn tại trên hệ thống (kể cả trạng thái active hay deleted/xoá mềm) hay chưa, nhằm trả về thông tin profile cũ.
- **Cập nhật `createTenantAction`:**
  - Thêm tham số `updateProfile` (boolean) để quyết định có ghi đè thông tin cũ hay không.
  - Sửa lại logic: nếu số điện thoại đã tồn tại và `updateProfile = true`, hệ thống sẽ gọi `update` vào profile cũ thay vì cố gắng `insert` dẫn đến lỗi (vì vướng RLS/unique email, phone_del_x).
  - Phục hồi (reactivate) profile nếu user đang ở trạng thái `deleted`, loại bỏ suffix `_del_xxx` để số điện thoại và email trở lại bình thường.
- **Cập nhật `editTenantAction`:**
  - Fix logic cập nhật Auth User: thay vì dùng vòng lặp bị hạn chế limit để gọi `adminSupabase.auth.admin.listUsers()`, vòng lặp đã được nâng cấp lên hỗ trợ pagination cho tới khi tìm ra auth ID tương ứng hoặc hết danh sách.
  - Sửa logic đổi phòng: giải phóng (update `status = 'available'`) phòng cũ và cập nhật phòng mới (`status = 'occupied'`). Đồng thời, hợp đồng cũ (`contracts`) cũng được update sang phòng mới kèm theo `monthly_price` (giá cơ sở) mới của phòng.

### 2.2. Giao diện Thêm mới Khách thuê (`CreateTenantDialog.tsx`)

- **Flow mới:**
  1. Khi người dùng nhấn "Thêm khách mới" và điền đầy đủ thông tin, form sẽ kiểm tra `checkTenantPhoneAction`.
  2. Nếu tìm thấy dữ liệu cũ (bao gồm tên và email cũ), một giao diện xác nhận (Confirmation UI) sẽ hiển thị ngay bên trong dialog.
  3. Hệ thống sẽ hỏi nhân viên: "Bạn có muốn cập nhật lại thông tin mới vừa nhập cho khách hàng này hay tiếp tục giữ thông tin cũ?".
  4. Nếu nhân viên chọn "Cập nhật thông tin mới", biến `updateProfile = true` được gửi xuống server. Nếu chọn "Giữ thông tin cũ", biến `updateProfile = false`.
  5. Nếu số điện thoại là hoàn toàn mới, luồng diễn ra bình thường, bỏ qua màn hình xác nhận.

### 2.3. Danh sách Khách thuê (`tenants/page.tsx`)

- **Lọc hồ sơ đang thuê:** Thêm bộ lọc `.is('move_out_date', null)` vào câu query danh sách `tenants`. Việc này đảm bảo rằng giao diện chỉ hiển thị những hồ sơ thuê phòng *hiện tại* (đang còn hiệu lực). Các hồ sơ thuê trong quá khứ của người dùng đó (đã có `move_out_date`) sẽ không hiển thị ra ở trang danh sách đang ở này nữa, tránh hoàn toàn tình trạng trùng lặp (1 người hiển thị 2-3 dòng).

## 3. Cách Verify (Kiểm tra lại)

1. Vô hiệu hoá một tài khoản khách thuê bất kỳ.
2. Tại trang Khách thuê, nhấn "Thêm khách mới".
3. Nhập số điện thoại của người vừa bị vô hiệu hoá.
4. Màn hình xác nhận (Confirmation) sẽ hiển thị hỏi có muốn cập nhật thông tin hay không.
5. Sau khi tạo xong, trở ra trang danh sách Khách thuê. Bạn sẽ chỉ thấy 1 dòng duy nhất tương ứng với hợp đồng thuê hiện tại, không còn dòng rác của quá khứ.
6. Khi đổi phòng trong tính năng chỉnh sửa (`editTenantAction`), xác nhận lại ở bảng `rooms` rằng phòng cũ đã về trạng thái "available" và phòng mới chuyển sang "occupied". Hợp đồng mới cũng được ghi nhận giá trị tiền thuê tháng (`monthly_price`) của phòng mới.
