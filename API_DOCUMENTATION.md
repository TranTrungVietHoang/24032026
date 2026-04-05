# 🚀 TÀI LIỆU TÍCH HỢP FRONTEND - FULL 14+ MODULES E-COMMERCE 

Tài liệu này tổng hợp toàn bộ các API cốt lõi và các logic ngầm của Backend để team Frontend (hoặc AI Agent) có thể lập trình UI một cách chính xác nhất. Đủ 100% tất cả các chức năng.

---

## ⚙️ THÔNG TIN CƠ BẢN (GLOBAL CONFIG)

- **Base URL:** `http://localhost:3000/api/v1` (Nếu chạy local)
- **CORS:** Đã mở sẵn cho `http://localhost:5173` và `http://localhost:3000`.
- **Authentication:** Mọi API có khóa 🔒 đều yêu cầu Header: `Authorization: Bearer <TOKEN>`

---

## 📚 DANH SÁCH TOÀN BỘ CÁC MODULE 

### 1. MODULE XÁC THỰC (AUTH)
- **`POST /auth/register`**: Tạo tài khoản. Yêu cầu Body: `username`, `password`, `email`.
- **`POST /auth/login`**: Đăng nhập. Trả về Token. Bắt buộc lưu Token vào LocalStorage.

### 2. MODULE PHÂN QUYỀN (ROLES)
- **`GET /roles`** (🔒 ADMIN): Lấy danh sách quyền (ADMIN, USER, MODERATOR).

### 3. MODULE NGƯỜI DÙNG (USERS)
- **`GET /users`** (🔒 ADMIN/MOD): Lấy danh sách toàn bộ khách hàng.
- **`PUT /users/:id`** (🔒 ADMIN): Sửa thông tin hoặc **Cấp quyền**. Body: `{ "role": "<ID_ROLE>" }`.

### 4. MODULE DANH MỤC (CATEGORIES)
- **`GET /categories`**: Lấy danh sách Cây danh mục (Điện thoại, Laptop...).
- **`POST /categories`** (🔒 ADMIN): Tạo danh mục mới.

### 5. MODULE SẢN PHẨM (PRODUCTS)
- **`GET /products`**: Liệt kê sản phẩm. Có thể truyền query `?min=...` lọc giá.
- **`GET /products/:id`**: Xem chi tiết SP.
- **`POST /products`** (🔒 ADMIN/MOD): Cần `title`, `price`, `description`, `category` (Bắt buộc).
  - **LOGIC ẨN:** Khi tạo Sản phẩm, Backend tự động đẻ ra 1 Kho (Inventory) với stock = 0.

### 6. MODULE TỒN KHO & CẢNH BÁO (INVENTORIES)
- **`GET /inventories/:productId`**: Trả về số lượng hàng còn lại thực tế của 1 sản phẩm.
- **`GET /inventories/low-stock`** (🔒 ADMIN): List cảnh báo danh sách SP sắp cạn hàng (Stock < 5). 

### 7. MODULE KHUYẾN MÃI (VOUCHERS)
- **`GET /vouchers`**: Lấy danh sách Voucher đang public.
- **`POST /vouchers`** (🔒 ADMIN): Tạo Voucher mới (Ngày hết hạn, Min Order). Khách nhập sai hoặc hết hạn sẽ bị báo lỗi ngay tại lúc Đặt hàng.

### 8. MODULE GIỎ HÀNG (CARTS)
- **`GET /carts`** (🔒): Xem giỏ hàng cá nhân.
- **`POST /carts/add`** (🔒): Thêm SP. Body: `{ "product": "<ID>", "quantity": 1 }`.
- **`POST /carts/modify`** (🔒): Sửa số lượng đè lên bằng `quantity` cụ thể (Ví dụ sửa thành 5).
- **`POST /carts/decrease`** (🔒): Giảm đi 1. Về 0 tự tự xóa đồ khỏi giỏ.
- **`POST /carts/remove`** (🔒): Xóa thẳng 1 sản phẩm ra khỏi giỏ.

