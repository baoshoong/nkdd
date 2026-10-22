import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  getDaysInMonth,
  getMonthHolidays,
  calculateStandardDays
} from '@/lib/attendance-utils'

// GET /api/attendance/sheets?month=10&year=2026&departmentId=...
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const user = session.user

  // 1. Parse month & year (mặc định lấy tháng/năm hiện tại theo giờ HCM)
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const monthParam = searchParams.get('month')
  const yearParam = searchParams.get('year')
  const deptIdParam = searchParams.get('departmentId')

  const month = monthParam ? parseInt(monthParam, 10) : currentMonth
  const year = yearParam ? parseInt(yearParam, 10) : currentYear

  if (isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Tháng không hợp lệ (1 - 12)' }, { status: 400 })
  }
  if (isNaN(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: 'Năm không hợp lệ' }, { status: 400 })
  }

  // 2. Xác định khoa phòng mục tiêu & kiểm tra quyền
  let targetDeptId: number
  if (user.role === 'KHOA_USER') {
    if (!user.departmentId) {
      return NextResponse.json({ error: 'Tài khoản chưa được gán khoa phòng' }, { status: 403 })
    }
    // Trưởng khoa chỉ được xem khoa mình, nếu truyền khác báo 403
    if (deptIdParam && parseInt(deptIdParam, 10) !== user.departmentId) {
      return NextResponse.json(
        { error: 'Bạn không có quyền truy cập bảng chấm công của khoa phòng khác' },
        { status: 403 }
      )
    }
    targetDeptId = user.departmentId
  } else {
    // ADMIN và BGD
    if (deptIdParam) {
      targetDeptId = parseInt(deptIdParam, 10)
    } else if (user.departmentId) {
      targetDeptId = user.departmentId
    } else {
      const firstDept = await prisma.department.findFirst({
        where: { isActive: true, isTotal: false },
        orderBy: { sortOrder: 'asc' }
      })
      if (!firstDept) {
        return NextResponse.json({ error: 'Chưa có dữ liệu khoa phòng' }, { status: 404 })
      }
      targetDeptId = firstDept.id
    }
  }

  // 3. Kiểm tra khoa phòng
  const department = await prisma.department.findUnique({
    where: { id: targetDeptId }
  })
  if (!department || department.isTotal || !department.isActive) {
    return NextResponse.json({ error: 'Khoa phòng không hợp lệ hoặc đang bị khóa' }, { status: 400 })
  }

  // 4. Tính toán số ngày công chuẩn và danh sách ngày lễ
  const daysInMonth = getDaysInMonth(year, month)
  const holidays = await getMonthHolidays(year, month)
  const standardDays = await calculateStandardDays(year, month)

  // 5. Tìm hoặc tạo mới AttendanceSheet
  let sheet = await prisma.attendanceSheet.findUnique({
    where: {
      departmentId_month_year: {
        departmentId: targetDeptId,
        month,
        year
      }
    },
    include: {
      lockedBy: {
        select: { id: true, name: true, role: true }
      }
    }
  })

  if (!sheet) {
    sheet = await prisma.attendanceSheet.create({
      data: {
        departmentId: targetDeptId,
        month,
        year,
        standardDays,
        status: 'OPEN'
      },
      include: {
        lockedBy: {
          select: { id: true, name: true, role: true }
        }
      }
    })
  } else if (sheet.standardDays !== standardDays && sheet.status === 'OPEN') {
    // Cập nhật lại số ngày công chuẩn nếu danh mục ngày lễ có thay đổi
    sheet = await prisma.attendanceSheet.update({
      where: { id: sheet.id },
      data: { standardDays },
      include: {
        lockedBy: {
          select: { id: true, name: true, role: true }
        }
      }
    })
  }

  // 6. Lấy danh sách nhân viên: nhân viên đang hoạt động + nhân viên thôi việc trong tháng này hoặc có record trong sheet này
  const startOfMonth = new Date(year, month - 1, 1)
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999)

  const activeEmployees = await prisma.employee.findMany({
    where: { departmentId: targetDeptId, isActive: true },
    orderBy: { code: 'asc' }
  })

  const records = await prisma.attendanceRecord.findMany({
    where: { sheetId: sheet.id }
  })

  const activeEmployeeIds = new Set(activeEmployees.map((e) => e.id))
  const recordedEmployeeIds = [...new Set(records.map((r) => r.employeeId))]

  // Lấy các nhân viên inactive nếu họ thôi việc trong tháng này hoặc có bản ghi trong sheet
  const inactiveEmployees = await prisma.employee.findMany({
    where: {
      departmentId: targetDeptId,
      isActive: false,
      OR: [
        { id: { in: recordedEmployeeIds } },
        {
          resignedAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      ]
    },
    orderBy: { code: 'asc' }
  })

  // Loại trừ nhân viên đã nằm trong activeEmployees (đề phòng)
  const uniqueInactiveEmployees = inactiveEmployees.filter((e) => !activeEmployeeIds.has(e.id))

  // Tổng hợp danh sách nhân viên hiển thị (nhân viên active xếp trước, nhân viên đã thôi việc xếp sau)
  const allEmployees = [...activeEmployees, ...uniqueInactiveEmployees]

  // 7. Tạo map các ô chấm công: employeeId -> day -> { status, note }
  const recordsMap: Record<number, Record<number, { status: string; note?: string | null }>> = {}
  for (const r of records) {
    if (!recordsMap[r.employeeId]) {
      recordsMap[r.employeeId] = {}
    }
    recordsMap[r.employeeId][r.day] = {
      status: r.status,
      note: r.note
    }
  }

  // 8. Tính toán summary từng nhân viên và tự động gán trạng thái RESIGNED sau ngày thôi việc
  const employeeSummaries = allEmployees.map((emp) => {
    let presentCount = 0
    let businessTripCount = 0
    let studyCount = 0
    let leaveCount = 0
    let sickCount = 0
    let maternityCount = 0
    let absentCount = 0
    const empRecords = recordsMap[emp.id] || (recordsMap[emp.id] = {})

    // Xác định ngày chính thức thôi việc trong tháng (nếu có)
    let resignedDay: number | null = null
    if (emp.resignedAt) {
      const rDate = new Date(emp.resignedAt)
      if (rDate.getFullYear() === year && rDate.getMonth() + 1 === month) {
        resignedDay = rDate.getDate()
      } else if (rDate < startOfMonth) {
        resignedDay = 1 // Đã thôi việc từ trước tháng này
      }
    } else if (!emp.isActive) {
      // Nếu không có ngày resignedAt nhưng isActive = false, coi như thôi việc từ ngày 1
      resignedDay = 1
    }

    for (let d = 1; d <= daysInMonth; d++) {
      if (resignedDay !== null && d >= resignedDay) {
        // Sau ngày thôi việc: Tự động gán RESIGNED (-)
        empRecords[d] = {
          status: 'RESIGNED',
          note: 'Đã thôi việc'
        }
        continue
      }

      const status = empRecords[d]?.status || 'PRESENT'
      if (status === 'ABSENT') absentCount += 1
      else if (status === 'LEAVE') leaveCount += 1
      else if (status === 'BUSINESS_TRIP') businessTripCount += 1
      else if (status === 'STUDY') studyCount += 1
      else if (status === 'SICK') sickCount += 1
      else if (status === 'MATERNITY') maternityCount += 1
      else if (status !== 'RESIGNED') presentCount += 1
    }

    // Tính tổng công:
    // Nếu nhân viên thôi việc trong tháng: công thực tế = số ngày làm việc thực tế trước ngày thôi việc
    // Nếu nhân viên đang làm việc bình thường: công chuẩn - các ngày vắng/phép/ốm/thai sản
    let totalWork = 0
    if (resignedDay !== null) {
      totalWork = presentCount + businessTripCount + studyCount
    } else {
      const deductedDays = absentCount + leaveCount + sickCount + maternityCount
      totalWork = Math.max(0, sheet.standardDays - deductedDays)
    }

    return {
      employeeId: emp.id,
      code: emp.code,
      name: emp.name,
      title: emp.title,
      isActive: emp.isActive,
      resignedAt: emp.resignedAt ? emp.resignedAt.toISOString() : null,
      presentCount,
      businessTripCount,
      studyCount,
      leaveCount,
      sickCount,
      maternityCount,
      absentCount,
      totalWork
    }
  })

  // 9. Danh sách tất cả khoa phòng để Admin/BGD chuyển đổi xem
  const departments = await prisma.department.findMany({
    where: { isActive: true, isTotal: false },
    select: { id: true, code: true, name: true },
    orderBy: { sortOrder: 'asc' }
  })

  return NextResponse.json({
    sheet: {
      id: sheet.id,
      month: sheet.month,
      year: sheet.year,
      departmentId: sheet.departmentId,
      status: sheet.status,
      standardDays: sheet.standardDays,
      lockedAt: sheet.lockedAt,
      lockedBy: sheet.lockedBy
    },
    department: {
      id: department.id,
      code: department.code,
      name: department.name
    },
    daysInMonth,
    holidays,
    employees: allEmployees.map((e) => ({
      id: e.id,
      code: e.code,
      name: e.name,
      title: e.title,
      isActive: e.isActive,
      resignedAt: e.resignedAt ? e.resignedAt.toISOString() : null
    })),
    records: recordsMap,
    summaries: employeeSummaries,
    departments,
    currentUser: {
      id: user.id,
      name: user.name,
      role: user.role,
      departmentId: user.departmentId
    }
  })
}
