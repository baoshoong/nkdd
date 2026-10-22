import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

const updateRecordsSchema = z.object({
  records: z.array(
    z.object({
      employeeId: z.number().int().positive(),
      day: z.number().int().min(1).max(31),
      status: z.enum([
        'PRESENT',
        'BUSINESS_TRIP',
        'STUDY',
        'LEAVE',
        'SICK',
        'MATERNITY',
        'ABSENT'
      ]),
      note: z.string().trim().max(255).optional().nullable()
    })
  )
})

// PUT /api/attendance/sheets/[id]/records
export async function PUT(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }

  const user = session.user
  if (user.role === 'BGD') {
    return NextResponse.json(
      { error: 'Ban Giám Đốc chỉ có quyền xem, không được chỉnh sửa bảng chấm công' },
      { status: 403 }
    )
  }

  const { id: idStr } = await params
  const sheetId = parseInt(idStr, 10)
  if (isNaN(sheetId) || sheetId <= 0) {
    return NextResponse.json({ error: 'ID bảng chấm công không hợp lệ' }, { status: 400 })
  }

  // 1. Tìm bảng chấm công
  const sheet = await prisma.attendanceSheet.findUnique({
    where: { id: sheetId }
  })
  if (!sheet) {
    return NextResponse.json({ error: 'Không tìm thấy bảng chấm công' }, { status: 404 })
  }

  // 2. Kiểm tra trạng thái khoá
  if (sheet.status === 'LOCKED' && user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Bảng chấm công kỳ này đã bị khoá, không thể chỉnh sửa' },
      { status: 403 }
    )
  }

  // 3. Kiểm tra phân quyền khoa
  if (user.role === 'KHOA_USER') {
    if (!user.departmentId || sheet.departmentId !== user.departmentId) {
      return NextResponse.json(
        { error: 'Bạn không có quyền chỉnh sửa bảng chấm công của khoa phòng khác' },
        { status: 403 }
      )
    }
  }

  // 4. Validate body JSON
  let bodyJson: unknown
  try {
    bodyJson = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON không hợp lệ' }, { status: 400 })
  }

  const parseResult = updateRecordsSchema.safeParse(bodyJson)
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Dữ liệu không hợp lệ', details: parseResult.error.flatten() },
      { status: 400 }
    )
  }

  const { records } = parseResult.data

  // 5. Kiểm tra nhân viên thuộc đúng khoa của sheet
  const employeeIds = [...new Set(records.map((r) => r.employeeId))]
  if (employeeIds.length > 0) {
    const validEmployees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
        departmentId: sheet.departmentId
      },
      select: { id: true }
    })
    const validEmpIdSet = new Set(validEmployees.map((e) => e.id))
    const invalidEmpIds = employeeIds.filter((id) => !validEmpIdSet.has(id))

    if (invalidEmpIds.length > 0) {
      return NextResponse.json(
        { error: `Tồn tại nhân viên không thuộc khoa phòng của bảng chấm công này: [${invalidEmpIds.join(', ')}]` },
        { status: 400 }
      )
    }
  }

  // 6. Xử lý cập nhật & ghi nhận Audit Log
  const currentUserId = parseInt(user.id, 10)
  let updatedCount = 0

  await prisma.$transaction(async (tx) => {
    for (const rec of records) {
      const existing = await tx.attendanceRecord.findUnique({
        where: {
          sheetId_employeeId_day: {
            sheetId,
            employeeId: rec.employeeId,
            day: rec.day
          }
        }
      })

      const oldStatus = existing ? existing.status : 'PRESENT'
      const newStatus = rec.status

      if (oldStatus !== newStatus || (existing && existing.note !== (rec.note ?? null))) {
        // Cập nhật hoặc thêm mới record
        await tx.attendanceRecord.upsert({
          where: {
            sheetId_employeeId_day: {
              sheetId,
              employeeId: rec.employeeId,
              day: rec.day
            }
          },
          update: {
            status: newStatus,
            note: rec.note ?? null
          },
          create: {
            sheetId,
            employeeId: rec.employeeId,
            day: rec.day,
            status: newStatus,
            note: rec.note ?? null
          }
        })

        // Ghi nhận Audit Log nếu trạng thái thay đổi
        if (oldStatus !== newStatus) {
          await tx.attendanceAudit.create({
            data: {
              sheetId,
              employeeId: rec.employeeId,
              day: rec.day,
              oldStatus,
              newStatus,
              userId: currentUserId
            }
          })
        }

        updatedCount++
      }
    }
  })

  return NextResponse.json({
    success: true,
    updatedCount,
    message: `Đã lưu thành công ${updatedCount} thay đổi bảng chấm công.`
  })
}