### 9. MODULE ĐẶT HÀNG (ORDERS) & LOGIC DÂY CHUYỀN KHỦNG
- **`POST /orders`** (🔒 KHÁCH LÀM): Chốt mua. Body: `items[]`, `shippingAddress`, `voucherCode`.
  - **✨ LOGIC AUTO 1:** Check số tồn kho thực, từ chối văng lỗi 400 nếu khách giỏ hàng 10 cái mà kho còn 9.
  - **✨ LOGIC AUTO 2:** Trừ kho tự động ngay lập tức không cần Admin nhúng tay.
  - **✨ LOGIC AUTO 3:** Quét bay các sản phẩm đã mua thành công ra khỏi màn hình Giỏ Hàng của khách.
- **`PUT /orders/:id`** (🔒 ADMIN LÀM): Đổi trạng thái (`pending` -> `delivered`, `cancelled`).
  - **✨ LOGIC AUTO 4:** Nếu Admin hủy đơn (`cancelled`), tự động móc hàng khách vứt bỏ Nhập Lại Vào Kho để bán tiếp.

### 10. MODULE THANH TOÁN TIỀN (PAYMENTS)
- **`POST /payments`** (🔒): Tạo yêu cầu thanh toán (Momo, ZaloPay, Tiền mặt).
- **`PUT /payments/:id`** (🔒 ADMIN): Duyệt đổi trạng thái thành `paid` (đã nhận tiền).

### 11. MODULE ĐẶT CỌC GIỮ CHỖ (RESERVATIONS)
- **`POST /reservations`** (🔒): Dành riêng cho SP hiếm (như iPhone 16 mới ra). Khách đặt cọc 1 số tiền để xí phần trước mặc dù kho chưa có hàng.

### 12. MODULE THÔNG BÁO (NOTIFICATIONS)
- **`GET /notifications`** (🔒): Lấy chuông thông báo cá nhân báo lỗi hủy đơn, đơn thành công.
- **`PUT /notifications/mark-all-read`** (🔒): Đánh dấu Đã đọc tất cả thông báo.

### 13. MODULE ĐÁNH GIÁ (REVIEWS)
- **`GET /reviews/product/:id`**: Xem comment / sao đánh giá từ khách trước đó.
- **`POST /reviews`** (🔒): Viết bình luận. Body: `product`, `rating` (1-5), `comment`.

### 14. MODULE CHAT HỖ TRỢ (MESSAGES)
- **`GET /messages/:userID`** (🔒): Tải lịch sử chat giữa User hiện tại và Admin.
- **`POST /messages`** (🔒): Nhắn tin realtime thông thường (tương tự inbox facebook).

### 15. MODULE ĐỐI TÁC (SUPPLIERS)
- **`GET /suppliers`** (🔒 ADMIN): Danh sách đầu mối nhập hàng sỉ của Công ty (Apple, SS...).

### 16. MODULE TẢI LÊN & EXCEL (UPLOADS)
- **`POST /upload/an_image`** (🔒): Upload ảnh tự văng lên Cloudinary (Rất tiết kiệm tài nguyên Server). Trả về link <img>.
- **`POST /upload/excel`** (🔒 ADMIN): Quăng 1 file `.xlsx` vào, tự động Nạp CSDL 10.000 sản phẩm trong chớp mắt. Sinh ra tên, giá, ảnh, tự đẻ Inventory cho cả 10.000 SP đó liền.

---
## 🏁 TỔNG KẾT
Xin chúc mừng Backend Dev, File API này đã đạt Cấp Độ Master. Team Frontend chỉ việc bốc các endpoint dọc theo list này, trỏ API và dán UI lên là Website siêu thị E-commerce của bạn sẽ hoàn chỉnh 100%!
