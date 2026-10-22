import { prisma } from '@/lib/prisma'

/**
 * Tính số ngày trong một tháng của một năm
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/**
 * Lấy danh sách ngày lễ trong tháng từ HolidayCalendar
 */
export async function getMonthHolidays(year: number, month: number): Promise<Array<{ day: number; name: string }>> {
  const daysInMonth = getDaysInMonth(year, month)
  const startDate = new Date(Date.UTC(year, month - 1, 1))
  const endDate = new Date(Date.UTC(year, month - 1, daysInMonth))

  const holidays = await prisma.holidayCalendar.findMany({
    where: {
      holidayDate: {
        gte: startDate,
        lte: endDate
      }
    },
    orderBy: { holidayDate: 'asc' }
  })

  return holidays.map((h) => ({
    day: h.holidayDate.getUTCDate(),
    name: h.name
  }))
}

/**
 * Tính toán ngày công chuẩn (standardDays) của một tháng:
 * Tổng số ngày trong tháng trừ đi Thứ Bảy (6), Chủ Nhật (0) và các ngày Lễ rơi vào Thứ Hai -> Thứ Sáu.
 */
export async function calculateStandardDays(year: number, month: number): Promise<number> {
  const daysInMonth = getDaysInMonth(year, month)
  const holidays = await getMonthHolidays(year, month)
  const holidayDaySet = new Set(holidays.map((h) => h.day))

  let standardDays = 0

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(Date.UTC(year, month - 1, day))
    const dayOfWeek = date.getUTCDay() // 0 = Chủ nhật, 6 = Thứ bảy

    // Trừ Thứ Bảy và Chủ Nhật
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue
    }

    // Trừ Ngày Lễ quốc gia rơi vào ngày trong tuần (T2-T6)
    if (holidayDaySet.has(day)) {
      continue
    }

    standardDays += 1
  }

  return standardDays
}
