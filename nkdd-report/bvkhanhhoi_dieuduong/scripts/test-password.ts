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
  console.log('=== BẮT ĐẦU TEST TÍNH NĂNG ĐỔI MẬT KHẨU ===\n')

  // 1. Đăng nhập với tài khoản noi / 123456
  console.log('1. Đăng nhập user noi / 123456...')
  const noiJar = await login('noi', '123456')
  if (!noiJar) {
    throw new Error('❌ Không đăng nhập được với tài khoản noi / 123456 ban đầu')
  }
  console.log('✅ Đăng nhập thành công')

  // 2. Thử đổi mật khẩu với mật khẩu cũ sai
  console.log('2. Thử đổi mật khẩu với mật khẩu cũ sai...')
  const failRes = await fetch(`${BASE_URL}/api/user/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(noiJar)
    },
    body: JSON.stringify({
      currentPassword: 'wrongpassword',
      newPassword: 'newpassword123',
      confirmPassword: 'newpassword123'
    })
  })
  const failJson = await failRes.json()
  if (failRes.status === 400 && failJson.error === 'Mật khẩu hiện tại không chính xác') {
    console.log('✅ Chặn đúng khi nhập sai mật khẩu hiện tại')
  } else {
    throw new Error(`❌ Mong đợi status 400 và lỗi "Mật khẩu hiện tại không chính xác", nhận: ${failRes.status} ${JSON.stringify(failJson)}`)
  }

  // 3. Đổi sang mật khẩu mới: noi456
  console.log('3. Đổi sang mật khẩu mới "noi456"...')
  const changeRes = await fetch(`${BASE_URL}/api/user/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(noiJar)
    },
    body: JSON.stringify({
      currentPassword: '123456',
      newPassword: 'noi456',
      confirmPassword: 'noi456'
    })
  })
  const changeJson = await changeRes.json()
  if (!changeRes.ok || !changeJson.success) {
    throw new Error(`❌ Đổi mật khẩu thất bại: ${JSON.stringify(changeJson)}`)
  }
  console.log('✅ Đổi mật khẩu thành công:', changeJson.message)

  // 4. Đăng nhập lại với mật khẩu mới: noi456
  console.log('4. Thử đăng nhập lại bằng mật khẩu mới "noi456"...')
  const newLoginJar = await login('noi', 'noi456')
  if (!newLoginJar) {
    throw new Error('❌ Không thể đăng nhập bằng mật khẩu mới "noi456"')
  }
  console.log('✅ Đăng nhập bằng mật khẩu mới thành công!')

  // 5. Khôi phục lại mật khẩu ban đầu "123456" cho user noi
  console.log('5. Khôi phục lại mật khẩu gốc "123456"...')
  const restoreRes = await fetch(`${BASE_URL}/api/user/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(newLoginJar)
    },
    body: JSON.stringify({
      currentPassword: 'noi456',
      newPassword: '123456',
      confirmPassword: '123456'
    })
  })
  if (!restoreRes.ok) {
    throw new Error('❌ Không thể khôi phục lại mật khẩu gốc')
  }
  console.log('✅ Đã khôi phục lại mật khẩu "123456" thành công!')

  // 6. Test Admin Reset Password
  console.log('6. Test Admin Reset Password...')
  const adminJar = await login('admin', 'admin123')
  if (!adminJar) {
    throw new Error('❌ Không đăng nhập được bằng tài khoản admin')
  }

  // Lấy danh sách users để tìm user id của 'noi'
  const usersRes = await fetch(`${BASE_URL}/api/admin/users?q=noi`, {
    headers: { Cookie: cookieHeader(adminJar) }
  })
  const usersJson = await usersRes.json()
  const noiUser = usersJson.data.find((u: { username: string }) => u.username === 'noi')
  if (!noiUser) {
    throw new Error('❌ Không tìm thấy user noi từ /api/admin/users')
  }

  const resetRes = await fetch(`${BASE_URL}/api/admin/users/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(adminJar)
    },
    body: JSON.stringify({
      userId: noiUser.id,
      newPassword: 'noiReset789'
    })
  })
  const resetJson = await resetRes.json()
  if (!resetRes.ok || !resetJson.success) {
    throw new Error(`❌ Admin reset password thất bại: ${JSON.stringify(resetJson)}`)
  }
  console.log('✅ Admin reset password thành công:', resetJson.message)

  // Kiểm tra đăng nhập với mật khẩu admin vừa reset
  const afterResetJar = await login('noi', 'noiReset789')
  if (!afterResetJar) {
    throw new Error('❌ Không thể đăng nhập bằng mật khẩu admin vừa đặt lại')
  }
  console.log('✅ Đăng nhập bằng mật khẩu admin đặt lại thành công!')

  // Khôi phục lại 123456 qua admin reset
  await fetch(`${BASE_URL}/api/admin/users/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(adminJar)
    },
    body: JSON.stringify({
      userId: noiUser.id,
      newPassword: '123456'
    })
  })
  console.log('✅ Đã khôi phục lại mật khẩu gốc "123456" cho user noi!')

  console.log('\n🎉 TẤT CẢ TEST ĐỔI MẬT KHẨU & ADMIN RESET ĐỀU ĐẠT CHUẨN XANH! 🎉')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
