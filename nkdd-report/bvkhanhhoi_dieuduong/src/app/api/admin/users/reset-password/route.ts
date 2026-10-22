import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiResetPasswordSchema } from '@/lib/schemas/auth-user-schemas'

export async function POST(request: Request) {
  // 1. Kiểm tra session và quyền ADMIN
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Chỉ Quản trị viên (ADMIN) mới có quyền đặt lại mật khẩu' },
      { status: 403 }
    )
  }

  // 2. Parse & Validate request body
  let bodyJson: unknown
  try {
    bodyJson = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dữ liệu JSON không hợp lệ' }, { status: 400 })
  }

  const parseResult = apiResetPasswordSchema.safeParse(bodyJson)
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]?.message || 'Dữ liệu không hợp lệ'
    return NextResponse.json({ error: firstError }, { status: 400 })
  }

  const { userId, newPassword } = parseResult.data

  // 3. Tìm tài khoản người dùng cần đặt lại mật khẩu
  const targetUser = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!targetUser) {
    return NextResponse.json(
      { error: 'Không tìm thấy tài khoản người dùng được chỉ định' },
      { status: 404 }
    )
  }

  // 4. Mã hoá mật khẩu mới và cập nhật
  const hashedPassword = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword }
  })

  return NextResponse.json({
    success: true,
    message: `Đã đặt lại mật khẩu thành công cho tài khoản "${targetUser.username}"`
  })
}
