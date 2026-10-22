import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'

const connectionString = process.env.DATABASE_URL || 'postgresql://nkdd:nkdd123@localhost:5439/nkdd?schema=public'
const adapter = new PrismaPg(connectionString)
const prisma = new PrismaClient({ adapter })

// Danh sách 13 khoa (12 khoa chuyên môn + 1 cột TỔNG)
const departmentsData = [
  { code: 'NOI', name: 'Khoa Nội', sortOrder: 1, isTotal: false },
  { code: 'NGOAI', name: 'Khoa Ngoại', sortOrder: 2, isTotal: false },
  { code: 'SAN', name: 'Khoa Sản', sortOrder: 3, isTotal: false },
  { code: 'NHI', name: 'Khoa Nhi', sortOrder: 4, isTotal: false },
  { code: 'KKB', name: 'Khoa Khám bệnh', sortOrder: 5, isTotal: false },
  { code: 'CC', name: 'Khoa Cấp cứu', sortOrder: 6, isTotal: false },
  { code: 'TNT', name: 'Khoa Thận nhân tạo', sortOrder: 7, isTotal: false },
  { code: 'LCK', name: 'Khoa Liên chuyên khoa', sortOrder: 8, isTotal: false },
  { code: 'GMHS', name: 'Khoa Gây mê hồi sức', sortOrder: 9, isTotal: false },
  { code: 'XN', name: 'Khoa Xét nghiệm', sortOrder: 10, isTotal: false },
  { code: 'CDHA', name: 'Khoa Chẩn đoán hình ảnh', sortOrder: 11, isTotal: false },
  { code: 'YHCT', name: 'Khoa Y học cổ truyền', sortOrder: 12, isTotal: false },
  { code: 'TONG', name: 'TỔNG', sortOrder: 99, isTotal: true }
]

// Danh sách 8 nhóm chỉ số
const groupsData = [
  { name: 'Giường & Bệnh nhân', sortOrder: 1 },
  { name: 'Khám bệnh', sortOrder: 2 },
  { name: 'Hồi sức & Thiết bị', sortOrder: 3 },
  { name: 'Kỹ thuật điều dưỡng', sortOrder: 4 },
  { name: 'Sản - Dịch vụ', sortOrder: 5 },
  { name: 'Nhân lực Điều dưỡng', sortOrder: 6 },
  { name: 'Cận lâm sàng', sortOrder: 7 },
  { name: 'Phân loại PT/TT', sortOrder: 8 }
]

