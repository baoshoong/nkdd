import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'

type RouteParams = { params: Promise<{ id: string }> }

const groupInclude = {
  group: {
    select: { id: true, name: true, sortOrder: true },
  },
} as const

// PUT /api/admin/indicators/[id] - Cập nhật chỉ số
const updateIndicatorSchema = z.object({
  code: z.string().min(1, 'Mã chỉ số không được để trống').max(50, 'Mã chỉ số tối đa 50 ký tự').optional(),
  name: z.string().min(1, 'Tên chỉ số không được để trống').max(200, 'Tên chỉ số tối đa 200 ký tự').optional(),
  groupId: z.number().int('groupId phải là số nguyên').positive('groupId phải là số dương').optional(),
  isActive: z.boolean().optional(),
})

export async function PUT(request: Request, { params }: RouteParams) {
  let code = ''
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Chỉ ADMIN mới có quyền chỉnh sửa chỉ số' }, { status: 403 })
    }

    const { id: idStr } = await params
    const id = parseInt(idStr, 10)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 })
    }

    const body = await request.json()
    const parsed = updateIndicatorSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const data = parsed.data
    if (data.code !== undefined) code = data.code

    // Kiểm tra có ít nhất một trường cần cập nhật
    if (data.code === undefined && data.name === undefined && data.groupId === undefined && data.isActive === undefined) {
      return NextResponse.json({ error: 'Cần ít nhất một trường để cập nhật' }, { status: 400 })
    }

    // Kiểm tra chỉ số tồn tại
    const existing = await prisma.indicator.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: `Chỉ số với ID ${id} không tồn tại` }, { status: 404 })
    }

    // Nếu có groupId, kiểm tra nhóm tồn tại
    if (data.groupId !== undefined) {
      const group = await prisma.indicatorGroup.findUnique({ where: { id: data.groupId } })
      if (!group) {
        return NextResponse.json({ error: `Nhóm chỉ số với ID ${data.groupId} không tồn tại` }, { status: 400 })
      }
    }

    const updatedIndicator = await prisma.indicator.update({
      where: { id },
      data,
      include: groupInclude,
    })

    return NextResponse.json({ data: updatedIndicator })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: `Mã chỉ số "${code}" đã tồn tại` },
        { status: 400 }
      )
    }
    console.error('PUT /api/admin/indicators/[id] error:', error)
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 })
  }
}

// DELETE /api/admin/indicators/[id] - Xóa chỉ số
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Chỉ ADMIN mới có quyền xóa chỉ số' }, { status: 403 })
    }

    const { id: idStr } = await params
    const id = parseInt(idStr, 10)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 })
    }

    // Kiểm tra chỉ số tồn tại
    const existing = await prisma.indicator.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: `Chỉ số với ID ${id} không tồn tại` }, { status: 404 })
    }

    // Kiểm tra ràng buộc khóa ngoại
    const [rvCount, ipCount] = await Promise.all([
      prisma.reportValue.count({ where: { indicatorId: id } }),
      prisma.indicatorPermission.count({ where: { indicatorId: id } }),
    ])

    if (rvCount > 0) {
      return NextResponse.json(
        { error: `Không thể xóa chỉ số đang có ${rvCount} bản ghi dữ liệu báo cáo. Hãy ẩn (tắt hoạt động) thay thế.` },
        { status: 400 }
      )
    }

    if (ipCount > 0) {
      // Xóa permissions trước, rồi xóa indicator trong transaction
      await prisma.$transaction([
        prisma.indicatorPermission.deleteMany({ where: { indicatorId: id } }),
        prisma.indicator.delete({ where: { id } }),
      ])
    } else {
      await prisma.indicator.delete({ where: { id } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/admin/indicators/[id] error:', error)
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 })
  }
}
