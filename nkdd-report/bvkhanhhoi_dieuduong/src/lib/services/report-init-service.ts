import { prisma } from '@/lib/prisma'
import { getTodayHCM } from '@/lib/date-utils'

export interface EnsureReportResult {
  date: string
  reportId: number
  isNewReport: boolean
  createdValuesCount: number
}

/**
 * Đảm bảo ngày báo cáo tồn tại và có đầy đủ giá trị mặc định bằng 0
 * cho toàn bộ 12 khoa lâm sàng/chuyên môn và 76 chỉ số.
 * Chạy cực nhanh bằng createMany({ skipDuplicates: true }) chỉ trong 1 truy vấn SQL.
 */
export async function ensureDailyReportWithZeros(
  targetDateStr?: string
): Promise<EnsureReportResult> {
  const dateStr =
    targetDateStr && /^\d{4}-\d{2}-\d{2}$/.test(targetDateStr)
      ? targetDateStr
      : getTodayHCM()

  const reportDate = new Date(`${dateStr}T00:00:00.000Z`)

  // 1. Kiểm tra hoặc tạo Report
  let report = await prisma.report.findUnique({
    where: { reportDate }
  })

  let isNewReport = false
  if (!report) {
    report = await prisma.report.create({
      data: {
        reportDate,
        status: 'OPEN'
      }
    })
    isNewReport = true
  }

  // 2. Lấy danh sách 11 khoa lâm sàng (loại trừ cột TỔNG) và các chỉ số hoạt động
  const [departments, indicators] = await Promise.all([
    prisma.department.findMany({
      where: { isActive: true, isTotal: false },
      select: { id: true }
    }),
    prisma.indicator.findMany({
      where: { isActive: true },
      select: { id: true }
    })
  ])

  // 3. Chuẩn bị danh sách bản ghi giá trị 0
  const valuesToCreate: Array<{
    reportId: number
    departmentId: number
    indicatorId: number
    value: number
  }> = []

  for (const dept of departments) {
    for (const ind of indicators) {
      valuesToCreate.push({
        reportId: report.id,
        departmentId: dept.id,
        indicatorId: ind.id,
        value: 0
      })
    }
  }

  // 4. Nạp hàng loạt với skipDuplicates: true (không bao giờ ghi đè lên số liệu các khoa đã nhập)
  let createdCount = 0
  if (valuesToCreate.length > 0) {
    const result = await prisma.reportValue.createMany({
      data: valuesToCreate,
      skipDuplicates: true
    })
    createdCount = result.count
  }

  return {
    date: dateStr,
    reportId: report.id,
    isNewReport,
    createdValuesCount: createdCount
  }
}