// 76 chỉ số chuẩn từ file Excel NKDD
const indicatorsData = [
  // 1. Giường & Bệnh nhân
  { group: 'Giường & Bệnh nhân', code: 'GIUONG_KH', name: 'Giường KH', sortOrder: 1 },
  { group: 'Giường & Bệnh nhân', code: 'BN_CON_LAI', name: 'BN còn lại', sortOrder: 2 },
  { group: 'Giường & Bệnh nhân', code: 'BN_VAO', name: 'BN vào', sortOrder: 3 },
  { group: 'Giường & Bệnh nhân', code: 'BN_RA', name: 'BN ra', sortOrder: 4 },
  { group: 'Giường & Bệnh nhân', code: 'BN_HIEN_CO', name: 'BN hiện có', sortOrder: 5 },
  { group: 'Giường & Bệnh nhân', code: 'CHUYEN_VIEN', name: 'Chuyển viện', sortOrder: 6 },
  { group: 'Giường & Bệnh nhân', code: 'CHUYEN_KHOA_DEN', name: 'Chuyển khoa đến', sortOrder: 7 },
  { group: 'Giường & Bệnh nhân', code: 'CHUYEN_KHOA_DI', name: 'Chuyển khoa đi', sortOrder: 8 },
  { group: 'Giường & Bệnh nhân', code: 'TRON_VIEN', name: 'Trốn viên', sortOrder: 9 },
  { group: 'Giường & Bệnh nhân', code: 'TU_VONG', name: 'Tử vong', sortOrder: 10 },

  // 2. Khám bệnh (đã xóa Khám DV)
  { group: 'Khám bệnh', code: 'TONG_SO_KB', name: 'Tổng số KB', sortOrder: 11 },
  { group: 'Khám bệnh', code: 'KHAM_BHYT', name: 'Khám BHYT', sortOrder: 12 },
  { group: 'Khám bệnh', code: 'KHAM_THU_PHI', name: 'Khám Thu phí', sortOrder: 13 },
  { group: 'Khám bệnh', code: 'KHAM_BHYT_THEO_YC', name: 'Khám BHYT theo YC', sortOrder: 14 },
  { group: 'Khám bệnh', code: 'TIEM_VACCIN', name: 'Tiêm vaccin', sortOrder: 15 },
  { group: 'Khám bệnh', code: 'BN_VAO_CAP_CUU', name: 'BN vào cấp cứu', sortOrder: 16 },
  { group: 'Khám bệnh', code: 'LUOT_KSK', name: 'Lượt KSK', sortOrder: 17 },

  // 3. Hồi sức & Thiết bị
  { group: 'Hồi sức & Thiết bị', code: 'SO_LUOT_CHAY_THAN', name: 'Số lượt chạy thận', sortOrder: 18 },
  { group: 'Hồi sức & Thiết bị', code: 'BN_THO_OXY', name: 'BN thở oxy', sortOrder: 19 },
  { group: 'Hồi sức & Thiết bị', code: 'BN_THO_MAY', name: 'BN thở máy', sortOrder: 20 },
  { group: 'Hồi sức & Thiết bị', code: 'BN_MONITOR', name: 'BN monitor', sortOrder: 21 },
  { group: 'Hồi sức & Thiết bị', code: 'BN_SOC_DIEN', name: 'BN sốc điện', sortOrder: 22 },
  { group: 'Hồi sức & Thiết bị', code: 'BN_BOM_TIEM_TU_DONG', name: 'BN bơm tiêm tự động', sortOrder: 23 },

  // 4. Kỹ thuật điều dưỡng (thêm Khí dung dưới BN hút đàm)
  { group: 'Kỹ thuật điều dưỡng', code: 'THAY_BANG', name: 'Thay băng', sortOrder: 24 },
  { group: 'Kỹ thuật điều dưỡng', code: 'TRUYEN_DICH', name: 'Truyền dịch', sortOrder: 25 },
  { group: 'Kỹ thuật điều dưỡng', code: 'TRUYEN_MAU', name: 'Truyền máu', sortOrder: 26 },
  { group: 'Kỹ thuật điều dưỡng', code: 'BN_KHAI_KHI_QUAN', name: 'BN khai khí quản', sortOrder: 27 },
  { group: 'Kỹ thuật điều dưỡng', code: 'BN_THO_QUA_NKQ', name: 'BN thở qua NKQ', sortOrder: 28 },
  { group: 'Kỹ thuật điều dưỡng', code: 'BN_VIEM_PHOI', name: 'BN viêm phổi', sortOrder: 29 },
  { group: 'Kỹ thuật điều dưỡng', code: 'BN_HUT_DAM', name: 'BN hút đàm', sortOrder: 30 },
  { group: 'Kỹ thuật điều dưỡng', code: 'KHI_DUNG', name: 'Khí dung', sortOrder: 31 },
  { group: 'Kỹ thuật điều dưỡng', code: 'BN_AN_QUA_SONDE', name: 'BN ăn qua sonde', sortOrder: 32 },
  { group: 'Kỹ thuật điều dưỡng', code: 'BN_SONDE_TIEU', name: 'BN sonde tiểu', sortOrder: 33 },
  { group: 'Kỹ thuật điều dưỡng', code: 'BN_CS_CAP_1', name: 'BN CS cấp 1', sortOrder: 34 },

  // 5. Sản - Dịch vụ
  { group: 'Sản - Dịch vụ', code: 'PHAU_THUAT', name: 'Phẫu thuật', sortOrder: 35 },
  { group: 'Sản - Dịch vụ', code: 'SINH_THUONG', name: 'Sinh thường', sortOrder: 36 },
  { group: 'Sản - Dịch vụ', code: 'SINH_MO', name: 'Sinh mổ', sortOrder: 37 },
  { group: 'Sản - Dịch vụ', code: 'MO_PHU_KHOA', name: 'Mổ phụ khoa', sortOrder: 38 },
  { group: 'Sản - Dịch vụ', code: 'BN_NAM_GIUONG_DV', name: 'BN nằm giường DV', sortOrder: 39 },
  { group: 'Sản - Dịch vụ', code: 'GIUONG_DV_TRONG', name: 'Giường DV trống', sortOrder: 40 },

  // 6. Nhân lực Điều dưỡng (ĐD trực 24h lên trên ra trực, ĐD đi thực tế lên trên TS hộ lý, thêm HL tăng cường)
  { group: 'Nhân lực Điều dưỡng', code: 'TONG_SO_DD_HS_KTY', name: 'Tổng số ĐD/ HS/ KTY', sortOrder: 41 },
  { group: 'Nhân lực Điều dưỡng', code: 'DD_TRUC_24H', name: 'TS/ĐD/ĐD/ HS/ KTY điều dưỡng trực 24h', sortOrder: 42 },
  { group: 'Nhân lực Điều dưỡng', code: 'DD_HS_KTY_RA_TRUC', name: 'ĐD/ HS/ KTY ra trực', sortOrder: 43 },
  { group: 'Nhân lực Điều dưỡng', code: 'DD_BU', name: 'ĐD/ĐD/ HS/ KTY bù', sortOrder: 44 },
  { group: 'Nhân lực Điều dưỡng', code: 'DD_PHEP', name: 'ĐD/ĐD/ HS/ KTY phép', sortOrder: 45 },
  { group: 'Nhân lực Điều dưỡng', code: 'DD_TANG_CUONG', name: 'ĐD/ĐD/ HS/ KTY tăng cường', sortOrder: 46 },
  { group: 'Nhân lực Điều dưỡng', code: 'DD_DI_HOC_CONG_TAC', name: 'ĐD/ĐD/ HS/ KTY Đi học/ công tác', sortOrder: 47 },
  { group: 'Nhân lực Điều dưỡng', code: 'DD_OM_HAU_SAN', name: 'ĐD/ĐD/ HS/ KTY ốm/ hậu sản', sortOrder: 48 },
  { group: 'Nhân lực Điều dưỡng', code: 'DD_HIEN_CO', name: 'TS/ ĐD/ĐD/ HS/ KTY hiện có', sortOrder: 49 },
  { group: 'Nhân lực Điều dưỡng', code: 'DD_THUC_HANH_LS', name: 'ĐD đi thực hành lâm sàng', sortOrder: 50 },
  { group: 'Nhân lực Điều dưỡng', code: 'DD_THUC_TE', name: 'ĐD đi thực tế', sortOrder: 51 },
  { group: 'Nhân lực Điều dưỡng', code: 'TS_HO_LY', name: 'TS hộ lý', sortOrder: 52 },
  { group: 'Nhân lực Điều dưỡng', code: 'HO_LY_BU', name: 'Hộ lý bù', sortOrder: 53 },
  { group: 'Nhân lực Điều dưỡng', code: 'HO_LY_PHEP', name: 'Hộ lý phép', sortOrder: 54 },
  { group: 'Nhân lực Điều dưỡng', code: 'HO_LY_OM_HAU_SAN', name: 'Hộ lý ốm/hậu sản', sortOrder: 55 },
  { group: 'Nhân lực Điều dưỡng', code: 'HL_TANG_CUONG', name: 'HL tăng cường', sortOrder: 56 },
  { group: 'Nhân lực Điều dưỡng', code: 'HO_LY_TRUC_24H', name: 'Hộ lý trực 24h', sortOrder: 57 },
  { group: 'Nhân lực Điều dưỡng', code: 'TS_HO_LY_HIEN_CO', name: 'TS hộ lý hiện có', sortOrder: 58 },

  // 7. Cận lâm sàng
  { group: 'Cận lâm sàng', code: 'ECG', name: 'ECG', sortOrder: 59 },
  { group: 'Cận lâm sàng', code: 'XQ', name: 'XQ', sortOrder: 60 },
  { group: 'Cận lâm sàng', code: 'SA', name: 'SA', sortOrder: 61 },
  { group: 'Cận lâm sàng', code: 'CT_SCANER', name: 'CT-Scaner', sortOrder: 62 },
  { group: 'Cận lâm sàng', code: 'CNHH', name: 'CNHH', sortOrder: 63 },
  { group: 'Cận lâm sàng', code: 'NOI_SOI_TMH', name: 'Nội soi TMH', sortOrder: 64 },
  { group: 'Cận lâm sàng', code: 'NOI_SOI_TIEU_HOA', name: 'Nội soi Tiêu Hóa', sortOrder: 65 },
  { group: 'Cận lâm sàng', code: 'SINH_HOA', name: 'Sinh hóa', sortOrder: 66 },
  { group: 'Cận lâm sàng', code: 'HUYET_HOC', name: 'Huyết học', sortOrder: 67 },
  { group: 'Cận lâm sàng', code: 'HIV', name: 'HIV', sortOrder: 68 },
  { group: 'Cận lâm sàng', code: 'XN_KHAC', name: 'XN khác', sortOrder: 69 },

  // 8. Phân loại PT/TT
  { group: 'Phân loại PT/TT', code: 'PHAU_THUAT_DB', name: 'Phẫu thuật ĐB', sortOrder: 70 },
  { group: 'Phân loại PT/TT', code: 'PT_LOAI_1', name: 'PT loại 1', sortOrder: 71 },
  { group: 'Phân loại PT/TT', code: 'PT_LOAI_2', name: 'PT loại 2', sortOrder: 72 },
  { group: 'Phân loại PT/TT', code: 'PT_LOAI_3', name: 'PT loại 3', sortOrder: 73 },
  { group: 'Phân loại PT/TT', code: 'TT_LOAI_1', name: 'TT loại 1', sortOrder: 74 },
  { group: 'Phân loại PT/TT', code: 'TT_LOAI_2', name: 'TT loại 2', sortOrder: 75 },
  { group: 'Phân loại PT/TT', code: 'TT_LOAI_3', name: 'TT loại 3', sortOrder: 76 }
]

