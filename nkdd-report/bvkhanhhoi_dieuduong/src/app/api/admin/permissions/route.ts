import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const itemSchema = z.object({
  indicatorId: z.number().int(),
  canEdit: z.boolean()
})

const singleDeptSchema = z.object({
  departmentId: z.number().int(),
  items: z.array(itemSchema)
})

const batchDeptSchema = z.object({
  batch: z.array(singleDeptSchema)
})

const postPermissionsSchema = z.union([singleDeptSchema, batchDeptSchema])

// GET /api/admin/permissions - Lấy ma trận phân quyền cho Admin
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Chỉ ADMIN mới có quyền truy cập' }, { status: 403 })
  }

  const [departments, indicators, permissions] = await Promise.all([
    prisma.department.findMany({
      where: { isActive: true, isTotal: false },
      orderBy: { sortOrder: 'asc' }
    }),
    prisma.indicator.findMany({
      where: { isActive: true },
      include: { group: true },
      orderBy: [
        { group: { sortOrder: 'asc' } },
        { sortOrder: 'asc' }
      ]
    }),
    prisma.indicatorPermission.findMany()
  ])

  // Xây dựng ma trận [deptId][indId] = true/false
  const matrix: Record<number, Record<number, boolean>> = {}
  for (const dept of departments) {
    matrix[dept.id] = {}
    for (const ind of indicators) {
      matrix[dept.id][ind.id] = false
    }
  }

  for (const perm of permissions) {
    if (matrix[perm.departmentId] && matrix[perm.departmentId][perm.indicatorId] !== undefined) {
      matrix[perm.departmentId][perm.indicatorId] = perm.canEdit
    }
  }

  return NextResponse.json({
    departments: departments.map((d) => ({
      id: d.id,
      code: d.code,
      name: d.name
    })),
    indicators: indicators.map((ind) => ({
      id: ind.id,
      code: ind.code,
      name: ind.name,
      groupName: ind.group.name,
      groupId: ind.groupId
    })),
    matrix
  })
}

// POST /api/admin/permissions - Cập nhật phân quyền chỉ số theo khoa (hỗ trợ đơn lẻ hoặc hàng loạt)
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Chỉ ADMIN mới có quyền truy cập' }, { status: 403 })
  }

  let bodyJson: unknown
  try {
    bodyJson = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON không hợp lệ' }, { status: 400 })
  }

  const parseResult = postPermissionsSchema.safeParse(bodyJson)
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Dữ liệu không hợp lệ', details: parseResult.error.flatten() },
      { status: 400 }
    )
  }

  const updateList: Array<{ departmentId: number; items: Array<{ indicatorId: number; canEdit: boolean }> }> =
    'batch' in parseResult.data ? parseResult.data.batch : [parseResult.data]

  if (updateList.length === 0) {
    return NextResponse.json({ error: 'Danh sách cập nhật trống' }, { status: 400 })
  }

  // 1. Kiểm tra toàn vẹn các departmentId
  const deptIds = [...new Set(updateList.map((u) => u.departmentId))]
  const validDepts = await prisma.department.findMany({
    where: { id: { in: deptIds } }
  })
  const deptMap = new Map(validDepts.map((d) => [d.id, d]))

  for (const deptId of deptIds) {
    const dept = deptMap.get(deptId)
    if (!dept) {
      return NextResponse.json(
        { error: `Khoa phòng với ID ${deptId} không tồn tại trong hệ thống` },
        { status: 400 }
      )
    }
    if (dept.isTotal) {
      return NextResponse.json(
        { error: `Không thể phân quyền cho khoa tổng hợp (${dept.code} - ${dept.name})` },
        { status: 400 }
      )
    }
    if (!dept.isActive) {
      return NextResponse.json(
        { error: `Khoa phòng "${dept.name}" hiện đang bị tạm khóa / ngừng hoạt động` },
        { status: 400 }
      )
    }
  }

  // 2. Thu thập và kiểm tra toàn vẹn các indicatorId
  const allIndicatorIds = new Set<number>()
  for (const u of updateList) {
    for (const item of u.items) {
      allIndicatorIds.add(item.indicatorId)
    }
  }

  const validIndicators = await prisma.indicator.findMany({
    where: {
      id: { in: Array.from(allIndicatorIds) },
      isActive: true
    },
    select: { id: true }
  })
  const validIndicatorIdSet = new Set(validIndicators.map((i) => i.id))

  // 3. Thực thi transaction an toàn
  try {
    let totalAssigned = 0

    await prisma.$transaction(async (tx) => {
      for (const updateItem of updateList) {
        const { departmentId, items } = updateItem

        // Xóa phân quyền cũ của khoa
        await tx.indicatorPermission.deleteMany({
          where: { departmentId }
        })

        // Loại bỏ trùng lặp indicatorId và chỉ giữ indicator hợp lệ
        const uniqueItemsMap = new Map<number, boolean>()
        for (const item of items) {
          if (validIndicatorIdSet.has(item.indicatorId)) {
            uniqueItemsMap.set(item.indicatorId, item.canEdit)
          }
        }

        const canEditItems: Array<{ departmentId: number; indicatorId: number; canEdit: boolean }> = []
        for (const [indId, canEdit] of uniqueItemsMap.entries()) {
          if (canEdit) {
            canEditItems.push({
              departmentId,
              indicatorId: indId,
              canEdit: true
            })
          }
        }

        if (canEditItems.length > 0) {
          await tx.indicatorPermission.createMany({
            data: canEditItems
          })
          totalAssigned += canEditItems.length
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật phân quyền thành công (${updateList.length} khoa phòng)`,
      totalCount: totalAssigned
    })
  } catch (err) {
    console.error('Lỗi khi lưu phân quyền:', err)
    return NextResponse.json(
      { error: 'Lỗi khi cập nhật cơ sở dữ liệu. Vui lòng kiểm tra lại ràng buộc dữ liệu.' },
      { status: 500 }
    )
  }
}
