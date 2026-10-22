# HƯỚNG DẪN MỞ KHÓA / KÍCH HOẠT PHÂN HỆ CHẤM CÔNG & PHÂN CA TRỰC
### Bệnh viện Đa khoa Khánh Hội — Hệ thống Quản trị Y tế NKDD Report

---

## 1. Giới thiệu Tổng quan

Phân hệ **Chấm Công & Phân Ca Trực** (`/attendance`) đã được lập trình, cấu hình cơ sở dữ liệu và vượt qua 100% các bộ kiểm thử chuyên sâu (7 chế độ bệnh viện, luồng thôi việc giữa tháng, chuột phải context menu, xuất Excel chuẩn bệnh viện, phân quyền và nhật ký sửa đổi).

Hiện tại, phân hệ được đặt ở trạng thái **"Sắp ra mắt" (Coming Soon)** thông qua cơ chế **Feature Flag** trung tâm:
- Tại trang Menu Trung tâm (`/menu`): Tile Chấm công có biểu tượng ổ khóa, click vào hiện thông báo *"Sắp ra mắt"*.
- Khi truy cập trực tiếp bằng đường dẫn (`/attendance` hoặc `/timesheet`): Hiển thị màn hình giới thiệu tính năng trang nhã kèm 2 nút chuyển nhanh về Menu hoặc Báo cáo điều dưỡng.
- Trên thanh điều hướng (Topbar): Hiển thị chuẩn xác tiêu đề **"Chấm Công & Phân Ca Trực"** mà không bị nhầm lẫn với Báo cáo điều dưỡng.

---

## 2. Vị trí Tệp Cấu hình Mở Khóa

Toàn bộ việc bật / tắt phân hệ được quản lý tập trung tại một hằng số duy nhất trong tệp:

📁 **Đường dẫn tệp:**
```text
src/config/modules.config.ts
```

---

## 3. Các Bước Mở Khóa Phân Hệ (1 Thao Tác Duy Nhất)

### Bước 1: Mở tệp `src/config/modules.config.ts`
Tìm dòng khai báo hằng số `ATTENDANCE_MODULE_ENABLED` ở ngay đầu tệp (dòng ~7):

```typescript
// HIỆN TẠI (ĐANG KHÓA - SẮP RA MẮT):
export const ATTENDANCE_MODULE_ENABLED = false
```

### Bước 2: Thay đổi giá trị thành `true`

```typescript
// MỞ KHÓA HOẠT ĐỘNG CHÍNH THỨC:
export const ATTENDANCE_MODULE_ENABLED = true
```

---

## 4. Biên Dịch & Áp Dụng Lên Máy Chủ

Sau khi đổi `false` thành `true`, thực hiện các lệnh sau trên terminal của dự án:

### Cách 1: Nếu đang chạy môi trường Production Standalone
```bash
# 1. Biên dịch lại gói sản phẩm Next.js
npm run build

# 2. Đồng bộ tệp tĩnh vào thư mục standalone (nếu dùng server standalone)
Copy-Item -Recurse -Force .next/static .next/standalone/.next/static
Copy-Item -Recurse -Force public .next/standalone/public

# 3. Khởi động lại dịch vụ máy chủ
# (hoặc restart service Windows / container Docker tùy hạ tầng triển khai)
node .next/standalone/server.js
```

### Cách 2: Nếu đang chạy môi trường Phát triển (Development)
Nếu đang chạy lệnh `npm run dev`, Next.js sẽ tự động Hot-Reload ngay lập tức mà không cần khởi động lại.

---

## 5. Kiểm tra Sau Khi Mở Khóa

1. **Tại trang Menu Launcher (`/menu`)**:
   - Biểu tượng Chấm công không còn ổ khóa.
   - Nhấp vào chuyển hướng trực tiếp vào phân hệ `/attendance`.
2. **Tại trang Bảng Chấm Công (`/attendance`)**:
   - Thanh Sidebar bên trái tự động hiển thị đầy đủ 4 tab:
     1. *Bảng chấm công* (`timesheet`)
     2. *Quản lý nhân sự* (`employees`)
     3. *Thống kê* (`statistics`)
     4. *Báo cáo & Xuất file* (`reports`)
   - Bảng ma trận chấm công 31 ngày hiển thị trọn vẹn với đầy đủ tính năng:
     - Click chuột trái để xoay vòng 7 trạng thái.
     - **Click chuột phải** để mở Dropdown Menu chọn nhanh 1-click.
     - Nút khóa sổ/mở khóa bảo vệ số liệu.
     - Xuất file Excel định dạng chuẩn mẫu bệnh viện.

---

## 6. Hướng Dẫn Khóa Lại (Nếu Cần Bảo Trì Hoặc Tạm Ẩn)

Nếu trong tương lai bệnh viện muốn tạm dừng phân hệ để bảo trì định kỳ, bạn chỉ cần thực hiện ngược lại:
1. Mở `src/config/modules.config.ts`.
2. Đổi lại `export const ATTENDANCE_MODULE_ENABLED = false`.
3. Chạy lại lệnh build. Hệ thống sẽ ngay lập tức quay về trạng thái khóa an toàn mà không làm mất bất kỳ dữ liệu nhân viên hay bản ghi công nào trong cơ sở dữ liệu.

---
*Tài liệu được khởi tạo ngày 12/10/2026 — Ban CNTT & Điều Dưỡng Bệnh viện Đa khoa Khánh Hội.*
