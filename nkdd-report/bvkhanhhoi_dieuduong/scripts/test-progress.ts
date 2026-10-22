import { getTodayHCM } from '../src/lib/date-utils'

const BASE_URL = 'http://localhost:3000'

interface CookieJar {
  [name: string]: string
}

function parseCookies(headers: Headers, jar: CookieJar) {
  const setCookie = headers.getSetCookie ? headers.getSetCookie() : [headers.get('set-cookie') || '']
  for (const cookieStr of setCookie) {
    if (!cookieStr) continue
    const parts = cookieStr.split(';')[0].split('=')
    const name = parts[0].trim()
    const value = parts.slice(1).join('=').trim()
    if (name) {
      jar[name] = value
    }
  }
}

function cookieHeader(jar: CookieJar): string {
  return Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
}

async function login(username: string, password: string): Promise<CookieJar | null> {
  const jar: CookieJar = {}

  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`)
  parseCookies(csrfRes.headers, jar)
  const csrfJson = await csrfRes.json()
  const csrfToken = csrfJson.csrfToken

  const body = new URLSearchParams({
    username,
    password,
    csrfToken,
    redirect: 'false',
    callbackUrl: `${BASE_URL}/report`,
    json: 'true'
  })

  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookieHeader(jar)
    },
    body: body.toString(),
    redirect: 'manual'
  })

  parseCookies(loginRes.headers, jar)

  if (jar['authjs.session-token']) {
    return jar
  }
  return null
}

async function run() {
  console.log('=== BẮT ĐẦU TEST TÍNH NĂNG TIẾN ĐỘ BÁO CÁO (PROGRESS API) ===\n')

  // 1. Kiểm tra API khi chưa login -> 401
  console.log('1. Kiểm tra /api/reports/progress khi chưa đăng nhập...')
  const unauthRes = await fetch(`${BASE_URL}/api/reports/progress`)
  if (unauthRes.status === 401) {
    console.log('✅ Chặn đúng với mã 401 khi chưa đăng nhập')
  } else {
    throw new Error(`❌ Mong đợi status 401, nhận: ${unauthRes.status}`)
  }

  // 2. Đăng nhập user noi / 123456
  console.log('2. Đăng nhập user noi / 123456...')
  const jar = await login('noi', '123456')
  if (!jar) {
    throw new Error('❌ Không thể đăng nhập user noi')
  }
  console.log('✅ Đăng nhập thành công')

  // 3. Lấy tiến độ mặc định (ngày hôm nay theo giờ HCM)
  console.log('3. Lấy tiến độ báo cáo mặc định (ngày hôm nay)...')
  const progressRes = await fetch(`${BASE_URL}/api/reports/progress`, {
    headers: { Cookie: cookieHeader(jar) }
  })
  if (!progressRes.ok) {
    throw new Error(`❌ Lỗi khi gọi /api/reports/progress: ${progressRes.status}`)
  }
  const progressData = await progressRes.json()
  console.log('Dữ liệu tiến độ:', progressData)

  const todayExpected = getTodayHCM()
  if (
    typeof progressData.submitted === 'number' &&
    typeof progressData.total === 'number' &&
    progressData.total === 11 &&
    typeof progressData.percentage === 'number' &&
    progressData.percentage >= 0 &&
    progressData.percentage <= 100 &&
    progressData.date === todayExpected
  ) {
    console.log(`✅ Cấu trúc tiến độ chuẩn ngày hôm nay (${todayExpected}): ${progressData.submitted}/${progressData.total} khoa (${progressData.percentage}%)`)
  } else {
    throw new Error(`❌ Cấu trúc tiến độ không khớp ngày hôm nay: ${JSON.stringify(progressData)}, mong đợi date: ${todayExpected}`)
  }

  // 4. Lấy tiến độ theo ngày cụ thể (2026-10-12)
  console.log('4. Lấy tiến độ báo cáo theo ngày cụ thể 2026-10-12...')
  const dateProgressRes = await fetch(`${BASE_URL}/api/reports/progress?date=2026-10-12`, {
    headers: { Cookie: cookieHeader(jar) }
  })
  if (!dateProgressRes.ok) {
    throw new Error(`❌ Lỗi khi gọi /api/reports/progress?date=2026-10-12: ${dateProgressRes.status}`)
  }
  const dateProgressData = await dateProgressRes.json()
  console.log('Dữ liệu tiến độ theo ngày:', dateProgressData)

  if (dateProgressData.date === '2026-10-12' && dateProgressData.total === 11) {
    console.log('✅ Dữ liệu tiến độ theo ngày khớp chính xác!')
  } else {
    throw new Error(`❌ Dữ liệu tiến độ theo ngày không khớp: ${JSON.stringify(dateProgressData)}`)
  }

  console.log('\n🎉 TẤT CẢ KIỂM THỬ TIẾN ĐỘ BÁO CÁO ĐỀU ĐẠT CHUẨN XANH! 🎉')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
