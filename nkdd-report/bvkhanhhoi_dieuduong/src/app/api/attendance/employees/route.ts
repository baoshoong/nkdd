import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const createEmployeeSchema = z.object({
  code: z.string().trim().min(1, 'Mã nhân viên không được để trống').max(50, 'Mã nhân viên tối đa 50 ký tự'),
  name: z.string().trim().min(1, 'Họ và tên không được để trống').max(100, 'Họ và tên tối đa 100 ký tự'),
  title: z.string().trim().min(1, 'Chức danh không được để trống').max(100, 'Chức danh tối đa 100 ký tự'),
  departmentId: z.number().int().positive().optional()
})

// GET /api/attendance/employees?departmentId=...&includeInactive=...
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const deptIdParam = searchParams.get('departmentId')
  const includeInactive = searchParams.get('includeInactive') === 'true'
  const statusParam = searchParams.get('status') // 'all' | 'active' | 'inactive'
  const search = searchParams.get('search')?.trim() || ''

  const user = session.user
  let targetDeptId: number

  if (user.role === 'KHOA_USER') {
    if (!user.departmentId) {
      return NextResponse.json({ error: 'Tài khoản chưa được gán khoa phòng' }, { status: 403 })
    }
    // Trưởng khoa chỉ được xem nhân sự khoa mình
    if (deptIdParam && parseInt(deptIdParam, 10) !== user.departmentId) {
      return NextResponse.json(
        { error: 'Không có quyền xem nhân sự của khoa phòng khác' },
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
      // Mặc định lấy khoa đầu tiên nếu Admin không truyền
      const firstDept = await prisma.department.findFirst({
        where: { isActive: true, isTotal: false },
        orderBy: { sortOrder: 'asc' }
      })
      if (!firstDept) {
        return NextResponse.json({ employees: [] })
      }
      targetDeptId = firstDept.id
    }
  }

  // Xây dựng điều kiện lọc trạng thái hoạt động
  let activeFilter: boolean | undefined
  if (statusParam === 'active') {
    activeFilter = true
  } else if (statusParam === 'inactive') {
    activeFilter = false
  } else if (statusParam === 'all' || includeInactive) {
    activeFilter = undefined
  } else {
    activeFilter = true // mặc định chỉ lấy active
  }

  const employees = await prisma.employee.findMany({
    where: {
      departmentId: targetDeptId,
      ...(activeFilter !== undefined ? { isActive: activeFilter } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { code: { contains: search, mode: 'insensitive' } },
              { title: { contains: search, mode: 'insensitive' } }
            ]
          }
        : {})
    },
    orderBy: [
      { isActive: 'desc' },
      { code: 'asc' }
    ]
  })

  return NextResponse.json({ employees })
}

// POST /api/attendance/employees
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }

  const user = session.user
  if (user.role === 'BGD') {
    return NextResponse.json(
      { error: 'Ban Giám Đốc chỉ có quyền xem, không được thêm nhân viên' },
      { status: 403 }
    )
  }

  let bodyJson: unknown
  try {
    bodyJson = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON không hợp lệ' }, { status: 400 })
  }

  const parseResult = createEmployeeSchema.safeParse(bodyJson)
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Dữ liệu không hợp lệ', details: parseResult.error.flatten() },
      { status: 400 }
    )
  }

  const { code, name, title, departmentId: bodyDeptId } = parseResult.data

  let targetDeptId: number
  if (user.role === 'KHOA_USER') {
    if (!user.departmentId) {
      return NextResponse.json({ error: 'Tài khoản chưa được gán khoa phòng' }, { status: 403 })
    }
    targetDeptId = user.departmentId
  } else {
    // ADMIN
    if (bodyDeptId) {
      targetDeptId = bodyDeptId
    } else if (user.departmentId) {
      targetDeptId = user.departmentId
    } else {
      return NextResponse.json({ error: 'Vui lòng chọn khoa phòng cho nhân viên' }, { status: 400 })
    }
  }

  // Kiểm tra khoa phòng hợp lệ
  const department = await prisma.department.findUnique({
    where: { id: targetDeptId }
  })
  if (!department) {
    return NextResponse.json({ error: 'Khoa phòng không tồn tại' }, { status: 400 })
  }
  if (department.isTotal) {
    return NextResponse.json({ error: 'Không thể thêm nhân viên vào khoa tổng hợp (TỔNG)' }, { status: 400 })
  }

  // Kiểm tra trùng mã nhân viên
  const existingCode = await prisma.employee.findUnique({
    where: { code }
  })
  if (existingCode) {
    return NextResponse.json(
      { error: `Mã nhân viên "${code}" đã tồn tại trong hệ thống` },
      { status: 400 }
    )
  }

  const newEmployee = await prisma.employee.create({
    data: {
      code,
      name,
      title,
      departmentId: targetDeptId,
      isActive: true
    }
  })

  return NextResponse.json(
    { employee: newEmployee, message: `Thêm nhân viên "${name}" thành công` },
    { status: 201 }
  )
}
