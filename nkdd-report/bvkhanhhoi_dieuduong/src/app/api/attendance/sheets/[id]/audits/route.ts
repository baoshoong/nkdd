import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/attendance/sheets/[id]/audits
export async function GET(request: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }

  const user = session.user
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
        { error: 'Bạn không có quyền xem nhật ký chỉnh sửa của khoa phòng khác' },
        { status: 403 }
      )
    }
  }

  const audits = await prisma.attendanceAudit.findMany({
    where: { sheetId },
    include: {
      user: {
        select: { id: true, name: true, username: true, role: true }
      },
      employee: {
        select: { id: true, code: true, name: true, title: true }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 200
  })

  return NextResponse.json({ audits })
}
