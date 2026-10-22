import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateStandardDays } from '@/lib/attendance-utils'

// GET /api/attendance/sheets/summary?month=10&year=2026
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const now = new Date()
  const monthParam = searchParams.get('month')
  const yearParam = searchParams.get('year')

  const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1
  const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear()

  if (isNaN(month) || month < 1 || month > 12 || isNaN(year) || year < 2000) {
    return NextResponse.json({ error: 'Thời gian không hợp lệ' }, { status: 400 })
  }

  const standardDays = await calculateStandardDays(year, month)

  // 1. Lấy tất cả 11 khoa phòng lâm sàng / cận lâm sàng (bỏ khoa TỔNG)
  const departments = await prisma.department.findMany({
    where: { isActive: true, isTotal: false },
    orderBy: { sortOrder: 'asc' }
  })

  // 2. Lấy danh sách kỳ chấm công đã tạo trong tháng/năm này
  const sheets = await prisma.attendanceSheet.findMany({
    where: { month, year },
    include: {
      lockedBy: {
        select: { id: true, name: true, role: true }
      }
    }
  })
  const sheetMap = new Map(sheets.map((s) => [s.departmentId, s]))

  // 3. Đếm số lượng nhân sự active theo từng khoa
  const employeeCounts = await prisma.employee.groupBy({
    by: ['departmentId'],
    where: { isActive: true },
    _count: { id: true }
  })
  const empCountMap = new Map(employeeCounts.map((ec) => [ec.departmentId, ec._count.id]))

  // 4. Tổng hợp thông tin tiến độ từng khoa
  let lockedCount = 0
  const departmentSummaries = departments.map((dept) => {
    const sheet = sheetMap.get(dept.id)
    const isLocked = sheet?.status === 'LOCKED'
    if (isLocked) lockedCount++

    return {
      departmentId: dept.id,
      code: dept.code,
      name: dept.name,
      employeeCount: empCountMap.get(dept.id) || 0,
      standardDays: sheet?.standardDays || standardDays,
      status: sheet?.status || 'OPEN',
      isLocked,
      lockedAt: sheet?.lockedAt || null,
      lockedBy: sheet?.lockedBy || null,
      sheetId: sheet?.id || null
    }
  })

  return NextResponse.json({
    month,
    year,
    standardDays,
    totalDepartments: departments.length,
    lockedCount,
    openCount: departments.length - lockedCount,
    departments: departmentSummaries
  })
}