// Bảng phân quyền 12 khoa phòng theo file "Phân Quyền User.xlsx" chính thức
const departmentPermissionsData: Record<string, string[]> = {
  "NOI": [
    "GIUONG_KH",
    "BN_CON_LAI",
    "BN_VAO",
    "BN_RA",
    "BN_HIEN_CO",
    "CHUYEN_VIEN",
    "CHUYEN_KHOA_DEN",
    "CHUYEN_KHOA_DI",
    "TRON_VIEN",
    "TU_VONG",
    "TONG_SO_KB",
    "KHAM_BHYT",
    "KHAM_THU_PHI",
    "KHAM_BHYT_THEO_YC",
    "BN_THO_OXY",
    "BN_THO_MAY",
    "BN_MONITOR",
    "BN_SOC_DIEN",
    "BN_BOM_TIEM_TU_DONG",
    "THAY_BANG",
    "TRUYEN_DICH",
    "TRUYEN_MAU",
    "BN_KHAI_KHI_QUAN",
    "BN_THO_QUA_NKQ",
    "BN_VIEM_PHOI",
    "BN_HUT_DAM",
    "KHI_DUNG",
    "BN_AN_QUA_SONDE",
    "BN_SONDE_TIEU",
    "BN_CS_CAP_1",
    "BN_NAM_GIUONG_DV",
    "GIUONG_DV_TRONG",
    "TONG_SO_DD_HS_KTY",
    "DD_TRUC_24H",
    "DD_HS_KTY_RA_TRUC",
    "DD_BU",
    "DD_PHEP",
    "DD_TANG_CUONG",
    "DD_DI_HOC_CONG_TAC",
    "DD_OM_HAU_SAN",
    "DD_HIEN_CO",
    "DD_THUC_HANH_LS",
    "DD_THUC_TE",
    "TS_HO_LY",
    "HO_LY_BU",
    "HO_LY_PHEP",
    "HO_LY_OM_HAU_SAN",
    "HL_TANG_CUONG",
    "HO_LY_TRUC_24H",
    "TS_HO_LY_HIEN_CO"
  ],
  "NGOAI": [
    "GIUONG_KH",
    "BN_CON_LAI",
    "BN_VAO",
    "BN_RA",
    "BN_HIEN_CO",
    "CHUYEN_VIEN",
    "CHUYEN_KHOA_DEN",
    "CHUYEN_KHOA_DI",
    "TRON_VIEN",
    "TU_VONG",
    "BN_THO_OXY",
    "BN_THO_MAY",
    "BN_MONITOR",
    "BN_SOC_DIEN",
    "BN_BOM_TIEM_TU_DONG",
    "THAY_BANG",
    "TRUYEN_DICH",
    "TRUYEN_MAU",
    "BN_KHAI_KHI_QUAN",
    "BN_THO_QUA_NKQ",
    "BN_VIEM_PHOI",
    "BN_HUT_DAM",
    "KHI_DUNG",
    "BN_AN_QUA_SONDE",
    "BN_SONDE_TIEU",
    "BN_CS_CAP_1",
    "PHAU_THUAT",
    "BN_NAM_GIUONG_DV",
    "GIUONG_DV_TRONG",
    "TONG_SO_DD_HS_KTY",
    "DD_TRUC_24H",
    "DD_HS_KTY_RA_TRUC",
    "DD_BU",
    "DD_PHEP",
    "DD_TANG_CUONG",
    "DD_DI_HOC_CONG_TAC",
    "DD_OM_HAU_SAN",
    "DD_HIEN_CO",
    "DD_THUC_HANH_LS",
    "DD_THUC_TE",
    "TS_HO_LY",
    "HO_LY_BU",
    "HO_LY_PHEP",
    "HO_LY_OM_HAU_SAN",
    "HL_TANG_CUONG",
    "HO_LY_TRUC_24H",
    "TS_HO_LY_HIEN_CO",
    "PHAU_THUAT_DB",
    "PT_LOAI_1",
    "PT_LOAI_2",
    "PT_LOAI_3",
    "TT_LOAI_1",
    "TT_LOAI_2",
    "TT_LOAI_3"
  ],
  "SAN": [
    "GIUONG_KH",
    "BN_CON_LAI",
    "BN_VAO",
    "BN_RA",
    "BN_HIEN_CO",
    "CHUYEN_VIEN",
    "CHUYEN_KHOA_DEN",
    "CHUYEN_KHOA_DI",
    "TRON_VIEN",
    "TU_VONG",
    "BN_THO_OXY",
    "BN_THO_MAY",
    "BN_MONITOR",
    "BN_SOC_DIEN",
    "BN_BOM_TIEM_TU_DONG",
    "THAY_BANG",
    "TRUYEN_DICH",
    "TRUYEN_MAU",
    "BN_KHAI_KHI_QUAN",
    "BN_THO_QUA_NKQ",
    "BN_VIEM_PHOI",
    "BN_HUT_DAM",
    "KHI_DUNG",
    "BN_AN_QUA_SONDE",
    "BN_SONDE_TIEU",
    "BN_CS_CAP_1",
    "PHAU_THUAT",
    "SINH_THUONG",
    "SINH_MO",
    "MO_PHU_KHOA",
    "BN_NAM_GIUONG_DV",
    "GIUONG_DV_TRONG",
    "TONG_SO_DD_HS_KTY",
    "DD_TRUC_24H",
    "DD_HS_KTY_RA_TRUC",
    "DD_BU",
    "DD_PHEP",
    "DD_TANG_CUONG",
    "DD_DI_HOC_CONG_TAC",
    "DD_OM_HAU_SAN",
    "DD_HIEN_CO",
    "DD_THUC_HANH_LS",
    "DD_THUC_TE",
    "TS_HO_LY",
    "HO_LY_BU",
    "HO_LY_PHEP",
    "HO_LY_OM_HAU_SAN",
    "HL_TANG_CUONG",
    "HO_LY_TRUC_24H",
    "TS_HO_LY_HIEN_CO"
  ],
  "NHI": [
    "GIUONG_KH",
    "BN_CON_LAI",
    "BN_VAO",
    "BN_RA",
    "BN_HIEN_CO",
    "CHUYEN_VIEN",
    "CHUYEN_KHOA_DEN",
    "CHUYEN_KHOA_DI",
    "TRON_VIEN",
    "TU_VONG",
    "TIEM_VACCIN",
    "BN_THO_OXY",
    "BN_THO_MAY",
    "BN_MONITOR",
    "BN_SOC_DIEN",
    "BN_BOM_TIEM_TU_DONG",
    "THAY_BANG",
    "TRUYEN_DICH",
    "TRUYEN_MAU",
    "BN_KHAI_KHI_QUAN",
    "BN_THO_QUA_NKQ",
    "BN_VIEM_PHOI",
    "BN_HUT_DAM",
    "KHI_DUNG",
    "BN_AN_QUA_SONDE",
    "BN_SONDE_TIEU",
    "BN_CS_CAP_1",
    "BN_NAM_GIUONG_DV",
    "GIUONG_DV_TRONG",
    "TONG_SO_DD_HS_KTY",
    "DD_TRUC_24H",
    "DD_HS_KTY_RA_TRUC",
    "DD_BU",
    "DD_PHEP",
    "DD_TANG_CUONG",
    "DD_DI_HOC_CONG_TAC",
    "DD_OM_HAU_SAN",
    "DD_HIEN_CO",
    "DD_THUC_HANH_LS",
    "DD_THUC_TE",
    "TS_HO_LY",
    "HO_LY_BU",
    "HO_LY_PHEP",
    "HO_LY_OM_HAU_SAN",
    "HL_TANG_CUONG",
    "HO_LY_TRUC_24H",
    "TS_HO_LY_HIEN_CO"
  ],
  "KKB": [
    "CHUYEN_VIEN",
    "CHUYEN_KHOA_DEN",
    "TONG_SO_KB",
    "KHAM_BHYT",
    "KHAM_THU_PHI",
    "KHAM_BHYT_THEO_YC",
    "LUOT_KSK",
    "TONG_SO_DD_HS_KTY",
    "DD_TRUC_24H",
    "DD_HS_KTY_RA_TRUC",
    "DD_BU",
    "DD_PHEP",
    "DD_TANG_CUONG",
    "DD_DI_HOC_CONG_TAC",
    "DD_OM_HAU_SAN",
    "DD_HIEN_CO",
    "DD_THUC_HANH_LS",
    "DD_THUC_TE",
    "TS_HO_LY",
    "HO_LY_BU",
    "HO_LY_PHEP",
    "HO_LY_OM_HAU_SAN",
    "HL_TANG_CUONG",
    "HO_LY_TRUC_24H",
    "TS_HO_LY_HIEN_CO",
    "ECG"
  ],
  "CC": [
    "GIUONG_KH",
    "BN_CON_LAI",
    "BN_VAO",
    "BN_RA",
    "BN_HIEN_CO",
    "CHUYEN_VIEN",
    "CHUYEN_KHOA_DEN",
    "CHUYEN_KHOA_DI",
    "TRON_VIEN",
    "TU_VONG",
    "BN_VAO_CAP_CUU",
    "BN_THO_OXY",
    "BN_THO_MAY",
    "BN_MONITOR",
    "BN_SOC_DIEN",
    "BN_BOM_TIEM_TU_DONG",
    "THAY_BANG",
    "TRUYEN_DICH",
    "TRUYEN_MAU",
    "BN_KHAI_KHI_QUAN",
    "BN_THO_QUA_NKQ",
    "BN_VIEM_PHOI",
    "BN_HUT_DAM",
    "KHI_DUNG",
    "BN_AN_QUA_SONDE",
    "BN_SONDE_TIEU",
    "BN_CS_CAP_1",
    "BN_NAM_GIUONG_DV",
    "GIUONG_DV_TRONG",
    "TONG_SO_DD_HS_KTY",
    "DD_TRUC_24H",
    "DD_HS_KTY_RA_TRUC",
    "DD_BU",
    "DD_PHEP",
    "DD_TANG_CUONG",
    "DD_DI_HOC_CONG_TAC",
    "DD_OM_HAU_SAN",
    "DD_HIEN_CO",
    "DD_THUC_HANH_LS",
    "DD_THUC_TE",
    "TS_HO_LY",
    "HO_LY_BU",
    "HO_LY_PHEP",
    "HO_LY_OM_HAU_SAN",
    "HL_TANG_CUONG",
    "HO_LY_TRUC_24H",
    "TS_HO_LY_HIEN_CO"
  ],
  "TNT": [
    "GIUONG_KH",
    "BN_CON_LAI",
    "BN_VAO",
    "BN_RA",
    "BN_HIEN_CO",
    "SO_LUOT_CHAY_THAN",
    "BN_THO_OXY",
    "BN_THO_MAY",
    "BN_MONITOR",
    "BN_SOC_DIEN",
    "BN_BOM_TIEM_TU_DONG",
    "THAY_BANG",
    "TRUYEN_DICH",
    "TRUYEN_MAU",
    "BN_KHAI_KHI_QUAN",
    "BN_THO_QUA_NKQ",
    "BN_VIEM_PHOI",
    "BN_HUT_DAM",
    "KHI_DUNG",
    "BN_AN_QUA_SONDE",
    "BN_SONDE_TIEU",
    "BN_CS_CAP_1"
  ],
  "LCK": [
    "GIUONG_KH",
    "BN_CON_LAI",
    "BN_VAO",
    "BN_RA",
    "BN_HIEN_CO",
    "CHUYEN_VIEN",
    "CHUYEN_KHOA_DEN",
    "CHUYEN_KHOA_DI",
    "TRON_VIEN",
    "TU_VONG",
    "TONG_SO_KB",
    "BN_THO_OXY",
    "BN_THO_MAY",
    "BN_MONITOR",
    "BN_SOC_DIEN",
    "BN_BOM_TIEM_TU_DONG",
    "THAY_BANG",
    "TRUYEN_DICH",
    "TRUYEN_MAU",
    "BN_KHAI_KHI_QUAN",
    "BN_THO_QUA_NKQ",
    "BN_VIEM_PHOI",
    "BN_HUT_DAM",
    "KHI_DUNG",
    "BN_AN_QUA_SONDE",
    "BN_SONDE_TIEU",
    "BN_CS_CAP_1",
    "BN_NAM_GIUONG_DV",
    "GIUONG_DV_TRONG",
    "TONG_SO_DD_HS_KTY",
    "DD_TRUC_24H",
    "DD_HS_KTY_RA_TRUC",
    "DD_BU",
    "DD_PHEP",
    "DD_TANG_CUONG",
    "DD_DI_HOC_CONG_TAC",
    "DD_OM_HAU_SAN",
    "DD_HIEN_CO",
    "DD_THUC_HANH_LS",
    "DD_THUC_TE",
    "TS_HO_LY",
    "HO_LY_BU",
    "HO_LY_PHEP",
    "HO_LY_OM_HAU_SAN",
    "HL_TANG_CUONG",
    "HO_LY_TRUC_24H",
    "TS_HO_LY_HIEN_CO",
    "NOI_SOI_TMH",
    "PHAU_THUAT_DB",
    "PT_LOAI_1",
    "PT_LOAI_2",
    "PT_LOAI_3",
    "TT_LOAI_1",
    "TT_LOAI_2",
    "TT_LOAI_3"
  ],
  "GMHS": [
    "GIUONG_KH",
    "BN_CON_LAI",
    "BN_VAO",
    "BN_RA",
    "BN_HIEN_CO",
    "CHUYEN_VIEN",
    "CHUYEN_KHOA_DEN",
    "CHUYEN_KHOA_DI",
    "TRON_VIEN",
    "TU_VONG",
    "BN_THO_OXY",
    "BN_THO_MAY",
    "BN_MONITOR",
    "BN_SOC_DIEN",
    "BN_BOM_TIEM_TU_DONG",
    "THAY_BANG",
    "TRUYEN_DICH",
    "TRUYEN_MAU",
    "BN_KHAI_KHI_QUAN",
    "BN_THO_QUA_NKQ",
    "BN_VIEM_PHOI",
    "BN_HUT_DAM",
    "KHI_DUNG",
    "BN_AN_QUA_SONDE",
    "BN_SONDE_TIEU",
    "BN_CS_CAP_1",
    "PHAU_THUAT",
    "MO_PHU_KHOA",
    "TONG_SO_DD_HS_KTY",
    "DD_TRUC_24H",
    "DD_HS_KTY_RA_TRUC",
    "DD_BU",
    "DD_PHEP",
    "DD_TANG_CUONG",
    "DD_DI_HOC_CONG_TAC",
    "DD_OM_HAU_SAN",
    "DD_HIEN_CO",
    "DD_THUC_HANH_LS",
    "DD_THUC_TE",
    "TS_HO_LY",
    "HO_LY_BU",
    "HO_LY_PHEP",
    "HO_LY_OM_HAU_SAN",
    "HL_TANG_CUONG",
    "HO_LY_TRUC_24H",
    "TS_HO_LY_HIEN_CO",
    "PHAU_THUAT_DB",
    "PT_LOAI_1",
    "PT_LOAI_2",
    "PT_LOAI_3",
    "TT_LOAI_1",
    "TT_LOAI_2",
    "TT_LOAI_3"
  ],
  "XN": [
    "TONG_SO_DD_HS_KTY",
    "DD_TRUC_24H",
    "DD_HS_KTY_RA_TRUC",
    "DD_BU",
    "DD_PHEP",
    "DD_TANG_CUONG",
    "DD_DI_HOC_CONG_TAC",
    "DD_OM_HAU_SAN",
    "DD_HIEN_CO",
    "DD_THUC_HANH_LS",
    "TS_HO_LY",
    "HO_LY_BU",
    "HO_LY_PHEP",
    "HO_LY_OM_HAU_SAN",
    "HL_TANG_CUONG",
    "HO_LY_TRUC_24H",
    "TS_HO_LY_HIEN_CO",
    "SINH_HOA",
    "HUYET_HOC",
    "HIV",
    "XN_KHAC"
  ],
  "CDHA": [
    "TONG_SO_DD_HS_KTY",
    "DD_TRUC_24H",
    "DD_HS_KTY_RA_TRUC",
    "DD_BU",
    "DD_PHEP",
    "DD_TANG_CUONG",
    "DD_DI_HOC_CONG_TAC",
    "DD_OM_HAU_SAN",
    "DD_HIEN_CO",
    "DD_THUC_HANH_LS",
    "TS_HO_LY",
    "HO_LY_BU",
    "HO_LY_PHEP",
    "HO_LY_OM_HAU_SAN",
    "HL_TANG_CUONG",
    "HO_LY_TRUC_24H",
    "TS_HO_LY_HIEN_CO",
    "XQ",
    "SA",
    "CT_SCANER",
    "CNHH",
    "NOI_SOI_TIEU_HOA"
  ],
  "YHCT": [
    "GIUONG_KH",
    "BN_CON_LAI",
    "BN_VAO",
    "BN_RA",
    "BN_HIEN_CO",
    "CHUYEN_VIEN",
    "CHUYEN_KHOA_DEN",
    "CHUYEN_KHOA_DI",
    "TRON_VIEN",
    "TU_VONG",
    "BN_THO_OXY",
    "BN_THO_MAY",
    "BN_MONITOR",
    "BN_SOC_DIEN",
    "BN_BOM_TIEM_TU_DONG",
    "THAY_BANG",
    "TRUYEN_DICH",
    "TRUYEN_MAU",
    "BN_KHAI_KHI_QUAN",
    "BN_THO_QUA_NKQ",
    "BN_VIEM_PHOI",
    "BN_HUT_DAM",
    "KHI_DUNG",
    "BN_AN_QUA_SONDE",
    "BN_SONDE_TIEU",
    "BN_CS_CAP_1",
    "BN_NAM_GIUONG_DV",
    "GIUONG_DV_TRONG",
    "TONG_SO_DD_HS_KTY",
    "DD_TRUC_24H",
    "DD_HS_KTY_RA_TRUC",
    "DD_BU",
    "DD_PHEP",
    "DD_TANG_CUONG",
    "DD_DI_HOC_CONG_TAC",
    "DD_OM_HAU_SAN",
    "DD_HIEN_CO",
    "DD_THUC_HANH_LS",
    "DD_THUC_TE",
    "TS_HO_LY",
    "HO_LY_BU",
    "HO_LY_PHEP",
    "HO_LY_OM_HAU_SAN",
    "HL_TANG_CUONG",
    "HO_LY_TRUC_24H",
    "TS_HO_LY_HIEN_CO"
  ]
}

