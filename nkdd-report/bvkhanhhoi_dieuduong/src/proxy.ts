import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// Next.js 16 Proxy bảo vệ route và phân quyền thông minh theo vai trò
export const proxy = auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  const user = req.auth?.user
  const role = user?.role
  const pathname = nextUrl.pathname

  const isApi = pathname.startsWith('/api')
  const isLoginPage = pathname === '/login'
  const isCronRoute = pathname.startsWith('/api/cron')
  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/api/admin')
  const isDashboardRoute = pathname.startsWith('/dashboard')
  const isAuditRoute = pathname.startsWith('/audit') || pathname.startsWith('/api/audit')
  const isStatisticsRoute = pathname.startsWith('/statistics') || pathname.startsWith('/api/statistics')

  // 1. Đã đăng nhập mà cố tình truy cập /login -> Chuyển hướng về Menu phân hệ ứng dụng
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL('/menu', nextUrl))
  }

  // Cho phép route cron tự kiểm tra token Bearer CRON_SECRET trong route handler
  if (isCronRoute) {
    return NextResponse.next()
  }

  // 2. Chưa đăng nhập mà truy cập route được bảo vệ
  if (!isLoggedIn && !isLoginPage) {
    if (isApi) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
    }
    const loginUrl = new URL('/login', nextUrl)
    if (pathname !== '/') {
      loginUrl.searchParams.set('callbackUrl', pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  // 3. Phân quyền vai trò:
  // Tài khoản KHOA_USER không được vào trang Quản trị, Tổng quan Dashboard, Thống kê hoặc Nhật ký Audit
  if (role === 'KHOA_USER') {
    if (isAdminRoute || isDashboardRoute || isAuditRoute || isStatisticsRoute) {
      if (isApi) {
        return NextResponse.json(
          { error: 'Không có quyền truy cập khu vực này' },
          { status: 403 }
        )
      }
      return NextResponse.redirect(new URL('/report', nextUrl))
    }
  }

  // Ban Giám đốc (BGD) không được vào các trang Quản trị người dùng & Phân quyền (/admin/*)
  if (role === 'BGD' && isAdminRoute) {
    if (isApi) {
      return NextResponse.json(
        { error: 'Chỉ Quản trị viên mới có quyền quản trị hệ thống' },
        { status: 403 }
      )
    }
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  // 4. Trang chủ gốc / -> Chuyển hướng về Menu phân hệ ứng dụng
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/menu', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
}
