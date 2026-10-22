import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

const updateEmployeeSchema = z.object({
  code: z.string().trim().min(1, 'Mã nhân viên không được để trống').max(50).optional(),
  name: z.string().trim().min(1, 'Họ tên không được để trống').max(100).optional(),
  title: z.string().trim().min(1, 'Chức danh không được để trống').max(100).optional(),
  isActive: z.boolean().optional(),
  resignedAt: z.string().nullable().optional(),
  departmentId: z.number().int().positive().optional()
})

// PUT /api/attendance/employees/[id]
export async function PUT(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }

  const user = session.user
  if (user.role === 'BGD') {
    return NextResponse.json(
      { error: 'Ban Giám Đốc chỉ có quyền xem, không được cập nhật nhân viên' },
      { status: 403 }
    )
  }

  const { id: idStr } = await params
  const employeeId = parseInt(idStr, 10)
  if (isNaN(employeeId) || employeeId <= 0) {
    return NextResponse.json({ error: 'ID nhân viên không hợp lệ' }, { status: 400 })
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId }
  })
  if (!employee) {
    return NextResponse.json({ error: 'Không tìm thấy nhân viên' }, { status: 404 })
  }

  if (user.role === 'KHOA_USER') {
    if (!user.departmentId || employee.departmentId !== user.departmentId) {
      return NextResponse.json(
        { error: 'Bạn không có quyền sửa thông tin nhân viên khoa phòng khác' },
        { status: 403 }
      )
    }
  }

  let bodyJson: unknown
  try {
    bodyJson = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON không hợp lệ' }, { status: 400 })
  }

  const parseResult = updateEmployeeSchema.safeParse(bodyJson)
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Dữ liệu không hợp lệ', details: parseResult.error.flatten() },
      { status: 400 }
    )
  }

  const data = parseResult.data

  // Kiểm tra trùng mã nhân viên nếu mã thay đổi
  if (data.code && data.code !== employee.code) {
    const existing = await prisma.employee.findUnique({
      where: { code: data.code }
    })
    if (existing && existing.id !== employeeId) {
      return NextResponse.json(
        { error: `Mã nhân viên "${data.code}" đã được sử dụng bởi nhân sự khác` },
        { status: 400 }
      )
    }
  }

  // Nếu chuyển khoa, chỉ ADMIN được phép
  let newDeptId = employee.departmentId
  if (data.departmentId && data.departmentId !== employee.departmentId) {
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Chỉ Quản trị viên (ADMIN) mới có quyền điều chuyển khoa phòng nhân viên' },
        { status: 403 }
      )
    }
    const dept = await prisma.department.findUnique({ where: { id: data.departmentId } })
    if (!dept || dept.isTotal) {
      return NextResponse.json({ error: 'Khoa phòng đích không hợp lệ' }, { status: 400 })
    }
    newDeptId = data.departmentId
  }

  let resignedAtValue: Date | null | undefined = undefined
  if (data.isActive === true) {
    resignedAtValue = null
  } else if (data.isActive === false) {
    resignedAtValue = data.resignedAt ? new Date(data.resignedAt) : new Date()
  } else if (data.resignedAt !== undefined) {
    resignedAtValue = data.resignedAt ? new Date(data.resignedAt) : null
  }

  const updatedEmployee = await prisma.employee.update({
    where: { id: employeeId },
    data: {
      ...(data.code ? { code: data.code } : {}),
      ...(data.name ? { name: data.name } : {}),
      ...(data.title ? { title: data.title } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(resignedAtValue !== undefined ? { resignedAt: resignedAtValue } : {}),
      departmentId: newDeptId
    }
  })

  return NextResponse.json({
    success: true,
    employee: updatedEmployee,
    message: `Đã cập nhật nhân sự "${updatedEmployee.name}" thành công`
  })
}

// DELETE /api/attendance/employees/[id]
export async function DELETE(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }

  const user = session.user
  if (user.role === 'BGD') {
    return NextResponse.json(
      { error: 'Ban Giám Đốc chỉ có quyền xem, không được xóa nhân viên' },
      { status: 403 }
    )
  }

  const { id: idStr } = await params
  const employeeId = parseInt(idStr, 10)
  if (isNaN(employeeId) || employeeId <= 0) {
    return NextResponse.json({ error: 'ID nhân viên không hợp lệ' }, { status: 400 })
  }

  // Tìm nhân viên
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId }
  })
  if (!employee) {
    return NextResponse.json({ error: 'Không tìm thấy nhân viên' }, { status: 404 })
  }

  // Kiểm tra quyền theo khoa
  if (user.role === 'KHOA_USER') {
    if (!user.departmentId || employee.departmentId !== user.departmentId) {
      return NextResponse.json(
        { error: 'Bạn không có quyền xóa nhân viên thuộc khoa phòng khác' },
        { status: 403 }
      )
    }
  }

  // Kiểm tra xem nhân viên đã có bản ghi chấm công nào chưa
  const recordCount = await prisma.attendanceRecord.count({
    where: { employeeId }
  })

  const { searchParams } = new URL(request.url)
  const resignedAtParam = searchParams.get('resignedAt')
  const resignedAt = resignedAtParam ? new Date(resignedAtParam) : new Date()

  if (recordCount > 0) {
    // Soft delete: chuyển isActive = false và gán resignedAt
    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        isActive: false,
        resignedAt: employee.resignedAt || resignedAt
      }
    })

    return NextResponse.json({
      success: true,
      isSoftDeleted: true,
      message: `Nhân viên "${employee.name}" đã có ${recordCount} bản ghi chấm công, đã chuyển sang trạng thái đã nghỉ việc.`
    })
  }

  // Hard delete: chưa có công nào
  await prisma.employee.delete({
    where: { id: employeeId }
  })

  return NextResponse.json({
    success: true,
    isSoftDeleted: false,
    message: `Đã xóa nhân viên "${employee.name}" vĩnh viễn khỏi hệ thống.`
  })
}
