import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'

type RouteParams = { params: Promise<{ id: string }> }

// PUT /api/admin/indicator-groups/[id] - Cập nhật nhóm chỉ số
const updateGroupSchema = z.object({
  name: z.string().min(1, 'Tên nhóm không được để trống').max(100, 'Tên nhóm tối đa 100 ký tự'),
})

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Chỉ ADMIN mới có quyền cập nhật nhóm chỉ số' }, { status: 403 })
    }

    const { id: idStr } = await params
    const id = parseInt(idStr, 10)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 })
    }

    const body = await request.json()
    const parsed = updateGroupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { name } = parsed.data

    // Kiểm tra nhóm tồn tại
    const existing = await prisma.indicatorGroup.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Nhóm chỉ số không tồn tại' }, { status: 404 })
    }

    const updatedGroup = await prisma.indicatorGroup.update({
      where: { id },
      data: { name },
      select: {
        id: true,
        name: true,
        sortOrder: true,
        _count: {
          select: { indicators: true }
        }
      }
    })

    return NextResponse.json({ data: updatedGroup })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const body = await request.clone().json().catch(() => ({}))
      return NextResponse.json(
        { error: `Tên nhóm "${body.name ?? ''}" đã tồn tại` },
        { status: 400 }
      )
    }
    console.error('PUT /api/admin/indicator-groups/[id] error:', error)
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 })
  }
}

// DELETE /api/admin/indicator-groups/[id] - Xóa nhóm chỉ số
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Chỉ ADMIN mới có quyền xóa nhóm chỉ số' }, { status: 403 })
    }

    const { id: idStr } = await params
    const id = parseInt(idStr, 10)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 })
    }

    // Kiểm tra nhóm tồn tại
    const existing = await prisma.indicatorGroup.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Nhóm chỉ số không tồn tại' }, { status: 404 })
    }

    // Kiểm tra có chỉ số nào thuộc nhóm không
    const count = await prisma.indicator.count({ where: { groupId: id } })
    if (count > 0) {
      return NextResponse.json(
        { error: `Không thể xóa nhóm đang chứa ${count} chỉ số. Hãy chuyển hoặc xóa các chỉ số trước.` },
        { status: 400 }
      )
    }

    await prisma.indicatorGroup.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/admin/indicator-groups/[id] error:', error)
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 })
  }
}
