import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTodayHCM } from '@/lib/date-utils'

export async function GET(request: Request) {
  // 1. Kiểm tra session
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }

  // 2. Parse query param nếu có, nếu không mặc định lấy ngày hôm nay (múi giờ Hồ Chí Minh)
  const url = new URL(request.url)
  const dateParam = url.searchParams.get('date')
  const targetDateStr =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? dateParam
      : getTodayHCM()

  const targetDate = new Date(`${targetDateStr}T00:00:00.000Z`)

  const report = await prisma.report.findUnique({
    where: { reportDate: targetDate },
    include: {
      reportValues: {
        include: { department: true }
      }
    }
  })

  // 3. Đếm số khoa lâm sàng chuẩn (không gồm TONG)
  const totalDepts = await prisma.department.count({
    where: { isActive: true, isTotal: false }
  })

  // 4. Đếm số khoa đã có dữ liệu nhập (ít nhất 1 chỉ số có giá trị > 0)
  const submittedDeptIds = new Set<number>()
  if (report) {
    for (const rv of report.reportValues) {
      if (!rv.department.isTotal && rv.value > 0) {
        submittedDeptIds.add(rv.departmentId)
      }
    }
  }

  const submitted = submittedDeptIds.size
  const total = totalDepts || 11
  const percentage = Math.min(100, Math.round((submitted / total) * 100))

  return NextResponse.json({
    date: targetDateStr,
    submitted,
    total,
    percentage
  })
}
