import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'

// POST /api/admin/departments - Tạo khoa phòng mới
const createDepartmentSchema = z.object({
  code: z.string().min(1, 'Mã khoa phòng không được để trống').max(20, 'Mã khoa phòng tối đa 20 ký tự'),
  name: z.string().min(1, 'Tên khoa phòng không được để trống').max(100, 'Tên khoa phòng tối đa 100 ký tự'),
  isTotal: z.boolean().optional().default(false),
})

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Chỉ ADMIN mới có quyền tạo khoa phòng' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = createDepartmentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { code, name, isTotal } = parsed.data

    // Tính sortOrder tự động
    const maxSort = await prisma.department.aggregate({
      _max: { sortOrder: true },
    })
    const sortOrder = (maxSort._max.sortOrder ?? -1) + 1

    const newDepartment = await prisma.department.create({
      data: { code, name, isTotal, sortOrder },
      select: {
        id: true,
        code: true,
        name: true,
        isTotal: true,
        sortOrder: true,
        isActive: true,
      }
    })

    return NextResponse.json({ data: newDepartment }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const body = await request.clone().json().catch(() => ({}))
      return NextResponse.json(
        { error: `Mã khoa phòng "${body.code ?? ''}" đã tồn tại` },
        { status: 400 }
      )
    }
    console.error('POST /api/admin/departments error:', error)
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ' }, { status: 500 })
  }
}
