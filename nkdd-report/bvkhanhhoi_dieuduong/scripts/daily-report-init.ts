export {}

import 'dotenv/config'
import { getTodayHCM } from '../src/lib/date-utils'
import { ensureDailyReportWithZeros } from '../src/lib/services/report-init-service'

async function main() {
  const argDate = process.argv[2]
  const targetDate = argDate && /^\d{4}-\d{2}-\d{2}$/.test(argDate) ? argDate : getTodayHCM()

  console.log(`=== BẮT ĐẦU KHỞI TẠO BÁO CÁO NGÀY MỚI (GIÁ TRỊ 0) ===`)
  console.log(`Ngày mục tiêu: ${targetDate} (Giờ Hồ Chí Minh)`)

  const result = await ensureDailyReportWithZeros(targetDate)

  console.log(`Kết quả:`)
  console.log(`   - ID Báo cáo: ${result.reportId}`)
  console.log(`   - Báo cáo tạo mới: ${result.isNewReport ? 'Có' : 'Không (Đã tồn tại từ trước)'}`)
  console.log(`   - Số ô giá trị 0 được nạp: ${result.createdValuesCount}`)
  console.log(`HOÀN TẤT THÀNH CÔNG! \n`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Lỗi:', err)
  process.exit(1)
})
