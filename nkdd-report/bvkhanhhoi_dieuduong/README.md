# Hệ Thống Báo Cáo Giao Ban Điều Dưỡng (nkdd-report)

Hệ thống quản lý báo cáo số liệu điều dưỡng hàng ngày dành cho bệnh viện đa khoa, phục vụ công tác giao ban, theo dõi người bệnh, kỹ thuật điều dưỡng và phân bổ nhân lực.

---

## 1. Công nghệ sử dụng
- **Framework**: Next.js 16 (App Router, Turbopack, Standalone output)
- **Ngôn ngữ**: TypeScript strict, không semicolon tùy chọn, 2 spaces
- **Xác thực**: NextAuth.js v5 (JWT Strategy, Credentials Provider, trustHost)
- **Cơ sở dữ liệu**: PostgreSQL 16 + Prisma ORM 7 (`@prisma/adapter-pg` driver adapter)
- **Giao diện**: Tailwind CSS v4, responsive, tối ưu hiển thị bảng ma trận
- **Xuất dữ liệu**: ExcelJS (đúng chuẩn định dạng file gốc)
- **Đóng gói**: Docker & Docker Compose multi-stage build

---

## 2. Danh mục & Phân quyền

### 2.1. Danh sách Khoa phòng (12 cột)
1. **NOI** - Khoa Nội
2. **NGOAI** - Khoa Ngoại
3. **SAN** - Khoa Sản
4. **NHI** - Khoa Nhi
5. **KKB** - Khoa Khám bệnh
6. **CC** - Khoa Cấp cứu
7. **TNT** - Khoa Thận nhân tạo
8. **LCK** - Khoa Liên chuyên khoa
9. **GMHS** - Khoa Gây mê hồi sức
10. **XN** - Khoa Xét nghiệm
11. **CDHA** - Khoa Chẩn đoán hình ảnh
12. **TONG** - Cột TỔNG (`isTotal: true`, read-only, tự động cộng tổng tất cả các khoa)

### 2.2. Danh mục Chỉ số (8 nhóm - 75 chỉ số)
- **Giường & Bệnh nhân** (10 chỉ số)
- **Khám bệnh** (8 chỉ số)
- **Hồi sức & Thiết bị** (6 chỉ số)
- **Kỹ thuật điều dưỡng** (10 chỉ số)
- **Sản - Dịch vụ** (6 chỉ số)
- **Nhân lực Điều dưỡng** (17 chỉ số)
- **Cận lâm sàng** (11 chỉ số)
- **Phân loại PT/TT** (7 chỉ số)

### 2.3. Tài khoản Demo
| Tên đăng nhập | Mật khẩu | Vai trò (Role) | Mô tả quyền hạn |
|:---|:---|:---|:---|
| `admin` | `admin123` | `ADMIN` | Toàn quyền xem 12 cột, phân quyền chỉ số theo từng khoa |
| `bgd` | `123456` | `BGD` | Ban Giám Đốc - xem đầy đủ 12 cột, xuất Excel, không được sửa |
| `noi` | `123456` | `KHOA_USER` | Khoa Nội - chỉ thấy khoa mình + TỔNG, chỉ nhập chỉ số được cấp |
| `ngoai` | `123456` | `KHOA_USER` | Khoa Ngoại |
| `san` | `123456` | `KHOA_USER` | Khoa Sản |
| `nhi` | `123456` | `KHOA_USER` | Khoa Nhi |
| `kkb` | `123456` | `KHOA_USER` | Khoa Khám bệnh |
| `cc` | `123456` | `KHOA_USER` | Khoa Cấp cứu |
| `tnt` | `123456` | `KHOA_USER` | Khoa Thận nhân tạo |
| `lck` | `123456` | `KHOA_USER` | Khoa Liên chuyên khoa |
| `gmhs` | `123456` | `KHOA_USER` | Khoa Gây mê hồi sức |
| `xn` | `123456` | `KHOA_USER` | Khoa Xét nghiệm |
| `cdha` | `123456` | `KHOA_USER` | Khoa Chẩn đoán hình ảnh |

---

## 3. Cài đặt & Khởi chạy

### 3.1. Cấu hình biến môi trường (`.env`)
Sao chép từ `.env.example`:
```bash
cp .env.example .env
```
Nội dung file `.env`:
```env
DATABASE_URL="postgresql://nkdd:nkdd123@localhost:5432/nkdd?schema=public"
AUTH_SECRET="nkdd-secret-key-32-chars-long-minimum-random"
NEXTAUTH_URL="http://localhost:3000"
AUTH_TRUST_HOST=true
TZ=Asia/Ho_Chi_Minh
```

### 3.2. Chạy Local Development
1. Khởi động PostgreSQL (bằng Docker hoặc service cục bộ):
```bash
docker run -d --name nkdd-postgres -e POSTGRES_USER=nkdd -e POSTGRES_PASSWORD=nkdd123 -e POSTGRES_DB=nkdd -p 5432:5432 postgres:16-alpine
```

2. Sinh Prisma Client và khởi tạo dữ liệu:
```bash
npm install
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
```

3. Khởi chạy ứng dụng:
```bash
npm run dev
```
Truy cập: [http://localhost:3000](http://localhost:3000)

---

## 4. Triển khai bằng Docker Compose (Khuyên dùng)
Toàn bộ hệ thống gồm PostgreSQL và ứng dụng Next.js standalone đã được đóng gói sẵn sàng:

```bash
docker compose up -d --build
```
Khi khởi động lần đầu, ứng dụng tự động kiểm tra database, đẩy schema và nạp dữ liệu seed.
Truy cập hệ thống: [http://localhost:3000](http://localhost:3000)

---

## 5. Triển khai Mạng Nội Bộ (LAN Bệnh Viện)
Để các máy tính khoa phòng truy cập qua mạng nội bộ:
1. Xác định địa chỉ IP máy chủ LAN (VD: `192.168.1.100`).
2. Trong file `.env` hoặc `docker-compose.yml`, cập nhật:
   ```env
   NEXTAUTH_URL="http://192.168.1.100:3000"
   AUTH_TRUST_HOST=true
   ```
3. Mở cổng `3000` trên Windows Firewall hoặc Linux UFW:
   ```powershell
   # Windows PowerShell (Run as Administrator)
   New-NetFirewallRule -DisplayName "NKDD Report Port 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
   ```
4. Các máy trạm tại khoa phòng truy cập qua trình duyệt: `http://192.168.1.100:3000`.

---

## 6. Kịch bản Tiện ích & Sao lưu

### 6.1. Sao lưu dữ liệu
Tạo bản sao lưu database nén gzip:
```bash
chmod +x scripts/backup.sh
./scripts/backup.sh
```
File được lưu dưới dạng: `backup_YYYY-MM-DD_HHMMSS.sql.gz`.

### 6.2. Phục hồi dữ liệu
Khôi phục dữ liệu từ file sao lưu:
```bash
chmod +x scripts/restore.sh
./scripts/restore.sh backup_2026-10-12_143000.sql.gz
```

### 6.3. Kiểm thử tự động (Smoke Test)
Chạy bộ kiểm thử toàn diện 9 kịch bản end-to-end:
```bash
npx tsx scripts/smoke-test.ts
```
