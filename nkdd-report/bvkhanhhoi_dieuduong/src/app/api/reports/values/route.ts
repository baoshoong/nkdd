import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Schema validate body PUT /api/reports/values
const putValuesSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Sai định dạng ngày YYYY-MM-DD'),
  departmentId: z.number().int().optional(),
  values: z.array(
    z.object({
      indicatorId: z.number().int(),
      value: z.number().min(0, 'Giá trị phải lớn hơn hoặc bằng 0')
    })
  )
})

export async function PUT(request: Request) {
  // 1. Kiểm tra session
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }

  // 2. Validate body bằng Zod
  let bodyJson: unknown
  try {
    bodyJson = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON không hợp lệ' }, { status: 400 })
  }

  const parseResult = putValuesSchema.safeParse(bodyJson)
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Dữ liệu không hợp lệ', details: parseResult.error.flatten() },
      { status: 400 }
    )
  }

  const { date: dateStr, values, departmentId: bodyDeptId } = parseResult.data
  const reportDate = new Date(`${dateStr}T00:00:00.000Z`)
  const user = session.user

  // Xác định departmentId mục tiêu
  let targetDepartmentId: number
  if (user.role === 'KHOA_USER') {
    if (!user.departmentId) {
      return NextResponse.json({ error: 'Tài khoản chưa được gán khoa phòng' }, { status: 403 })
    }
    targetDepartmentId = user.departmentId
  } else if (user.role === 'ADMIN') {
    if (bodyDeptId) {
      targetDepartmentId = bodyDeptId
    } else if (user.departmentId) {
      targetDepartmentId = user.departmentId
    } else {
      return NextResponse.json({ error: 'Vui lòng chọn khoa phòng cần nhập số liệu' }, { status: 400 })
    }
  } else {
    // Role BGD chỉ có quyền xem
    return NextResponse.json({ error: 'Không có quyền chỉnh sửa số liệu' }, { status: 403 })
  }

  // 3. Ràng buộc toàn vẹn khoa phòng mục tiêu (chặn tuyệt đối khoa TỔNG)
  const targetDept = await prisma.department.findUnique({
    where: { id: targetDepartmentId }
  })
  if (!targetDept) {
    return NextResponse.json({ error: 'Khoa phòng không tồn tại' }, { status: 400 })
  }
  if (targetDept.isTotal) {
    return NextResponse.json(
      { error: 'Cột TỔNG là giá trị tự động tổng hợp từ các khoa, không được phép can thiệp trực tiếp' },
      { status: 400 }
    )
  }
  if (!targetDept.isActive) {
    return NextResponse.json({ error: 'Khoa phòng hiện đang bị khóa hoạt động' }, { status: 400 })
  }

  // 4. Kiểm tra trạng thái Report (LOCKED + role != ADMIN -> 403)
  const existingReport = await prisma.report.findUnique({
    where: { reportDate }
  })
  if (existingReport?.status === 'LOCKED' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Báo cáo ngày này đã bị khoá' }, { status: 403 })
  }

  // 5. Ràng buộc toàn vẹn các chỉ số (indicator)
  const uniqueIndicatorIds = [...new Set(values.map((v) => v.indicatorId))]
  const existingIndicators = await prisma.indicator.findMany({
    where: { id: { in: uniqueIndicatorIds }, isActive: true },
    select: { id: true }
  })
  const existingIndicatorIdSet = new Set(existingIndicators.map((i) => i.id))

  const invalidIndicatorIds = uniqueIndicatorIds.filter((id) => !existingIndicatorIdSet.has(id))
  if (invalidIndicatorIds.length > 0) {
    return NextResponse.json(
      { error: `Một hoặc nhiều chỉ số không tồn tại hoặc đã ngừng áp dụng (ID: ${invalidIndicatorIds.join(', ')})` },
      { status: 400 }
    )
  }

  // 6. Role KHOA_USER: kiểm tra quyền từng indicatorId
  if (user.role === 'KHOA_USER') {
    const allowedPermissions = await prisma.indicatorPermission.findMany({
      where: {
        departmentId: targetDepartmentId,
        indicatorId: { in: uniqueIndicatorIds },
        canEdit: true
      }
    })
    const allowedSet = new Set(allowedPermissions.map((p) => p.indicatorId))
    const hasUnauthorized = values.some((v) => !allowedSet.has(v.indicatorId))
    if (hasUnauthorized) {
      return NextResponse.json(
        { error: 'Khoa của bạn không có quyền nhập một hoặc nhiều chỉ số trong danh sách' },
        { status: 403 }
      )
    }
  }

  // 7. Upsert report nếu chưa có
  const report = await prisma.report.upsert({
    where: { reportDate },
    update: {},
    create: {
      reportDate,
      status: 'OPEN'
    }
  })

  // 8. Transaction: với mỗi value -> đọc old value -> upsert ReportValue -> ghi AuditLog nếu đổi
  const userId = Number(user.id) || 0

  await prisma.$transaction(async (tx) => {
    for (const item of values) {
      // Đọc old value
      const oldRecord = await tx.reportValue.findUnique({
        where: {
          reportId_departmentId_indicatorId: {
            reportId: report.id,
            departmentId: targetDepartmentId,
            indicatorId: item.indicatorId
          }
        }
      })

      const oldValue = oldRecord ? oldRecord.value : null

      // Upsert ReportValue
      await tx.reportValue.upsert({
        where: {
          reportId_departmentId_indicatorId: {
            reportId: report.id,
            departmentId: targetDepartmentId,
            indicatorId: item.indicatorId
          }
        },
        update: {
          value: item.value
        },
        create: {
          reportId: report.id,
          departmentId: targetDepartmentId,
          indicatorId: item.indicatorId,
          value: item.value
        }
      })

      // Nếu có sự thay đổi giá trị -> tạo AuditLog
      if (oldValue !== item.value) {
        await tx.auditLog.create({
          data: {
            reportDate,
            departmentId: targetDepartmentId,
            indicatorId: item.indicatorId,
            userId,
            oldValue,
            newValue: item.value
          }
        })
      }
    }
  })

  return NextResponse.json({ success: true, count: values.length })
}
