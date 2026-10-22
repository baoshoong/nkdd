export {}

import 'dotenv/config'
import ExcelJS from 'exceljs'
import { prisma } from '../src/lib/prisma'
import { ensureDailyReportWithZeros } from '../src/lib/services/report-init-service'

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000'

function parseCookies(response: Response): string {
  const setCookie = response.headers.getSetCookie?.() || []
  if (setCookie.length === 0) {
    const single = response.headers.get('set-cookie')
    if (single) return single.split(';')[0]
    return ''
  }
  return setCookie.map((c) => c.split(';')[0]).join('; ')
}

async function loginUser(username: string, password: string): Promise<string> {
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`)
  const csrfCookie = parseCookies(csrfRes)
  const { csrfToken } = await csrfRes.json()

  const signinRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: csrfCookie
    },
    body: new URLSearchParams({
      csrfToken,
      username,
      password,
      redirect: 'false'
    }),
    redirect: 'manual'
  })

  const authCookies = parseCookies(signinRes)
  return [csrfCookie, authCookies].filter(Boolean).join('; ')
}

async function main() {
  console.log('=== BẮT ĐẦU TEST MODULE THỐNG KÊ TỪ NGÀY ĐẾN NGÀY ===\n')

  // 1. Phân quyền truy cập
  console.log('1. Kiểm tra phân quyền truy cập trang và API Thống kê...')
  const noiCookie = await loginUser('noi', '123456')
  const bgdCookie = await loginUser('bgd', '123456')
  const adminCookie = await loginUser('admin', 'admin123')

  // Khoa Nội cố vào API /api/statistics -> Bị chặn 403
  const noiApiRes = await fetch(`${BASE_URL}/api/statistics`, {
    headers: { Cookie: noiCookie }
  })
  if (noiApiRes.status === 403) {
    console.log('✅ Khoa Nội (KHOA_USER) bị chặn đúng mã 403 khi truy cập API /api/statistics')
  } else {
    throw new Error(`Kỳ vọng 403 đối với KHOA_USER nhưng nhận được: ${noiApiRes.status}`)
  }

  // Khoa Nội cố vào trang /statistics -> Proxy chuyển hướng về /report
  const noiPageRes = await fetch(`${BASE_URL}/statistics`, {
    headers: { Cookie: noiCookie },
    redirect: 'manual'
  })
  const location = noiPageRes.headers.get('location') || ''
  if (location.includes('/report')) {
    console.log('✅ Khoa Nội truy cập /statistics bị Proxy chuyển hướng đúng về /report')
  } else {
    throw new Error(`Kỳ vọng redirect về /report nhưng location là: ${location}`)
  }

  // BGD và ADMIN vào API -> Thành công 200
  const bgdApiRes = await fetch(`${BASE_URL}/api/statistics`, {
    headers: { Cookie: bgdCookie }
  })
  if (bgdApiRes.status === 200) {
    console.log('✅ Ban Giám Đốc (BGD) truy cập API Thống kê thành công (Status 200)')
  } else {
    throw new Error(`BGD bị lỗi khi truy cập API: ${bgdApiRes.status}`)
  }

  const adminApiRes = await fetch(`${BASE_URL}/api/statistics`, {
    headers: { Cookie: adminCookie }
  })
  if (adminApiRes.status === 200) {
    console.log('✅ Quản trị viên (ADMIN) truy cập API Thống kê thành công (Status 200)')
  } else {
    throw new Error(`Admin bị lỗi khi truy cập API: ${adminApiRes.status}`)
  }

  // 2. Chuẩn bị dữ liệu kiểm thử qua 3 ngày: 2026-10-14, 2026-10-15, 2026-10-16
  console.log('\n2. Chuẩn bị số liệu kiểm thử kỳ 3 ngày (2026-10-14 -> 2026-10-16)...')
  const d1 = '2026-10-14'
  const d2 = '2026-10-15'
  const d3 = '2026-10-16'

  await ensureDailyReportWithZeros(d1)
  await ensureDailyReportWithZeros(d2)
  await ensureDailyReportWithZeros(d3)

  const deptNoi = await prisma.department.findUnique({ where: { code: 'NOI' } })
  const deptNgoai = await prisma.department.findUnique({ where: { code: 'NGOAI' } })
  const indGiuong = await prisma.indicator.findUnique({ where: { code: 'GIUONG_KH' } })
  const indKb = await prisma.indicator.findUnique({ where: { code: 'TONG_SO_KB' } })

  if (!deptNoi || !deptNgoai || !indGiuong || !indKb) {
    throw new Error('Không tìm thấy khoa hoặc chỉ số mẫu trong DB')
  }

  const rep1 = await prisma.report.findUnique({ where: { reportDate: new Date(`${d1}T00:00:00.000Z`) } })
  const rep2 = await prisma.report.findUnique({ where: { reportDate: new Date(`${d2}T00:00:00.000Z`) } })
  const rep3 = await prisma.report.findUnique({ where: { reportDate: new Date(`${d3}T00:00:00.000Z`) } })

  // Cập nhật số liệu giả lập:
  // Khoa Nội Giường KH: ngày 1 = 10, ngày 2 = 20, ngày 3 = 30 -> Sum = 60, Avg = 20, Max = 30, Min = 10
  await prisma.reportValue.updateMany({
    where: { reportId: rep1!.id, departmentId: deptNoi.id, indicatorId: indGiuong.id },
    data: { value: 10 }
  })
  await prisma.reportValue.updateMany({
    where: { reportId: rep2!.id, departmentId: deptNoi.id, indicatorId: indGiuong.id },
    data: { value: 20 }
  })
  await prisma.reportValue.updateMany({
    where: { reportId: rep3!.id, departmentId: deptNoi.id, indicatorId: indGiuong.id },
    data: { value: 30 }
  })

  // 3. Gọi API thống kê khoảng ngày 2026-10-14 đến 2026-10-16
  console.log('3. Xác minh tính toán thống kê (Sum, Avg, Max, Min)...')
  const statRes = await fetch(`${BASE_URL}/api/statistics?from=${d1}&to=${d3}`, {
    headers: { Cookie: adminCookie }
  })
  const statData = await statRes.json()

  if (statData.range.days !== 3) {
    throw new Error(`Kỳ vọng số ngày là 3, nhưng API trả về: ${statData.range.days}`)
  }

  const noiGiuongStat = statData.stats[deptNoi.id][indGiuong.id]
  console.log(`- Thống kê Khoa Nội [GIUONG_KH]: Sum=${noiGiuongStat.sum}, Avg=${noiGiuongStat.avg}, Max=${noiGiuongStat.max}, Min=${noiGiuongStat.min}`)

  if (
    noiGiuongStat.sum !== 60 ||
    noiGiuongStat.avg !== 20 ||
    noiGiuongStat.max !== 30 ||
    noiGiuongStat.min !== 10
  ) {
    throw new Error('Số liệu tính toán thống kê không khớp giá trị mong đợi!')
  }
  console.log('✅ Tính toán Sum (60), Avg (20), Max (30), Min (10) khớp chính xác 100%')

  // 4. Kiểm tra xuất file Excel thống kê
  console.log('\n4. Kiểm tra API Xuất Excel Thống Kê /api/statistics/export...')
  const excelRes = await fetch(`${BASE_URL}/api/statistics/export?from=${d1}&to=${d3}`, {
    headers: { Cookie: adminCookie }
  })

  if (!excelRes.ok) {
    throw new Error(`API xuất Excel trả về mã lỗi: ${excelRes.status}`)
  }

  const arrayBuffer = await excelRes.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  // @ts-expect-error buffer type compatibility
  await workbook.xlsx.load(Buffer.from(arrayBuffer))

  const worksheet = workbook.getWorksheet('Thống kê Tổng hợp')
  if (!worksheet) {
    throw new Error('File Excel thiếu sheet "Thống kê Tổng hợp"')
  }

  console.log(`- Sheet title: ${worksheet.name}, Số dòng: ${worksheet.rowCount}, Số cột: ${worksheet.columnCount}`)
  console.log('✅ File Excel xuất hợp lệ, mở thành công bằng ExcelJS không có lỗi định dạng')

  // Dọn dẹp dữ liệu test
  await prisma.report.deleteMany({
    where: {
      reportDate: {
        in: [
          new Date(`${d1}T00:00:00.000Z`),
          new Date(`${d2}T00:00:00.000Z`),
          new Date(`${d3}T00:00:00.000Z`)
        ]
      }
    }
  })

  console.log('\n🎉 TẤT CẢ KIỂM THỬ THỐNG KÊ KHOẢNG NGÀY ĐỀU ĐẠT CHUẨN XANH! 🎉\n')
}

main().catch((err) => {
  console.error('❌ FAIL:', err)
  process.exit(1)
})
