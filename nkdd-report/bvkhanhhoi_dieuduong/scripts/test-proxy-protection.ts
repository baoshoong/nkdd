export {}

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
  console.log('=== BẮT ĐẦU TEST PROXY BẢO VỆ ROUTE, PHÂN QUYỀN & TRANG 404 ===\n')

  // 1. Kiểm tra khi CHƯA đăng nhập
  console.log('1. Kiểm tra khi chưa đăng nhập:')
  const unauthLoginRes = await fetch(`${BASE_URL}/login`)
  if (unauthLoginRes.status === 200) {
    console.log('✅ Vào được trang /login bình thường khi chưa đăng nhập')
  } else {
    throw new Error(`❌ Mong đợi /login 200, nhận: ${unauthLoginRes.status}`)
  }

  const unauthReportRes = await fetch(`${BASE_URL}/report`, { redirect: 'manual' })
  const unauthLocation = unauthReportRes.headers.get('location') || ''
  if (unauthReportRes.status === 307 && unauthLocation.includes('/login')) {
    console.log(`✅ Chuyển hướng đúng về /login khi truy cập /report trái phép (Location: ${unauthLocation})`)
  } else {
    throw new Error(`❌ Mong đợi redirect về login, nhận status: ${unauthReportRes.status}, location: ${unauthLocation}`)
  }

  // 2. Đăng nhập ADMIN
  console.log('\n2. Kiểm tra tài khoản ADMIN (admin / admin123):')
  const adminJar = await login('admin', 'admin123')
  if (!adminJar) throw new Error('Không thể đăng nhập admin')
  console.log('✅ Đăng nhập Admin thành công')

  // Admin vào /login -> phải chuyển hướng về /menu
  const adminLoginRedirect = await fetch(`${BASE_URL}/login`, {
    headers: { Cookie: cookieHeader(adminJar) },
    redirect: 'manual'
  })
  const adminLoginLoc = adminLoginRedirect.headers.get('location') || ''
  if (adminLoginRedirect.status === 307 && adminLoginLoc.includes('/menu')) {
    console.log(`✅ Admin đã login vào /login -> Chuyển hướng đúng về /menu (Location: ${adminLoginLoc})`)
  } else {
    throw new Error(`❌ Admin vào /login không chuyển hướng đúng: status ${adminLoginRedirect.status}, location: ${adminLoginLoc}`)
  }

  // Admin vào / -> chuyển hướng về /menu
  const adminRootRedirect = await fetch(`${BASE_URL}/`, {
    headers: { Cookie: cookieHeader(adminJar) },
    redirect: 'manual'
  })
  const adminRootLoc = adminRootRedirect.headers.get('location') || ''
  if (adminRootRedirect.status === 307 && adminRootLoc.includes('/menu')) {
    console.log(`✅ Admin vào trang chủ / -> Chuyển hướng đúng về /menu`)
  }

  // Admin truy cập /menu và /timesheet -> 200
  const adminMenuRes = await fetch(`${BASE_URL}/menu`, {
    headers: { Cookie: cookieHeader(adminJar) }
  })
  if (adminMenuRes.status === 200) {
    console.log('✅ Admin truy cập /menu thành công (Status 200)')
  } else {
    throw new Error(`❌ Admin bị chặn /menu: ${adminMenuRes.status}`)
  }

  const adminTimesheetRes = await fetch(`${BASE_URL}/timesheet`, {
    headers: { Cookie: cookieHeader(adminJar) }
  })
  if (adminTimesheetRes.status === 200) {
    console.log('✅ Admin truy cập /timesheet thành công (Status 200)')
  } else {
    throw new Error(`❌ Admin bị chặn /timesheet: ${adminTimesheetRes.status}`)
  }

  // Admin vào /admin/users -> 200
  const adminUsersRes = await fetch(`${BASE_URL}/admin/users`, {
    headers: { Cookie: cookieHeader(adminJar) }
  })
  if (adminUsersRes.status === 200) {
    console.log('✅ Admin truy cập /admin/users thành công (Status 200)')
  } else {
    throw new Error(`❌ Admin bị chặn /admin/users: ${adminUsersRes.status}`)
  }

  // 3. Đăng nhập KHOA_USER (noi / 123456)
  console.log('\n3. Kiểm tra tài khoản KHOA_USER (noi / 123456):')
  const noiJar = await login('noi', '123456')
  if (!noiJar) throw new Error('Không thể đăng nhập user noi')
  console.log('✅ Đăng nhập Khoa Nội thành công')

  // KHOA_USER vào /login -> chuyển hướng về /menu
  const noiLoginRedirect = await fetch(`${BASE_URL}/login`, {
    headers: { Cookie: cookieHeader(noiJar) },
    redirect: 'manual'
  })
  const noiLoginLoc = noiLoginRedirect.headers.get('location') || ''
  if (noiLoginRedirect.status === 307 && noiLoginLoc.includes('/menu')) {
    console.log(`✅ Khoa Nội đã login vào /login -> Chuyển hướng đúng về /menu (Location: ${noiLoginLoc})`)
  } else {
    throw new Error(`❌ Khoa Nội vào /login không chuyển hướng đúng: status ${noiLoginRedirect.status}, location: ${noiLoginLoc}`)
  }

  // KHOA_USER truy cập /menu và /timesheet -> 200
  const noiMenuRes = await fetch(`${BASE_URL}/menu`, {
    headers: { Cookie: cookieHeader(noiJar) }
  })
  if (noiMenuRes.status === 200) {
    console.log('✅ Khoa Nội truy cập /menu thành công (Status 200)')
  } else {
    throw new Error(`❌ Khoa Nội bị chặn /menu: ${noiMenuRes.status}`)
  }

  const noiTimesheetRes = await fetch(`${BASE_URL}/timesheet`, {
    headers: { Cookie: cookieHeader(noiJar) }
  })
  if (noiTimesheetRes.status === 200) {
    console.log('✅ Khoa Nội truy cập /timesheet thành công (Status 200)')
  } else {
    throw new Error(`❌ Khoa Nội bị chặn /timesheet: ${noiTimesheetRes.status}`)
  }

  // KHOA_USER cố tình vào /admin/users -> bị Proxy chặn và redirect về /report
  const noiAdminRedirect = await fetch(`${BASE_URL}/admin/users`, {
    headers: { Cookie: cookieHeader(noiJar) },
    redirect: 'manual'
  })
  const noiAdminLoc = noiAdminRedirect.headers.get('location') || ''
  if (noiAdminRedirect.status === 307 && noiAdminLoc.includes('/report')) {
    console.log(`✅ Khoa Nội cố tình vào /admin/users -> Bị Proxy chặn và redirect về /report (Location: ${noiAdminLoc})`)
  } else {
    throw new Error(`❌ Khoa Nội vào /admin/users không bị chặn: status ${noiAdminRedirect.status}, location: ${noiAdminLoc}`)
  }

  // KHOA_USER cố tình vào /dashboard -> bị Proxy chặn và redirect về /report
  const noiDashboardRedirect = await fetch(`${BASE_URL}/dashboard`, {
    headers: { Cookie: cookieHeader(noiJar) },
    redirect: 'manual'
  })
  const noiDashLoc = noiDashboardRedirect.headers.get('location') || ''
  if (noiDashboardRedirect.status === 307 && noiDashLoc.includes('/report')) {
    console.log(`✅ Khoa Nội cố tình vào /dashboard -> Bị Proxy chặn và redirect về /report (Location: ${noiDashLoc})`)
  } else {
    throw new Error(`❌ Khoa Nội vào /dashboard không bị chặn: status ${noiDashboardRedirect.status}, location: ${noiDashLoc}`)
  }

  // KHOA_USER cố tình gọi API admin -> bị chặn mã 403
  const noiApiAdminRes = await fetch(`${BASE_URL}/api/admin/users`, {
    headers: { Cookie: cookieHeader(noiJar) }
  })
  if (noiApiAdminRes.status === 403) {
    console.log('✅ Khoa Nội gọi /api/admin/users -> Bị Proxy chặn với mã 403')
  } else {
    throw new Error(`❌ Mong đợi 403, nhận: ${noiApiAdminRes.status}`)
  }

  // 4. Kiểm tra tài khoản Ban Giám Đốc (bgd / 123456)
  console.log('\n4. Kiểm tra tài khoản BGD (bgd / 123456):')
  const bgdJar = await login('bgd', '123456')
  if (!bgdJar) throw new Error('Không thể đăng nhập user bgd')
  console.log('✅ Đăng nhập BGD thành công')

  // BGD vào /dashboard -> 200
  const bgdDashRes = await fetch(`${BASE_URL}/dashboard`, {
    headers: { Cookie: cookieHeader(bgdJar) }
  })
  if (bgdDashRes.status === 200) {
    console.log('✅ BGD truy cập /dashboard thành công (Status 200)')
  } else {
    throw new Error(`❌ BGD không vào được /dashboard: ${bgdDashRes.status}`)
  }

  // BGD truy cập /menu và /timesheet -> 200
  const bgdMenuRes = await fetch(`${BASE_URL}/menu`, {
    headers: { Cookie: cookieHeader(bgdJar) }
  })
  if (bgdMenuRes.status === 200) {
    console.log('✅ BGD truy cập /menu thành công (Status 200)')
  } else {
    throw new Error(`❌ BGD bị chặn /menu: ${bgdMenuRes.status}`)
  }

  const bgdTimesheetRes = await fetch(`${BASE_URL}/timesheet`, {
    headers: { Cookie: cookieHeader(bgdJar) }
  })
  if (bgdTimesheetRes.status === 200) {
    console.log('✅ BGD truy cập /timesheet thành công (Status 200)')
  } else {
    throw new Error(`❌ BGD bị chặn /timesheet: ${bgdTimesheetRes.status}`)
  }

  // BGD cố tình vào /admin/users -> bị Proxy chặn và redirect về /dashboard
  const bgdAdminRedirect = await fetch(`${BASE_URL}/admin/users`, {
    headers: { Cookie: cookieHeader(bgdJar) },
    redirect: 'manual'
  })
  const bgdAdminLoc = bgdAdminRedirect.headers.get('location') || ''
  if (bgdAdminRedirect.status === 307 && bgdAdminLoc.includes('/dashboard')) {
    console.log(`✅ BGD cố tình vào /admin/users -> Bị Proxy chặn và redirect về /dashboard (Location: ${bgdAdminLoc})`)
  } else {
    throw new Error(`❌ BGD vào /admin/users không bị chặn: status ${bgdAdminRedirect.status}, location: ${bgdAdminLoc}`)
  }

  // 5. Kiểm tra trang 404 (Not Found)
  console.log('\n5. Kiểm tra hiển thị trang 404:')
  const notFoundRes = await fetch(`${BASE_URL}/random-unknown-page-test-404`, {
    headers: { Cookie: cookieHeader(adminJar) }
  })
  const notFoundHtml = await notFoundRes.text()
  if (notFoundRes.status === 404 || notFoundHtml.includes('404') || notFoundHtml.includes('Không tìm thấy trang')) {
    console.log('✅ Trang 404 hoạt động chuẩn xác, hiển thị đúng thông báo không tìm thấy trang')
  } else {
    throw new Error(`❌ Trang 404 không hoạt động đúng: status ${notFoundRes.status}`)
  }

  console.log('\n🎉 TẤT CẢ KIỂM THỬ PROXY PHÂN QUYỀN & TRANG 404 ĐỀU ĐẠT CHUẨN XANH! 🎉\n')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
