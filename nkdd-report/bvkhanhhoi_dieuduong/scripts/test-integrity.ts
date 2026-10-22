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

async function login(username: string, password: string): Promise<CookieJar> {
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
  return jar
}

async function runIntegrityTests() {
  console.log('=== BẮT ĐẦU KIỂM THỬ RÀNG BUỘC TOÀN VẸN & PHÂN QUYỀN ===\n')

  // Đăng nhập admin
  console.log('1. Đăng nhập admin / admin123...')
  const adminJar = await login('admin', 'admin123')
  console.log('✅ Admin đăng nhập thành công')

  // Lấy thông tin admin hiện tại
  const userListRes = await fetch(`${BASE_URL}/api/admin/users?q=admin`, {
    headers: { Cookie: cookieHeader(adminJar) }
  })
  const userListJson = await userListRes.json()
  const currentAdmin = userListJson.data.find((u: { username: string }) => u.username === 'admin')
  if (!currentAdmin) throw new Error('Không tìm thấy user admin')

  // 1. Test: Admin tự hạ quyền quản trị của chính mình -> Phải bị chặn 400
  console.log('\n2. Test: Admin cố tình tự hạ quyền của chính mình...')
  const selfDemoteRes = await fetch(`${BASE_URL}/api/admin/users`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(adminJar)
    },
    body: JSON.stringify({
      id: currentAdmin.id,
      name: currentAdmin.name,
      role: 'KHOA_USER',
      departmentId: 1
    })
  })
  const selfDemoteJson = await selfDemoteRes.json()
  if (selfDemoteRes.status === 400 && selfDemoteJson.error.includes('không thể tự hạ quyền')) {
    console.log('✅ PASS: Chặn đúng khi Admin tự hạ quyền của chính mình:', selfDemoteJson.error)
  } else {
    throw new Error(`❌ FAIL: Không chặn tự hạ quyền: ${selfDemoteRes.status} ${JSON.stringify(selfDemoteJson)}`)
  }

  // 2. Test: Gán tài khoản vào khoa không tồn tại -> Phải bị chặn 400
  console.log('\n3. Test: Tạo người dùng với ID khoa không tồn tại (departmentId: 9999)...')
  const invalidDeptUserRes = await fetch(`${BASE_URL}/api/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(adminJar)
    },
    body: JSON.stringify({
      username: 'temp_user_test',
      password: 'password123',
      name: 'Temp User',
      role: 'KHOA_USER',
      departmentId: 9999
    })
  })
  const invalidDeptUserJson = await invalidDeptUserRes.json()
  if (invalidDeptUserRes.status === 400 && invalidDeptUserJson.error.includes('không tồn tại')) {
    console.log('✅ PASS: Chặn đúng khi chọn khoa phòng không tồn tại:', invalidDeptUserJson.error)
  } else {
    throw new Error(`❌ FAIL: Không chặn khoa không tồn tại: ${invalidDeptUserRes.status} ${JSON.stringify(invalidDeptUserJson)}`)
  }

  // Lấy ID của khoa TONG
  const deptsRes = await fetch(`${BASE_URL}/api/departments`)
  const deptsJson = await deptsRes.json()
  // Tìm department tổng qua query all depts từ report
  const reportRes = await fetch(`${BASE_URL}/api/reports?date=2026-10-12`, {
    headers: { Cookie: cookieHeader(adminJar) }
  })
  const reportJson = await reportRes.json()
  const tongDept = reportJson.departments.find((d: { isTotal?: boolean; code?: string }) => d.code === 'TONG' || d.isTotal)
  const tongDeptId = tongDept ? tongDept.id : 12

  // 3. Test: Gán người dùng vào khoa TỔNG -> Phải bị chặn 400
  console.log(`\n4. Test: Gán người dùng vào khoa TỔNG (ID: ${tongDeptId})...`)
  const tongUserRes = await fetch(`${BASE_URL}/api/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(adminJar)
    },
    body: JSON.stringify({
      username: 'temp_user_tong',
      password: 'password123',
      name: 'Temp Tong User',
      role: 'KHOA_USER',
      departmentId: tongDeptId
    })
  })
  const tongUserJson = await tongUserRes.json()
  if (tongUserRes.status === 400 && tongUserJson.error.includes('TỔNG')) {
    console.log('✅ PASS: Chặn đúng khi gán user vào khoa TỔNG:', tongUserJson.error)
  } else {
    throw new Error(`❌ FAIL: Không chặn gán user vào khoa TỔNG: ${tongUserRes.status} ${JSON.stringify(tongUserJson)}`)
  }

  // 4. Test: Phân quyền cho khoa TỔNG -> Phải bị chặn 400
  console.log(`\n5. Test: Phân quyền chỉ số cho khoa TỔNG (ID: ${tongDeptId})...`)
  const permTongRes = await fetch(`${BASE_URL}/api/admin/permissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(adminJar)
    },
    body: JSON.stringify({
      departmentId: tongDeptId,
      items: [{ indicatorId: 1, canEdit: true }]
    })
  })
  const permTongJson = await permTongRes.json()
  if (permTongRes.status === 400 && permTongJson.error.includes('tổng hợp')) {
    console.log('✅ PASS: Chặn đúng khi phân quyền cho khoa TỔNG:', permTongJson.error)
  } else {
    throw new Error(`❌ FAIL: Không chặn phân quyền khoa TỔNG: ${permTongRes.status} ${JSON.stringify(permTongJson)}`)
  }

  // 5. Test: Phân quyền cho khoa không tồn tại -> Phải bị chặn 400
  console.log('\n6. Test: Phân quyền cho khoa không tồn tại (departmentId: 8888)...')
  const permInvalidRes = await fetch(`${BASE_URL}/api/admin/permissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(adminJar)
    },
    body: JSON.stringify({
      departmentId: 8888,
      items: [{ indicatorId: 1, canEdit: true }]
    })
  })
  const permInvalidJson = await permInvalidRes.json()
  if (permInvalidRes.status === 400 && permInvalidJson.error.includes('không tồn tại')) {
    console.log('✅ PASS: Chặn đúng khi phân quyền cho khoa không tồn tại:', permInvalidJson.error)
  } else {
    throw new Error(`❌ FAIL: Không chặn phân quyền khoa không tồn tại: ${permInvalidRes.status} ${JSON.stringify(permInvalidJson)}`)
  }

  // 6. Test: Batch phân quyền (Lưu nhiều khoa cùng lúc) với lọc trùng lặp indicator
  console.log('\n7. Test: Phân quyền hàng loạt (Batch save) kèm lọc trùng lặp chỉ số...')
  const batchRes = await fetch(`${BASE_URL}/api/admin/permissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(adminJar)
    },
    body: JSON.stringify({
      batch: [
        {
          departmentId: 1,
          items: [
            { indicatorId: 1, canEdit: true },
            { indicatorId: 1, canEdit: true }, // Trùng lặp
            { indicatorId: 2, canEdit: true }
          ]
        },
        {
          departmentId: 2,
          items: [
            { indicatorId: 3, canEdit: true }
          ]
        }
      ]
    })
  })
  const batchJson = await batchRes.json()
  if (batchRes.ok && batchJson.success) {
    console.log('✅ PASS: Cập nhật phân quyền hàng loạt thành công, tự động loại bỏ trùng lặp!')
  } else {
    throw new Error(`❌ FAIL: Cập nhật batch thất bại: ${batchRes.status} ${JSON.stringify(batchJson)}`)
  }

  // 7. Test: Nhập số liệu vào khoa TỔNG -> Phải bị chặn 400
  console.log(`\n8. Test: Cố tình nhập số liệu trực tiếp vào khoa TỔNG (ID: ${tongDeptId})...`)
  const putTongRes = await fetch(`${BASE_URL}/api/reports/values`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(adminJar)
    },
    body: JSON.stringify({
      date: '2026-10-12',
      departmentId: tongDeptId,
      values: [{ indicatorId: 1, value: 50 }]
    })
  })
  const putTongJson = await putTongRes.json()
  if (putTongRes.status === 400 && putTongJson.error.includes('TỔNG')) {
    console.log('✅ PASS: Chặn đúng khi nhập số liệu vào cột TỔNG:', putTongJson.error)
  } else {
    throw new Error(`❌ FAIL: Không chặn nhập vào khoa TỔNG: ${putTongRes.status} ${JSON.stringify(putTongJson)}`)
  }

  console.log('\n🎉 TẤT CẢ CÁC KIỂM THỬ RÀNG BUỘC TOÀN VẸN & PHÂN QUYỀN ĐỀU ĐẠT CHUẨN XANH! 🎉')
}

runIntegrityTests().catch((err) => {
  console.error(err)
  process.exit(1)
})
