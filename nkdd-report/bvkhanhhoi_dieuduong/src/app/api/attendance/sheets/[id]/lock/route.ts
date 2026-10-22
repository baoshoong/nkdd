import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/attendance/sheets/[id]/lock
export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }

  const user = session.user
  if (user.role === 'BGD') {
    return NextResponse.json(
      { error: 'Ban Giám Đốc chỉ có quyền xem, không được khoá sổ' },
      { status: 403 }
    )
  }

  const { id: idStr } = await params
  const sheetId = parseInt(idStr, 10)
  if (isNaN(sheetId) || sheetId <= 0) {
    return NextResponse.json({ error: 'ID bảng chấm công không hợp lệ' }, { status: 400 })
  }

  const sheet = await prisma.attendanceSheet.findUnique({
    where: { id: sheetId }
  })
  if (!sheet) {
    return NextResponse.json({ error: 'Không tìm thấy bảng chấm công' }, { status: 404 })
  }

  if (user.role === 'KHOA_USER') {
    if (!user.departmentId || sheet.departmentId !== user.departmentId) {
      return NextResponse.json(
        { error: 'Bạn không có quyền khoá sổ bảng chấm công của khoa phòng khác' },
        { status: 403 }
      )
    }
  }

  if (sheet.status === 'LOCKED') {
    return NextResponse.json({ error: 'Bảng chấm công này đã được khoá từ trước' }, { status: 400 })
  }

  const updatedSheet = await prisma.attendanceSheet.update({
    where: { id: sheetId },
    data: {
      status: 'LOCKED',
      lockedAt: new Date(),
      lockedById: parseInt(user.id, 10)
    },
    include: {
      lockedBy: {
        select: { id: true, name: true, role: true }
      }
    }
  })

  return NextResponse.json({
    success: true,
    sheet: updatedSheet,
    message: `Đã khoá sổ bảng chấm công tháng ${sheet.month}/${sheet.year} thành công.`
  })
}
