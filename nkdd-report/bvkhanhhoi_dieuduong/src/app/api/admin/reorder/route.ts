import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const reorderSchema = z.object({
  model: z.enum(['indicator', 'department', 'indicatorGroup']),
  orderedIds: z.array(z.number().int().positive()).min(1)
})

async function executeReorder(model: string, orderedIds: number[]) {
  switch (model) {
    case 'indicator':
      return prisma.$transaction(
        orderedIds.map((id, i) => prisma.indicator.update({ where: { id }, data: { sortOrder: i } }))
      )
    case 'department':
      return prisma.$transaction(
        orderedIds.map((id, i) => prisma.department.update({ where: { id }, data: { sortOrder: i } }))
      )
    case 'indicatorGroup':
      return prisma.$transaction(
        orderedIds.map((id, i) => prisma.indicatorGroup.update({ where: { id }, data: { sortOrder: i } }))
      )
    default:
      throw new Error('Model không hợp lệ')
  }
}

// PUT /api/admin/reorder - Cập nhật thứ tự sắp xếp
export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN' && session.user.role !== 'BGD') {
    return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dữ liệu JSON không hợp lệ' }, { status: 400 })
  }

  const parseResult = reorderSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Dữ liệu không hợp lệ', details: parseResult.error.flatten() },
      { status: 400 }
    )
  }

  const { model, orderedIds } = parseResult.data

  try {
    const updates = executeReorder(model, orderedIds)
    await updates

    return NextResponse.json({ success: true, count: orderedIds.length })
  } catch (err) {
    console.error('Lỗi khi cập nhật thứ tự:', err)
    return NextResponse.json(
      { error: 'Lỗi khi cập nhật thứ tự' },
      { status: 500 }
    )
  }
}
