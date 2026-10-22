import { getTodayHCM } from '@/lib/date-utils'

export async function register() {
  // Chỉ chạy trên môi trường Node.js server (không chạy trên Edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureDailyReportWithZeros } = await import('@/lib/services/report-init-service')

    console.log('[Instrumentation] Khởi động In-Process Daily Cron Scheduler...')

    // 1. Tự động kiểm tra và khởi tạo báo cáo cho ngày hôm nay ngay khi server khởi động
    try {
      const today = getTodayHCM()
      const initResult = await ensureDailyReportWithZeros(today)
      if (initResult.isNewReport) {
        console.log(`[Daily Init] Đã khởi tạo báo cáo ngày ${today} với giá trị 0 (${initResult.createdValuesCount} ô)`)
      }
    } catch (err) {
      console.error('[Daily Init Error] Không thể khởi tạo báo cáo ngày hôm nay:', err)
    }

    // 2. Scheduler ngầm: Kiểm tra mỗi 60 giây. Khi qua 00:00 (giờ HCM), tự động tạo ngày mới
    let lastProcessedDate = getTodayHCM()

    setInterval(async () => {
      try {
        const currentDate = getTodayHCM()
        if (currentDate !== lastProcessedDate) {
          console.log(`[Midnight Cron] Phát hiện bước sang ngày mới: ${currentDate} (Giờ Hồ Chí Minh). Đang tự động nạp 0...`)
          const res = await ensureDailyReportWithZeros(currentDate)
          lastProcessedDate = currentDate
          console.log(`[Midnight Cron] Hoàn tất nạp số liệu ngày ${currentDate} (${res.createdValuesCount} giá trị 0)`)
        }
      } catch (cronErr) {
        console.error('[Midnight Cron Error] Lỗi khi chạy cronjob tự động qua 0h:', cronErr)
      }
    }, 60000)
  }
}
