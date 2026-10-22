import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createUserApiSchema, updateUserApiSchema } from '@/lib/schemas/auth-user-schemas'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('asc')
})

// GET: Danh sách người dùng phân trang
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Chỉ ADMIN mới có quyền truy cập' }, { status: 403 })
  }

  const url = new URL(request.url)
  const rawParams = {
    page: url.searchParams.get('page') || undefined,
    limit: url.searchParams.get('limit') || undefined,
    q: url.searchParams.get('q') || undefined,
    sort: url.searchParams.get('sort') || undefined,
    order: url.searchParams.get('order') || undefined
  }

  const parseResult = querySchema.safeParse(rawParams)
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Tham số phân trang không hợp lệ', details: parseResult.error.flatten() },
      { status: 400 }
    )
  }

  const { page, limit, q, order } = parseResult.data
  const skip = (page - 1) * limit
  const take = limit

  const where = q
    ? {
        OR: [
          { username: { contains: q, mode: 'insensitive' as const } },
          { name: { contains: q, mode: 'insensitive' as const } }
        ]
      }
    : {}

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take,
      include: {
        department: {
          select: { id: true, code: true, name: true }
        }
      },
      orderBy: { id: order }
    })
  ])

  const data = users.map((u) => ({
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    departmentId: u.departmentId,
    departmentCode: u.department?.code || null,
    departmentName: u.department?.name || null,
    createdAt: u.createdAt.toISOString()
  }))

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  })
}

// POST: Tạo người dùng mới
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Chỉ ADMIN mới có quyền tạo người dùng' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dữ liệu JSON không hợp lệ' }, { status: 400 })
  }

  const parseResult = createUserApiSchema.safeParse(body)
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]?.message || 'Dữ liệu không hợp lệ'
    return NextResponse.json({ error: firstError }, { status: 400 })
  }

  const { username, password, name, role, departmentId } = parseResult.data

  // 1. Kiểm tra tên đăng nhập đã tồn tại chưa
  const existingUser = await prisma.user.findUnique({
    where: { username: username.toLowerCase() }
  })
  if (existingUser) {
    return NextResponse.json({ error: `Tài khoản "${username}" đã tồn tại` }, { status: 400 })
  }

  // 2. Ràng buộc toàn vẹn khoa phòng
  if (role === 'KHOA_USER' && !departmentId) {
    return NextResponse.json({ error: 'Tài khoản khoa phòng phải thuộc một khoa cụ thể' }, { status: 400 })
  }

  if (departmentId) {
    const dept = await prisma.department.findUnique({
      where: { id: departmentId }
    })
    if (!dept) {
      return NextResponse.json({ error: 'Khoa phòng được chọn không tồn tại' }, { status: 400 })
    }
    if (dept.isTotal) {
      return NextResponse.json({ error: 'Không thể gán tài khoản vào khoa tổng hợp (TỔNG)' }, { status: 400 })
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10)
  const newUser = await prisma.user.create({
    data: {
      username: username.toLowerCase(),
      password: hashedPassword,
      name,
      role,
      departmentId: departmentId ?? null
    },
    include: {
      department: true
    }
  })

  return NextResponse.json({
    success: true,
    message: `Tạo tài khoản "${newUser.username}" thành công`,
    user: {
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      role: newUser.role,
      departmentId: newUser.departmentId,
      departmentCode: newUser.department?.code || null,
      departmentName: newUser.department?.name || null
    }
  })
}

// PUT: Cập nhật thông tin người dùng
export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Chỉ ADMIN mới có quyền cập nhật người dùng' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Dữ liệu JSON không hợp lệ' }, { status: 400 })
  }

  const parseResult = updateUserApiSchema.safeParse(body)
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]?.message || 'Dữ liệu không hợp lệ'
    return NextResponse.json({ error: firstError }, { status: 400 })
  }

  const { id, name, role, departmentId } = parseResult.data

  const targetUser = await prisma.user.findUnique({
    where: { id }
  })
  if (!targetUser) {
    return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 })
  }

  const currentAdminId = Number(session.user.id)

  // 1. Bảo vệ: Admin không được tự hạ quyền của chính mình
  if (targetUser.id === currentAdminId && targetUser.role === 'ADMIN' && role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Bạn không thể tự hạ quyền Quản trị viên của chính mình' },
      { status: 400 }
    )
  }

  // 2. Bảo vệ: Không được hạ quyền Admin cuối cùng trong hệ thống
  if (targetUser.role === 'ADMIN' && role !== 'ADMIN') {
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' }
    })
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: 'Hệ thống phải có ít nhất một Quản trị viên, không thể thay đổi vai trò này' },
        { status: 400 }
      )
    }
  }

  // 3. Ràng buộc toàn vẹn khoa phòng
  if (role === 'KHOA_USER' && !departmentId) {
    return NextResponse.json({ error: 'Tài khoản khoa phòng phải thuộc một khoa cụ thể' }, { status: 400 })
  }

  if (departmentId) {
    const dept = await prisma.department.findUnique({
      where: { id: departmentId }
    })
    if (!dept) {
      return NextResponse.json({ error: 'Khoa phòng được chọn không tồn tại' }, { status: 400 })
    }
    if (dept.isTotal) {
      return NextResponse.json({ error: 'Không thể gán tài khoản vào khoa tổng hợp (TỔNG)' }, { status: 400 })
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      name,
      role,
      departmentId: departmentId ?? null
    },
    include: {
      department: true
    }
  })

  return NextResponse.json({
    success: true,
    message: `Cập nhật tài khoản "${updatedUser.username}" thành công`,
    user: {
      id: updatedUser.id,
      username: updatedUser.username,
      name: updatedUser.name,
      role: updatedUser.role,
      departmentId: updatedUser.departmentId,
      departmentCode: updatedUser.department?.code || null,
      departmentName: updatedUser.department?.name || null
    }
  })
}

// DELETE: Xóa người dùng
export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Chỉ ADMIN mới có quyền xóa người dùng' }, { status: 403 })
  }

  const url = new URL(request.url)
  const idParam = url.searchParams.get('id')
  const id = Number(idParam)
  if (!id || isNaN(id)) {
    return NextResponse.json({ error: 'ID người dùng không hợp lệ' }, { status: 400 })
  }

  const currentAdminId = Number(session.user.id)

  // 1. Không cho phép tự xóa tài khoản của chính mình đang đăng nhập
  if (id === currentAdminId) {
    return NextResponse.json({ error: 'Bạn không thể tự xóa tài khoản đang đăng nhập' }, { status: 400 })
  }

  const targetUser = await prisma.user.findUnique({
    where: { id }
  })
  if (!targetUser) {
    return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 })
  }

  // 2. Không cho phép xóa Quản trị viên cuối cùng
  if (targetUser.role === 'ADMIN') {
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' }
    })
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: 'Hệ thống phải có ít nhất một Quản trị viên, không thể xóa tài khoản này' },
        { status: 400 }
      )
    }
  }

  await prisma.user.delete({
    where: { id }
  })

  return NextResponse.json({
    success: true,
    message: `Đã xóa tài khoản "${targetUser.username}" thành công`
  })
}
