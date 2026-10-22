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
  console.log('=== BẮT ĐẦU TEST TÍNH NĂNG CRUD NGƯỜI DÙNG ===\n')

  // 1. Đăng nhập admin
  console.log('1. Đăng nhập admin / admin123...')
  const adminJar = await login('admin', 'admin123')
  if (!adminJar) {
    throw new Error('❌ Không đăng nhập được tài khoản admin')
  }
  console.log('✅ Admin đăng nhập thành công')

  // 2. Tạo người dùng mới qua POST /api/admin/users
  console.log('2. Tạo người dùng mới test_user_nurse...')
  const createRes = await fetch(`${BASE_URL}/api/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(adminJar)
    },
    body: JSON.stringify({
      username: 'test_user_nurse',
      password: 'password123',
      name: 'Điều Dưỡng Test',
      role: 'KHOA_USER',
      departmentId: 1
    })
  })

  const createJson = await createRes.json()
  if (!createRes.ok || !createJson.success) {
    throw new Error(`❌ Tạo người dùng thất bại: ${JSON.stringify(createJson)}`)
  }
  const createdUserId = createJson.user.id
  console.log(`✅ Tạo người dùng thành công (ID: ${createdUserId}):`, createJson.message)

  // 3. Đăng nhập bằng tài khoản mới vừa tạo
  console.log('3. Đăng nhập bằng tài khoản mới test_user_nurse / password123...')
  const newJar = await login('test_user_nurse', 'password123')
  if (!newJar) {
    throw new Error('❌ Không đăng nhập được bằng tài khoản mới vừa tạo')
  }
  console.log('✅ Đăng nhập bằng tài khoản mới thành công!')

  // 4. Cập nhật thông tin qua PUT /api/admin/users
  console.log('4. Cập nhật thông tin người dùng...')
  const updateRes = await fetch(`${BASE_URL}/api/admin/users`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(adminJar)
    },
    body: JSON.stringify({
      id: createdUserId,
      name: 'Điều Dưỡng Cập Nhật',
      role: 'BGD',
      departmentId: null
    })
  })
  const updateJson = await updateRes.json()
  if (!updateRes.ok || !updateJson.success) {
    throw new Error(`❌ Cập nhật người dùng thất bại: ${JSON.stringify(updateJson)}`)
  }
  console.log('✅ Cập nhật người dùng thành công:', updateJson.message)

  // 5. Thử tự xóa tài khoản của chính mình (chặn an toàn)
  console.log('5. Kiểm tra bảo vệ không cho Admin tự xóa chính mình...')
  // Lấy ID của admin
  const usersRes = await fetch(`${BASE_URL}/api/admin/users?q=admin`, {
    headers: { Cookie: cookieHeader(adminJar) }
  })
  const usersJson = await usersRes.json()
  const adminUser = usersJson.data.find((u: { username: string }) => u.username === 'admin')
  if (adminUser) {
    const selfDeleteRes = await fetch(`${BASE_URL}/api/admin/users?id=${adminUser.id}`, {
      method: 'DELETE',
      headers: { Cookie: cookieHeader(adminJar) }
    })
    const selfDeleteJson = await selfDeleteRes.json()
    if (selfDeleteRes.status === 400 && selfDeleteJson.error.includes('không thể tự xóa')) {
      console.log('✅ Chặn đúng khi Admin cố tình xóa tài khoản của chính mình!')
    } else {
      throw new Error(`❌ Mong đợi chặn tự xóa tài khoản, nhận: ${selfDeleteRes.status} ${JSON.stringify(selfDeleteJson)}`)
    }
  }

  // 6. Xóa người dùng test qua DELETE /api/admin/users
  console.log('6. Xóa người dùng test_user_nurse...')
  const deleteRes = await fetch(`${BASE_URL}/api/admin/users?id=${createdUserId}`, {
    method: 'DELETE',
    headers: { Cookie: cookieHeader(adminJar) }
  })
  const deleteJson = await deleteRes.json()
  if (!deleteRes.ok || !deleteJson.success) {
    throw new Error(`❌ Xóa người dùng thất bại: ${JSON.stringify(deleteJson)}`)
  }
  console.log('✅ Xóa người dùng thành công:', deleteJson.message)

  // 7. Xác minh tài khoản đã bị xóa không thể đăng nhập
  console.log('7. Xác minh tài khoản đã xóa không thể đăng nhập...')
  const deletedLogin = await login('test_user_nurse', 'password123')
  if (deletedLogin === null) {
    console.log('✅ Đăng nhập bị từ chối chính xác đối với tài khoản đã xóa!')
  } else {
    throw new Error('❌ Tài khoản đã xóa nhưng vẫn đăng nhập được!')
  }

  console.log('\n🎉 TẤT CẢ KIỂM THỬ CRUD NGƯỜI DÙNG ĐỀU ĐẠT CHUẨN XANH! 🎉')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
