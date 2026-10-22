export {}

import 'dotenv/config'
import { prisma } from '../src/lib/prisma'
import { ensureDailyReportWithZeros } from '../src/lib/services/report-init-service'

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000'
const CRON_SECRET = process.env.CRON_SECRET || 'nkdd-cron-secret-key'

async function main() {
  console.log('=== BẮT ĐẦU TEST KHỞI TẠO BÁO CÁO NGÀY MỚI (DAILY CRON 0H) ===\n')

  const testDate = '2026-10-25'
  const testReportDate = new Date(`${testDate}T00:00:00.000Z`)

  // Dọn dẹp dữ liệu ngày test nếu có
  await prisma.report.deleteMany({
    where: { reportDate: testReportDate }
  })

  // 1. Test gọi API không có token / chưa login -> Phải bị từ chối 403
  console.log('1. Kiểm tra bảo vệ API /api/cron/daily-init khi không có token...')
  const unauthRes = await fetch(`${BASE_URL}/api/cron/daily-init?date=${testDate}`, {
    method: 'POST'
  })
  if (unauthRes.status === 403) {
    console.log('✅ API chặn đúng mã 403 khi thiếu token bảo mật')
  } else {
    throw new Error(`Kỳ vọng 403 nhưng nhận được: ${unauthRes.status}`)
  }

  // 2. Test gọi API với Bearer CRON_SECRET hợp lệ
  console.log('2. Kích hoạt khởi tạo qua Header Bearer CRON_SECRET...')
  const cronRes = await fetch(`${BASE_URL}/api/cron/daily-init?date=${testDate}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CRON_SECRET}`
    }
  })

  if (!cronRes.ok) {
    throw new Error(`Gọi cron API thất bại: ${cronRes.status} ${await cronRes.text()}`)
  }

  const cronJson = await cronRes.json()
  console.log('API khởi tạo thành công:', cronJson.message)

  // 3. Kiểm tra DB xem có đủ bản ghi Report và 12 khoa x 76 chỉ số = 912 bản ghi giá trị 0
  console.log('3. Kiểm tra số lượng và tính toàn vẹn bản ghi trong PostgreSQL...')
  const createdReport = await prisma.report.findUnique({
    where: { reportDate: testReportDate },
    include: {
      reportValues: true
    }
  })

  if (!createdReport) {
    throw new Error(`Không tìm thấy Report ngày ${testDate} trong DB`)
  }

  const valuesCount = createdReport.reportValues.length
  console.log(`- Số lượng ô giá trị khởi tạo trong DB: ${valuesCount}`)
  if (valuesCount !== 912) {
    throw new Error(`Kỳ vọng 912 bản ghi (12 khoa x 76 chỉ số) nhưng thực tế có ${valuesCount}`)
  }

  // Kiểm tra tất cả giá trị đều là 0
  const nonZero = createdReport.reportValues.filter((rv) => rv.value !== 0)
  if (nonZero.length > 0) {
    throw new Error(`Phát hiện ${nonZero.length} giá trị khác 0`)
  }
  console.log('✅ 100% bản ghi được gán giá trị mặc định bằng 0 chính xác')

  // 4. Test idempotency: Chạy lại lần nữa không được tạo trùng hay lỗi
  console.log('4. Kiểm tra tính Idempotent (chạy lặp lại an toàn)...')
  const retryResult = await ensureDailyReportWithZeros(testDate)
  if (retryResult.createdValuesCount === 0) {
    console.log('✅ Chạy lại an toàn: skipDuplicates hoạt động tốt, 0 bản ghi bị trùng')
  } else {
    throw new Error(`Chạy lại tạo thêm ${retryResult.createdValuesCount} bản ghi`)
  }

  // Dọn dẹp ngày test
  await prisma.report.deleteMany({
    where: { reportDate: testReportDate }
  })

  console.log('\n🎉 TẤT CẢ KIỂM THỬ KHỞI TẠO BÁO CÁO 0H ĐỀU ĐẠT CHUẨN XANH! 🎉\n')
}

main().catch((err) => {
  console.error('❌ FAIL:', err)
  process.exit(1)
})
