import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { changePasswordSchema } from '@/lib/schemas/auth-user-schemas'

export async function POST(request: Request) {
  // 1. Kiểm tra session đăng nhập
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }

  // 2. Parse & Validate request body
  let bodyJson: unknown
  try {
    bodyJson = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dữ liệu JSON không hợp lệ' }, { status: 400 })
  }

  const parseResult = changePasswordSchema.safeParse(bodyJson)
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]?.message || 'Dữ liệu không hợp lệ'
    return NextResponse.json({ error: firstError }, { status: 400 })
  }

  const { currentPassword, newPassword } = parseResult.data
  const userId = Number(session.user.id)

  // 3. Tìm tài khoản người dùng trong cơ sở dữ liệu
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user || !user.password) {
    return NextResponse.json({ error: 'Không tìm thấy tài khoản người dùng' }, { status: 404 })
  }

  // 4. So khớp mật khẩu hiện tại
  const isMatch = await bcrypt.compare(currentPassword, user.password)
  if (!isMatch) {
    return NextResponse.json(
      { error: 'Mật khẩu hiện tại không chính xác' },
      { status: 400 }
    )
  }

  // 5. Kiểm tra mật khẩu mới không trùng mật khẩu cũ
  const isSame = await bcrypt.compare(newPassword, user.password)
  if (isSame) {
    return NextResponse.json(
      { error: 'Mật khẩu mới không được trùng với mật khẩu hiện tại' },
      { status: 400 }
    )
  }

  // 6. Mã hoá mật khẩu mới và cập nhật
  const hashedPassword = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword }
  })

  return NextResponse.json({
    success: true,
    message: 'Đổi mật khẩu thành công'
  })
}