async function main() {
  console.log('--- Bắt đầu seed dữ liệu NKDD ---')

  // 1. Tạo hoặc cập nhật Department
  console.log('1. Khởi tạo danh sách khoa...')
  const departmentMap = new Map<string, number>()
  for (const dept of departmentsData) {
    const record = await prisma.department.upsert({
      where: { code: dept.code },
      update: { name: dept.name, sortOrder: dept.sortOrder, isTotal: dept.isTotal },
      create: dept
    })
    departmentMap.set(dept.code, record.id)
  }

  // 2. Tạo hoặc cập nhật IndicatorGroup
  console.log('2. Khởi tạo danh sách nhóm chỉ số...')
  const groupMap = new Map<string, number>()
  for (const g of groupsData) {
    const record = await prisma.indicatorGroup.upsert({
      where: { name: g.name },
      update: { sortOrder: g.sortOrder },
      create: g
    })
    groupMap.set(g.name, record.id)
  }

  // 3. Tạo hoặc cập nhật Indicator
  console.log('3. Khởi tạo danh mục 76 chỉ số...')
  const createdIndicators = []
  const indicatorMap = new Map<string, number>()
  for (const ind of indicatorsData) {
    const groupId = groupMap.get(ind.group)!
    const record = await prisma.indicator.upsert({
      where: { code: ind.code },
      update: {
        name: ind.name,
        groupId,
        sortOrder: ind.sortOrder
      },
      create: {
        code: ind.code,
        name: ind.name,
        groupId,
        sortOrder: ind.sortOrder
      }
    })
    createdIndicators.push(record)
    indicatorMap.set(record.code, record.id)
  }
  console.log(`Đã seed xong ${createdIndicators.length} chỉ số`)

  // 4. Tạo User
  console.log('4. Khởi tạo người dùng...')
  const adminPasswordHash = await bcrypt.hash('admin123', 10)
  const defaultPasswordHash = await bcrypt.hash('123456', 10)

  // User admin
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      password: adminPasswordHash,
      name: 'Quản trị viên',
      role: 'ADMIN',
      departmentId: null
    },
    create: {
      username: 'admin',
      password: adminPasswordHash,
      name: 'Quản trị viên',
      role: 'ADMIN',
      departmentId: null
    }
  })

  // User Ban Giám Đốc (BGD)
  await prisma.user.upsert({
    where: { username: 'bgd' },
    update: {
      password: defaultPasswordHash,
      name: 'Ban Giám Đốc',
      role: 'BGD',
      departmentId: null
    },
    create: {
      username: 'bgd',
      password: defaultPasswordHash,
      name: 'Ban Giám Đốc',
      role: 'BGD',
      departmentId: null
    }
  })

  // 11 user khoa thường
  const normalDepts = departmentsData.filter((d) => !d.isTotal)
  for (const dept of normalDepts) {
    const username = dept.code.toLowerCase()
    const deptId = departmentMap.get(dept.code)!
    await prisma.user.upsert({
      where: { username },
      update: {
        password: defaultPasswordHash,
        name: dept.name,
        role: 'KHOA_USER',
        departmentId: deptId
      },
      create: {
        username,
        password: defaultPasswordHash,
        name: dept.name,
        role: 'KHOA_USER',
        departmentId: deptId
      }
    })
  }

  // 5. Khởi tạo phân quyền chỉ số chính thức cho 12 khoa theo file "Phân Quyền User.xlsx"
  console.log('5. Khởi tạo phân quyền chỉ số chính thức cho các khoa phòng...')
  await prisma.indicatorPermission.deleteMany({})
  const permDataToCreate: Array<{ departmentId: number; indicatorId: number; canEdit: boolean }> = []
  for (const [deptCode, indCodes] of Object.entries(departmentPermissionsData)) {
    const dId = departmentMap.get(deptCode)
    if (!dId) continue
    for (const code of indCodes) {
      const iId = indicatorMap.get(code)
      if (iId) {
        permDataToCreate.push({
          departmentId: dId,
          indicatorId: iId,
          canEdit: true
        })
      }
    }
  }
  await prisma.indicatorPermission.createMany({
    data: permDataToCreate,
    skipDuplicates: true
  })
  console.log(`Đã phân quyền thành công ${permDataToCreate.length} chỉ số cho các khoa phòng.`)

  // 6. Khởi tạo danh mục Ngày lễ Việt Nam 2026 (HolidayCalendar)
  console.log('6. Khởi tạo ngày lễ Việt Nam năm 2026...')
  const holidays2026 = [
    { date: '2026-01-01', name: 'Tết Dương Lịch 2026', year: 2026 },
    { date: '2026-02-15', name: 'Nghỉ Tết Nguyên Đán (28 Tết)', year: 2026 },
    { date: '2026-02-16', name: 'Nghỉ Tết Nguyên Đán (29 Tết)', year: 2026 },
    { date: '2026-02-17', name: 'Mùng 1 Tết Nguyên Đán Bính Ngọ', year: 2026 },
    { date: '2026-02-18', name: 'Mùng 2 Tết Nguyên Đán', year: 2026 },
    { date: '2026-02-19', name: 'Mùng 3 Tết Nguyên Đán', year: 2026 },
    { date: '2026-02-20', name: 'Nghỉ bù Tết Nguyên Đán', year: 2026 },
    { date: '2026-02-21', name: 'Nghỉ bù Tết Nguyên Đán', year: 2026 },
    { date: '2026-04-26', name: 'Giỗ Tổ Hùng Vương (10/3 ÂL)', year: 2026 },
    { date: '2026-04-27', name: 'Nghỉ bù Giỗ Tổ Hùng Vương', year: 2026 },
    { date: '2026-04-30', name: 'Ngày Giải phóng Miền Nam', year: 2026 },
    { date: '2026-05-01', name: 'Ngày Quốc tế Lao động', year: 2026 },
    { date: '2026-09-01', name: 'Nghỉ lễ Quốc Khánh', year: 2026 },
    { date: '2026-09-02', name: 'Ngày Quốc Khánh', year: 2026 }
  ]

  for (const h of holidays2026) {
    const holidayDate = new Date(`${h.date}T00:00:00.000Z`)
    await prisma.holidayCalendar.upsert({
      where: { holidayDate },
      update: { name: h.name, year: h.year },
      create: { holidayDate, name: h.name, year: h.year }
    })
  }

  // 7. Khởi tạo nhân viên điều dưỡng mẫu (Employee) cho các khoa
  console.log('7. Khởi tạo danh sách nhân sự mẫu cho các khoa...')
  const sampleEmployees = [
    // Khoa Nội
    { code: 'DD-NOI-01', name: 'Nguyễn Thị Thu Hà', title: 'Điều dưỡng trưởng', deptCode: 'NOI' },
    { code: 'DD-NOI-02', name: 'Trần Văn Bình', title: 'Điều dưỡng viên', deptCode: 'NOI' },
    { code: 'DD-NOI-03', name: 'Lê Thị Cúc', title: 'Điều dưỡng viên', deptCode: 'NOI' },
    { code: 'DD-NOI-04', name: 'Vũ Hoàng Duy', title: 'Điều dưỡng viên', deptCode: 'NOI' },
    // Khoa Ngoại
    { code: 'DD-NGOAI-01', name: 'Phạm Quốc Dũng', title: 'Điều dưỡng trưởng', deptCode: 'NGOAI' },
    { code: 'DD-NGOAI-02', name: 'Võ Thị Em', title: 'Điều dưỡng viên', deptCode: 'NGOAI' },
    { code: 'DD-NGOAI-03', name: 'Đoàn Minh Phong', title: 'Điều dưỡng viên', deptCode: 'NGOAI' },
    // Khoa Sản
    { code: 'HS-SAN-01', name: 'Đặng Thị Hương', title: 'Hộ sinh trưởng', deptCode: 'SAN' },
    { code: 'HS-SAN-02', name: 'Hoàng Thị Mai', title: 'Hộ sinh viên', deptCode: 'SAN' },
    { code: 'HS-SAN-03', name: 'Ngô Thanh Thúy', title: 'Hộ sinh viên', deptCode: 'SAN' },
    // Khoa Nhi
    { code: 'DD-NHI-01', name: 'Đỗ Minh Khang', title: 'Điều dưỡng trưởng', deptCode: 'NHI' },
    { code: 'DD-NHI-02', name: 'Bùi Thị Lan', title: 'Điều dưỡng viên', deptCode: 'NHI' },
    // Khoa Cấp Cứu
    { code: 'DD-CC-01', name: 'Ngô Văn Nam', title: 'Điều dưỡng trưởng', deptCode: 'CC' },
    { code: 'DD-CC-02', name: 'Dương Quốc Oanh', title: 'Điều dưỡng viên', deptCode: 'CC' },
    // Khoa Khám Bệnh
    { code: 'DD-KKB-01', name: 'Lý Quốc Toàn', title: 'Điều dưỡng trưởng', deptCode: 'KKB' },
    { code: 'DD-KKB-02', name: 'Hồ Thị Kim Phượng', title: 'Điều dưỡng viên', deptCode: 'KKB' },
    // Khoa Thận Nhân Tạo
    { code: 'DD-TNT-01', name: 'Tạ Minh Tân', title: 'Điều dưỡng trưởng', deptCode: 'TNT' },
    { code: 'DD-TNT-02', name: 'Nguyễn Thị Ngọc', title: 'Điều dưỡng viên', deptCode: 'TNT' },
    // Khoa Liên Chuyên Khoa
    { code: 'DD-LCK-01', name: 'Trương Vĩnh Kỳ', title: 'Điều dưỡng trưởng', deptCode: 'LCK' },
    { code: 'DD-LCK-02', name: 'Mai Tuyết Nga', title: 'Điều dưỡng viên', deptCode: 'LCK' },
    // Khoa Gây Mê Hồi Sức
    { code: 'DD-GMHS-01', name: 'Phan Văn Hậu', title: 'Kỹ thuật viên trưởng', deptCode: 'GMHS' },
    { code: 'DD-GMHS-02', name: 'Đinh Thị Loan', title: 'Kỹ thuật viên gây mê', deptCode: 'GMHS' },
    // Khoa Xét Nghiệm
    { code: 'KTY-XN-01', name: 'Bùi Thế Hải', title: 'Kỹ thuật viên trưởng', deptCode: 'XN' },
    { code: 'KTY-XN-02', name: 'Phạm Thị Thảo', title: 'Kỹ thuật viên xét nghiệm', deptCode: 'XN' },
    // Khoa Chẩn Đoán Hình Ảnh
    { code: 'KTY-CDHA-01', name: 'Vũ Quốc Đạt', title: 'Kỹ thuật viên trưởng', deptCode: 'CDHA' },
    { code: 'KTY-CDHA-02', name: 'Nguyễn Thanh Tùng', title: 'Kỹ thuật viên X-Quang', deptCode: 'CDHA' },
    // Khoa Y học Cổ truyền
    { code: 'DD-YHCT-01', name: 'Nguyễn Văn Minh', title: 'Điều dưỡng trưởng', deptCode: 'YHCT' },
    { code: 'DD-YHCT-02', name: 'Trần Thị Thảo', title: 'Điều dưỡng viên', deptCode: 'YHCT' },
  ]

  for (const emp of sampleEmployees) {
    const dId = departmentMap.get(emp.deptCode)
    if (!dId) continue
    await prisma.employee.upsert({
      where: { code: emp.code },
      update: { name: emp.name, title: emp.title, departmentId: dId, isActive: true },
      create: { code: emp.code, name: emp.name, title: emp.title, departmentId: dId, isActive: true }
    })
  }

  // 8. Khởi tạo kỳ chấm công Tháng 10/2026 cho Khoa Nội
  console.log('8. Khởi tạo kỳ chấm công mẫu 10/2026...')
  const noiDeptId = departmentMap.get('NOI')!
  await prisma.attendanceSheet.upsert({
    where: {
      departmentId_month_year: {
        departmentId: noiDeptId,
        month: 10,
        year: 2026
      }
    },
    update: { standardDays: 22, status: 'OPEN' },
    create: {
      departmentId: noiDeptId,
      month: 10,
      year: 2026,
      standardDays: 22,
      status: 'OPEN'
    }
  })

  console.log('--- Hoàn tất seed dữ liệu thành công! ---')
}

main()
  .catch((e) => {
    console.error('Lỗi khi seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
