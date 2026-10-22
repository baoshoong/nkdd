import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'

// GET /api/admin/indicator-groups - Lấy danh sách nhóm chỉ số cho Admin/BGĐ
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN' && session.user.role !== 'BGD') {
    return NextResponse.json({ error: 'Chỉ ADMIN hoặc BGĐ mới có quyền truy cập' }, { status: 403 })
  }

  const groups = await prisma.indicatorGroup.findMany({
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      sortOrder: true,
      _count: {
        select: { indicators: true }
      }
    }
  })

  return NextResponse.json({ data: groups })
}

// POST /api/admin/indicator-groups - Tạo nhóm chỉ số mới
const createGroupSchema = z.object({
  name: z.string().min(1, 'Tên nhóm không được để trống').max(100, 'Tên nhóm tối đa 100 ký tự'),
})

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Chỉ ADMIN mới có quyền tạo nhóm chỉ số' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createGroupSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { name } = parsed.data

    // Tính sortOrder tự động
    const maxSort = await prisma.indicatorGroup.aggregate({
      _max: { sortOrder: true },
    })
    const sortOrder = (maxSort._max.sortOrder ?? -1) + 1

    const newGroup = await prisma.indicatorGroup.create({
      data: { name, sortOrder },
      select: {
        id: true,
        name: true,
        sortOrder: true,
        _count: {
          select: { indicators: true }
        }
      }
    })

    return NextResponse.json({ data: newGroup }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const body = await request.clone().json().catch(() => ({}))
      return NextResponse.json(
        { error: `Tên nhóm "${body.name ?? ''}" đã tồn tại` },
        { status: 400 }
      )
    }
    console.error('POST /api/admin/indicator-groups error:', error)
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 })
  }
}
