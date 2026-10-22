import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'

// GET /api/admin/indicators - Lấy danh sách chỉ số cho Admin/BGĐ
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN' && session.user.role !== 'BGD') {
    return NextResponse.json({ error: 'Chỉ ADMIN hoặc BGĐ mới có quyền truy cập' }, { status: 403 })
  }

  const indicators = await prisma.indicator.findMany({
    orderBy: [
      { group: { sortOrder: 'asc' } },
      { sortOrder: 'asc' }
    ],
    select: {
      id: true,
      code: true,
      name: true,
      sortOrder: true,
      isActive: true,
      groupId: true,
      group: {
        select: {
          id: true,
          name: true,
          sortOrder: true
        }
      }
    }
  })

  return NextResponse.json({ data: indicators })
}

// POST /api/admin/indicators - Tạo chỉ số mới
const createIndicatorSchema = z.object({
  code: z.string().min(1, 'Mã chỉ số không được để trống').max(50, 'Mã chỉ số tối đa 50 ký tự'),
  name: z.string().min(1, 'Tên chỉ số không được để trống').max(200, 'Tên chỉ số tối đa 200 ký tự'),
  groupId: z.number().int('groupId phải là số nguyên').positive('groupId phải là số dương'),
})

export async function POST(request: Request) {
  let code = ''
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Chỉ ADMIN mới có quyền tạo chỉ số' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createIndicatorSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { name, groupId } = parsed.data
    code = parsed.data.code

    // Kiểm tra nhóm chỉ số tồn tại
    const group = await prisma.indicatorGroup.findUnique({ where: { id: groupId } })
    if (!group) {
      return NextResponse.json({ error: `Nhóm chỉ số với ID ${groupId} không tồn tại` }, { status: 400 })
    }

    // Tính sortOrder tự động
    const maxSort = await prisma.indicator.aggregate({
      where: { groupId },
      _max: { sortOrder: true },
    })
    const sortOrder = (maxSort._max.sortOrder ?? -1) + 1

    const newIndicator = await prisma.indicator.create({
      data: { code, name, groupId, sortOrder },
      include: {
        group: {
          select: { id: true, name: true, sortOrder: true },
        },
      },
    })

    return NextResponse.json({ data: newIndicator }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: `Mã chỉ số "${code}" đã tồn tại` },
        { status: 400 }
      )
    }
    console.error('POST /api/admin/indicators error:', error)
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 })
  }
}
