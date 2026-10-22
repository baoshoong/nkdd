import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(30),
  reportDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  userId: z.coerce.number().int().positive().optional(),
  indicatorId: z.coerce.number().int().positive().optional(),
  order: z.enum(['asc', 'desc']).default('desc')
})

export async function GET(request: Request) {
  // 1. Kiểm tra session và quyền ADMIN/BGD
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN' && session.user.role !== 'BGD') {
    return NextResponse.json(
      { error: 'Chỉ ADMIN hoặc BGD mới có quyền xem lịch sử' },
      { status: 403 }
    )
  }

  // 2. Validate query params bằng Zod
  const url = new URL(request.url)
  const rawParams = {
    page: url.searchParams.get('page') || undefined,
    limit: url.searchParams.get('limit') || undefined,
    reportDate: url.searchParams.get('reportDate') || undefined,
    departmentId: url.searchParams.get('departmentId') || undefined,
    userId: url.searchParams.get('userId') || undefined,
    indicatorId: url.searchParams.get('indicatorId') || undefined,
    order: url.searchParams.get('order') || undefined
  }

  const parseResult = querySchema.safeParse(rawParams)
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Tham số bộ lọc không hợp lệ', details: parseResult.error.flatten() },
      { status: 400 }
    )
  }

  const { page, limit, reportDate, departmentId, userId, indicatorId, order } =
    parseResult.data
  const skip = (page - 1) * limit
  const take = limit

  // 3. Xây dựng điều kiện lọc linh hoạt
  const where: {
    reportDate?: Date
    departmentId?: number
    userId?: number
    indicatorId?: number
  } = {}

  if (reportDate) {
    where.reportDate = new Date(`${reportDate}T00:00:00.000Z`)
  }
  if (departmentId) {
    where.departmentId = departmentId
  }
  if (userId) {
    where.userId = userId
  }
  if (indicatorId) {
    where.indicatorId = indicatorId
  }

  // 4. Đếm tổng số bản ghi và lấy trang tương ứng
  const [total, logs, departments, indicators, users] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: order }
    }),
    prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, isTotal: true },
      orderBy: { sortOrder: 'asc' }
    }),
    prisma.indicator.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { sortOrder: 'asc' }
    }),
    prisma.user.findMany({
      select: { id: true, username: true, name: true },
      orderBy: { name: 'asc' }
    })
  ])

  const deptMap = new Map(departments.map((d) => [d.id, d]))
  const indMap = new Map(indicators.map((i) => [i.id, i]))
  const userMap = new Map(users.map((u) => [u.id, u]))

  const data = logs.map((log) => {
    const dept = deptMap.get(log.departmentId)
    const ind = indMap.get(log.indicatorId)
    const user = userMap.get(log.userId)

    return {
      id: log.id,
      reportDate: log.reportDate.toISOString().split('T')[0],
      departmentId: log.departmentId,
      departmentCode: dept?.code || `ID_${log.departmentId}`,
      departmentName: dept?.name || `Khoa #${log.departmentId}`,
      indicatorId: log.indicatorId,
      indicatorName: ind?.name || `Chỉ số #${log.indicatorId}`,
      userId: log.userId,
      userName: user?.name || user?.username || `User #${log.userId}`,
      oldValue: log.oldValue,
      newValue: log.newValue,
      createdAt: log.createdAt.toISOString()
    }
  })

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    },
    filters: {
      departments,
      indicators,
      users
    }
  })
}
