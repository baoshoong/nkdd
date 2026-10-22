import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'
import { ensureDailyReportWithZeros } from '../src/lib/services/report-init-service'

// 76 chỉ số chuẩn sau cập nhật
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

async function runMigration() {
  console.log('=== BẮT ĐẦU CẬP NHẬT CƠ SỞ DỮ LIỆU BÁO CÁO ĐIỀU DƯỠNG ===\n')

  // 1. Thêm Khoa Y học Cổ truyền (YHCT)
  console.log('1. Khởi tạo / Cập nhật Khoa Y học cổ truyền...')
  const yhctDept = await prisma.department.upsert({
    where: { code: 'YHCT' },
    update: { name: 'Khoa Y học cổ truyền', sortOrder: 12, isTotal: false, isActive: true },
    create: { code: 'YHCT', name: 'Khoa Y học cổ truyền', sortOrder: 12, isTotal: false, isActive: true }
  })
  console.log(`- Khoa YHCT id: ${yhctDept.id}`)

  // Đảm bảo cột TỔNG ở vị trí cuối cùng
  await prisma.department.updateMany({
    where: { code: 'TONG' },
    data: { sortOrder: 99 }
  })

  // 2. Tạo tài khoản đăng nhập cho Khoa Y học Cổ truyền (yhct / 123456)
  console.log('2. Khởi tạo tài khoản đăng nhập user yhct...')
  const defaultPasswordHash = await bcrypt.hash('123456', 10)
  const yhctUser = await prisma.user.upsert({
    where: { username: 'yhct' },
    update: {
      password: defaultPasswordHash,
      name: 'Khoa Y học cổ truyền',
      role: 'KHOA_USER',
      departmentId: yhctDept.id
    },
    create: {
      username: 'yhct',
      password: defaultPasswordHash,
      name: 'Khoa Y học cổ truyền',
      role: 'KHOA_USER',
      departmentId: yhctDept.id
    }
  })
  console.log(`- User yhct id: ${yhctUser.id}`)

  // 3. Nhân sự mẫu cho Khoa Y học Cổ truyền
  console.log('3. Khởi tạo nhân sự điều dưỡng mẫu cho Khoa YHCT...')
  await prisma.employee.upsert({
    where: { code: 'DD-YHCT-01' },
    update: { name: 'Nguyễn Văn Minh', title: 'Điều dưỡng trưởng', departmentId: yhctDept.id, isActive: true },
    create: { code: 'DD-YHCT-01', name: 'Nguyễn Văn Minh', title: 'Điều dưỡng trưởng', departmentId: yhctDept.id, isActive: true }
  })
  await prisma.employee.upsert({
    where: { code: 'DD-YHCT-02' },
    update: { name: 'Trần Thị Thảo', title: 'Điều dưỡng viên', departmentId: yhctDept.id, isActive: true },
    create: { code: 'DD-YHCT-02', name: 'Trần Thị Thảo', title: 'Điều dưỡng viên', departmentId: yhctDept.id, isActive: true }
  })

  // 4. Lấy Map nhóm chỉ số
  const groups = await prisma.indicatorGroup.findMany()
  const groupMap = new Map<string, number>()
  for (const g of groups) {
    groupMap.set(g.name, g.id)
  }

  // 5. Xóa chỉ số Khám DV (KHAM_DV)
  console.log('4. Kiểm tra và xóa chỉ số KHAM_DV...')
  const khamDv = await prisma.indicator.findUnique({
    where: { code: 'KHAM_DV' }
  })
  if (khamDv) {
    const deletedValues = await prisma.reportValue.deleteMany({
      where: { indicatorId: khamDv.id }
    })
    const deletedPerms = await prisma.indicatorPermission.deleteMany({
      where: { indicatorId: khamDv.id }
    })
    await prisma.indicator.delete({
      where: { id: khamDv.id }
    })
    console.log(`- Đã xóa KHAM_DV: ${deletedValues.count} giá trị và ${deletedPerms.count} quyền liên quan.`)
  } else {
    console.log('- Chỉ số KHAM_DV không tồn tại trong DB.')
  }

  // 6. Thêm / Cập nhật 2 chỉ số mới: KHI_DUNG và HL_TANG_CUONG
  console.log('5. Khởi tạo 2 chỉ số mới: Khí dung và HL tăng cường...')
  const ktddGroupId = groupMap.get('Kỹ thuật điều dưỡng')!
  const nlddGroupId = groupMap.get('Nhân lực Điều dưỡng')!

  await prisma.indicator.upsert({
    where: { code: 'KHI_DUNG' },
    update: { name: 'Khí dung', groupId: ktddGroupId, isActive: true },
    create: { code: 'KHI_DUNG', name: 'Khí dung', groupId: ktddGroupId, sortOrder: 31, isActive: true }
  })

  await prisma.indicator.upsert({
    where: { code: 'HL_TANG_CUONG' },
    update: { name: 'HL tăng cường', groupId: nlddGroupId, isActive: true },
    create: { code: 'HL_TANG_CUONG', name: 'HL tăng cường', groupId: nlddGroupId, sortOrder: 56, isActive: true }
  })

  // 7. Cập nhật thứ tự sortOrder và thông tin cho toàn bộ 76 chỉ số
  console.log('6. Cập nhật thứ tự sortOrder chuẩn cho toàn bộ 76 chỉ số...')
  for (const item of indicatorsData) {
    const gId = groupMap.get(item.group)
    if (!gId) continue
    await prisma.indicator.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        sortOrder: item.sortOrder,
        groupId: gId,
        isActive: true
      },
      create: {
        code: item.code,
        name: item.name,
        sortOrder: item.sortOrder,
        groupId: gId,
        isActive: true
      }
    })
  }

  const finalIndicatorCount = await prisma.indicator.count({ where: { isActive: true } })
  console.log(`- Tổng số chỉ số đang hoạt động: ${finalIndicatorCount} (Kỳ vọng: 76)`)

  // 8. Tự động đồng bộ các ô giá trị mặc định bằng 0 cho tất cả ngày báo cáo đã có trong DB
  console.log('7. Bổ sung giá trị mặc định 0 cho Khoa YHCT và các chỉ số mới vào các báo cáo hiện có...')
  const reports = await prisma.report.findMany({ select: { reportDate: true } })
  for (const r of reports) {
    const dStr = r.reportDate.toISOString().slice(0, 10)
    await ensureDailyReportWithZeros(dStr)
  }
  console.log(`- Đã đồng bộ số liệu cho ${reports.length} ngày báo cáo trong hệ thống.`)

  console.log('\n🎉 HOÀN TẤT CẬP NHẬT CƠ SỞ DỮ LIỆU THÀNH CÔNG!')
}

runMigration()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Lỗi khi cập nhật cơ sở dữ liệu:', e)
    process.exit(1)
  })
