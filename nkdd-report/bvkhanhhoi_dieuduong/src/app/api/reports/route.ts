import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// API lấy dữ liệu ma trận báo cáo theo ngày đã lọc quyền
export async function GET(request: Request) {
  // 1. Kiểm tra session
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }

  // 2. Parse query parameter date=YYYY-MM-DD
  const { searchParams } = new URL(request.url)
  const dateParam = searchParams.get('date')
  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json(
      { error: 'Thiếu hoặc sai định dạng ngày (?date=YYYY-MM-DD)' },
      { status: 400 }
    )
  }

  const reportDate = new Date(`${dateParam}T00:00:00.000Z`)
  const userRole = session.user.role
  const userDeptId = session.user.departmentId

  // 3. Query song song các bảng liên quan
  const [report, departments, allIndicators, userPermissions] = await Promise.all([
    prisma.report.findUnique({
      where: { reportDate },
      include: { reportValues: true }
    }),
    prisma.department.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    }),
    prisma.indicator.findMany({
      where: { isActive: true },
      include: { group: true },
      orderBy: [
        { group: { sortOrder: 'asc' } },
        { sortOrder: 'asc' }
      ]
    }),
    userRole === 'KHOA_USER' && userDeptId
      ? prisma.indicatorPermission.findMany({
          where: {
            departmentId: userDeptId,
            canEdit: true
          }
        })
      : Promise.resolve([])
  ])

  const isLocked = report?.status === 'LOCKED'

  // Map quyền của user khoa
  const permissionMap = new Set<number>()
  for (const perm of userPermissions) {
    permissionMap.add(perm.indicatorId)
  }

  // 4. Lọc indicator theo role
  let indicators = allIndicators
  if (userRole === 'KHOA_USER') {
    indicators = allIndicators.filter((ind) => permissionMap.has(ind.id))
  }

  // 5. Khởi tạo ma trận: { [deptId]: { [indId]: value } }
  const matrix: Record<number, Record<number, number>> = {}
  for (const dept of departments) {
    matrix[dept.id] = {}
    for (const ind of indicators) {
      matrix[dept.id][ind.id] = 0
    }
  }

  // Điền giá trị từ ReportValue trong DB
  if (report?.reportValues) {
    for (const rv of report.reportValues) {
      if (matrix[rv.departmentId] && matrix[rv.departmentId][rv.indicatorId] !== undefined) {
        matrix[rv.departmentId][rv.indicatorId] = rv.value
      }
    }
  }

  // 6. Cột TỔNG (isTotal = true): tự động tính SUM từ tất cả khoa thường
  const totalDept = departments.find((d) => d.isTotal)
  if (totalDept) {
    for (const ind of indicators) {
      let sum = 0
      for (const dept of departments) {
        if (!dept.isTotal) {
          sum += matrix[dept.id]?.[ind.id] || 0
        }
      }
      matrix[totalDept.id][ind.id] = sum
    }
  }

  // 7. Chuẩn bị danh sách indicators trả về với cờ canEdit
  const indicatorsResponse = indicators.map((ind) => {
    let canEdit = false
    if (!isLocked) {
      if (userRole === 'ADMIN') {
        canEdit = true
      } else if (userRole === 'KHOA_USER') {
        canEdit = permissionMap.has(ind.id)
      }
    }
    return {
      id: ind.id,
      code: ind.code,
      name: ind.name,
      groupName: ind.group.name,
      canEdit
    }
  })

  return NextResponse.json({
    reportDate: dateParam,
    status: report?.status || 'OPEN',
    myDepartmentId: userDeptId,
    myRole: userRole,
    departments: departments.map((d) => ({
      id: d.id,
      code: d.code,
      name: d.name,
      isTotal: d.isTotal,
      sortOrder: d.sortOrder
    })),
    indicators: indicatorsResponse,
    matrix
  })
}
