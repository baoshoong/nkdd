import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/attendance/sheets/[id]/unlock (ADMIN ONLY)
export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }

  const user = session.user
  // Yêu cầu nghiệp vụ cốt lõi: Chỉ admin mở khoá (trưởng khoa không tự mở)
  if (user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Chỉ Quản trị viên (ADMIN) mới có quyền mở khoá bảng chấm công' },
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

  if (sheet.status === 'OPEN') {
    return NextResponse.json({ error: 'Bảng chấm công này hiện đang mở, không cần mở khoá' }, { status: 400 })
  }

  const updatedSheet = await prisma.attendanceSheet.update({
    where: { id: sheetId },
    data: {
      status: 'OPEN',
      lockedAt: null,
      lockedById: null
    }
  })

  return NextResponse.json({
    success: true,
    sheet: updatedSheet,
    message: `Đã mở khoá bảng chấm công tháng ${sheet.month}/${sheet.year} thành công.`
  })
}
