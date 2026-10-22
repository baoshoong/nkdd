import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'

type RouteParams = { params: Promise<{ id: string }> }

// PUT /api/admin/departments/[id] - Cập nhật khoa phòng
const updateDepartmentSchema = z.object({
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(100).optional(),
  isTotal: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Chỉ ADMIN mới có quyền cập nhật khoa phòng' }, { status: 403 })
    }

    const { id: idStr } = await params
    const id = parseInt(idStr, 10)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 })
    }

    const body = await request.json()
    const parsed = updateDepartmentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { code, name, isTotal, isActive } = parsed.data

    // Kiểm tra khoa phòng tồn tại
    const existing = await prisma.department.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Khoa phòng không tồn tại' }, { status: 404 })
    }

    // Nếu có code mới, kiểm tra trùng lặp (ngoại trừ chính mình)
    if (code) {
      const duplicate = await prisma.department.findFirst({
        where: { code, id: { not: id } },
      })
      if (duplicate) {
        return NextResponse.json(
          { error: `Mã khoa phòng "${code}" đã tồn tại` },
          { status: 400 }
        )
      }
    }

    const updatedDepartment = await prisma.department.update({
      where: { id },
      data: {
        ...(code !== undefined && { code }),
        ...(name !== undefined && { name }),
        ...(isTotal !== undefined && { isTotal }),
        ...(isActive !== undefined && { isActive }),
      },
      select: {
        id: true,
        code: true,
        name: true,
        isTotal: true,
        sortOrder: true,
        isActive: true,
      }
    })

    return NextResponse.json({ data: updatedDepartment })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const body = await request.clone().json().catch(() => ({}))
      return NextResponse.json(
        { error: `Mã khoa phòng "${body.code ?? ''}" đã tồn tại` },
        { status: 400 }
      )
    }
    console.error('PUT /api/admin/departments/[id] error:', error)
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 })
  }
}

// DELETE /api/admin/departments/[id] - Xóa khoa phòng
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Chỉ ADMIN mới có quyền xóa khoa phòng' }, { status: 403 })
    }

    const { id: idStr } = await params
    const id = parseInt(idStr, 10)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 })
    }

    // Kiểm tra khoa phòng tồn tại
    const existing = await prisma.department.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Khoa phòng không tồn tại' }, { status: 404 })
    }

    // Kiểm tra dữ liệu liên quan
    const [userCount, rvCount, empCount, sheetCount] = await Promise.all([
      prisma.user.count({ where: { departmentId: id } }),
      prisma.reportValue.count({ where: { departmentId: id } }),
      prisma.employee.count({ where: { departmentId: id } }),
      prisma.attendanceSheet.count({ where: { departmentId: id } }),
    ])

    if (userCount > 0 || rvCount > 0 || empCount > 0 || sheetCount > 0) {
      const parts: string[] = []
      if (userCount > 0) parts.push(`${userCount} người dùng`)
      if (rvCount > 0) parts.push(`${rvCount} bản ghi báo cáo`)
      if (empCount > 0) parts.push(`${empCount} nhân viên`)
      if (sheetCount > 0) parts.push(`${sheetCount} bảng chấm công`)
      return NextResponse.json(
        { error: `Không thể xóa khoa phòng đang có dữ liệu liên quan (${parts.join(', ')}). Hãy ẩn (tắt hoạt động) thay thế.` },
        { status: 400 }
      )
    }

    // Xóa permissions trước, rồi xóa department trong transaction
    await prisma.$transaction([
      prisma.indicatorPermission.deleteMany({ where: { departmentId: id } }),
      prisma.department.delete({ where: { id } }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/admin/departments/[id] error:', error)
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 })
  }
}
