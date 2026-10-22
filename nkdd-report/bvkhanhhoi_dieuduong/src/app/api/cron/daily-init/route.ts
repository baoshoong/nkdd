import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getTodayHCM } from '@/lib/date-utils'
import { ensureDailyReportWithZeros } from '@/lib/services/report-init-service'

const CRON_SECRET = process.env.CRON_SECRET || 'nkdd-cron-secret-key'

async function handleDailyInit(request: Request) {
  // 1. Kiểm tra xác thực bảo mật
  // Cách 1: Token bí mật qua Header Authorization hoặc Query param ?token=
  const url = new URL(request.url)
  const tokenParam = url.searchParams.get('token')
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  const isTokenValid =
    (tokenParam && tokenParam === CRON_SECRET) ||
    (bearerToken && bearerToken === CRON_SECRET)

  if (!isTokenValid) {
    // Cách 2: Kiểm tra session Quản trị viên (ADMIN)
    const session = await auth()
    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json(
        {
          error:
            'Từ chối truy cập. Yêu cầu token hợp lệ (Bearer CRON_SECRET) hoặc tài khoản Quản trị viên.'
        },
        { status: 403 }
      )
    }
  }

  // 2. Lấy ngày mục tiêu (mặc định hôm nay theo giờ Hồ Chí Minh)
  const dateParam = url.searchParams.get('date')
  const targetDate =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? dateParam
      : getTodayHCM()

  try {
    const result = await ensureDailyReportWithZeros(targetDate)

    return NextResponse.json({
      success: true,
      message: `Khởi tạo báo cáo ngày ${targetDate} thành công với giá trị mặc định bằng 0`,
      data: result
    })
  } catch (error) {
    console.error('Lỗi khi khởi tạo báo cáo ngày mới:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Lỗi hệ thống khi khởi tạo báo cáo'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return handleDailyInit(request)
}

export async function GET(request: Request) {
  return handleDailyInit(request)
}
