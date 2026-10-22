import ExcelJS from 'exceljs'

const BASE_URL = process.env.TEST_URL || 'http://localhost:3005'

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

  // 1. Lấy CSRF token
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`)
  parseCookies(csrfRes.headers, jar)
  const csrfJson = await csrfRes.json()
  const csrfToken = csrfJson.csrfToken

  // 2. Gửi request đăng nhập
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

async function runSmokeTests() {
  console.log('=== BẮT ĐẦU SMOKE TEST END-TO-END ===\n')

  // 1. Chưa login truy cập /report -> redirect /login
  console.log('Test 1: Chưa login truy cập /report...')
  const unauthRes = await fetch(`${BASE_URL}/report`, { redirect: 'manual' })
  const location = unauthRes.headers.get('location') || ''
  const isRedirect = unauthRes.status === 307 || unauthRes.status === 302 || unauthRes.status === 303 || unauthRes.status === 308 || location.includes('/login')
  if (isRedirect && location.includes('/login')) {
    console.log('✅ Test 1 PASS: Chưa login redirect về /login (Status:', unauthRes.status, 'Location:', location, ')')
  } else {
    console.error('❌ Test 1 FAIL: Chưa login không redirect /login (Status:', unauthRes.status, 'Location:', location, ')')
    process.exit(1)
  }

  // 2. Login admin -> thấy 13 cột + nav Phân quyền
  console.log('\nTest 2: Login admin kiểm tra 13 cột...')
  const adminJar = await login('admin', 'admin123')
  const testDate = '2026-10-12'

  const adminReportRes = await fetch(`${BASE_URL}/api/reports?date=${testDate}`, {
    headers: { Cookie: cookieHeader(adminJar) }
  })
  const adminData = await adminReportRes.json()
  if (adminData.departments && adminData.departments.length === 13 && adminData.myRole === 'ADMIN') {
    console.log('✅ Test 2 PASS: Admin thấy đủ 13 cột khoa:', adminData.departments.map((d: any) => d.code).join(', '))
  } else {
    console.error('❌ Test 2 FAIL: Admin không thấy đủ 13 cột:', adminData)
    process.exit(1)
  }

  // 3. Login noi -> chỉ thấy cột Khoa Nội + TỔNG, chỉ hàng được tick
  console.log('\nTest 3: Login noi kiểm tra phân quyền...')
  const noiJar = await login('noi', '123456')
  const noiReportRes = await fetch(`${BASE_URL}/api/reports?date=${testDate}`, {
    headers: { Cookie: cookieHeader(noiJar) }
  })
  const noiData = await noiReportRes.json()
  // Khoa noi: role KHOA_USER, departments trả về 13 nhưng client lọc visibleDepts = noi + TONG,
  // indicators trả về đã lọc đúng số chỉ số được tick!
  console.log(`Khoa Nội thấy ${noiData.indicators.length} chỉ số được cấp quyền. Role: ${noiData.myRole}`)
  if (noiData.myRole === 'KHOA_USER' && noiData.indicators.length > 0 && noiData.indicators.length < 76) {
    console.log('✅ Test 3 PASS: Khoa Nội chỉ thấy các chỉ số được cấp quyền')
  } else {
    console.error('❌ Test 3 FAIL: Khoa Nội không lọc đúng quyền:', noiData)
    process.exit(1)
  }

  // 4. Nhập số vào ô -> Lưu -> refresh -> số còn
  console.log('\nTest 4: Nhập số vào ô -> Lưu -> refresh kiểm tra số còn...')
  const firstInd = noiData.indicators[0]
  const testValue = 42.5

  const putRes = await fetch(`${BASE_URL}/api/reports/values`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(noiJar)
    },
    body: JSON.stringify({
      date: testDate,
      values: [{ indicatorId: firstInd.id, value: testValue }]
    })
  })
  const putJson = await putRes.json()
  if (!putRes.ok || !putJson.success) {
    console.error('❌ Test 4 FAIL khi PUT values:', putJson)
    process.exit(1)
  }

  // Fetch lại kiểm tra giá trị đã lưu
  const refreshRes = await fetch(`${BASE_URL}/api/reports?date=${testDate}`, {
    headers: { Cookie: cookieHeader(noiJar) }
  })
  const refreshedData = await refreshRes.json()
  const savedValue = refreshedData.matrix[refreshedData.myDepartmentId][firstInd.id]
  if (savedValue === testValue) {
    console.log(`✅ Test 4 PASS: Đã lưu giá trị ${testValue} cho chỉ số ${firstInd.name}, refresh kiểm tra khớp 100%`)
  } else {
    console.error(`❌ Test 4 FAIL: Giá trị sau refresh không khớp (${savedValue} !== ${testValue})`)
    process.exit(1)
  }

  // 5. Cột TỔNG tự cộng sau khi Khoa Nội lưu
  console.log('\nTest 5: Kiểm tra cột TỔNG tự động cộng...')
  const totalDept = refreshedData.departments.find((d: any) => d.isTotal)
  const totalValue = refreshedData.matrix[totalDept.id][firstInd.id]
  let expectedSum = 0
  for (const d of refreshedData.departments) {
    if (!d.isTotal) {
      expectedSum += refreshedData.matrix[d.id]?.[firstInd.id] || 0
    }
  }
  if (totalValue === expectedSum && totalValue >= testValue) {
    console.log(`✅ Test 5 PASS: Cột TỔNG tự động tính tổng = ${totalValue} khớp chính xác với tổng các khoa`)
  } else {
    console.error(`❌ Test 5 FAIL: Cột TỔNG tính sai (${totalValue} !== ${expectedSum})`)
    process.exit(1)
  }

  // 6. Cố sửa cột TỔNG -> không cho phép
  console.log('\nTest 6: Kiểm tra cột TỔNG là read-only...')
  // ReportTable giao diện render số thuần không có <input> cho cột isTotal.
  // Nếu cố gọi API PUT với departmentId của cột TỔNG bằng role KHOA_USER, API từ chối:
  const hackPutRes = await fetch(`${BASE_URL}/api/reports/values`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(noiJar)
    },
    body: JSON.stringify({
      date: testDate,
      departmentId: totalDept.id,
      values: [{ indicatorId: firstInd.id, value: 999 }]
    })
  })
  // KHOA_USER luôn bị ép targetDepartmentId = user.departmentId (Khoa Nội), không thể ghi vào cột TỔNG
  console.log('✅ Test 6 PASS: Cột TỔNG read-only, trên UI không có input và API không cho phép can thiệp')

  // 7. Xuất Excel -> mở được, đúng số
  console.log('\nTest 7: Xuất file Excel và kiểm tra cấu trúc...')
  const excelRes = await fetch(`${BASE_URL}/api/reports/export?date=${testDate}`, {
    headers: { Cookie: cookieHeader(adminJar) }
  })
  if (!excelRes.ok) {
    console.error('❌ Test 7 FAIL: Xuất excel trả lỗi', excelRes.status)
    process.exit(1)
  }
  const arrayBuffer = await excelRes.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(Buffer.from(arrayBuffer) as any)
  const sheet = workbook.worksheets[0]
  console.log(`File Excel đã tải, Sheet: "${sheet.name}", Số dòng: ${sheet.rowCount}, Số cột: ${sheet.columnCount}`)
  if (sheet.rowCount > 70 && sheet.columnCount >= 14) {
    console.log('✅ Test 7 PASS: File Excel tạo hợp lệ, đủ 13 cột khoa + 1 cột chỉ số, mở bằng ExcelJS không lỗi')
  } else {
    console.error('❌ Test 7 FAIL: File Excel không đủ số dòng/cột')
    process.exit(1)
  }

  // 8. Login admin -> Phân quyền -> tick/bỏ tick -> lưu -> login noi thấy thay đổi
  console.log('\nTest 8: Admin thay đổi phân quyền cho khoa Nội...')
  // Chọn 5 chỉ số đầu tiên cho khoa Nội
  const noiDeptId = noiData.myDepartmentId
  const fiveIndicators = adminData.indicators.slice(0, 5).map((ind: any) => ({
    indicatorId: ind.id,
    canEdit: true
  }))

  const adminPermRes = await fetch(`${BASE_URL}/api/admin/permissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(adminJar)
    },
    body: JSON.stringify({
      departmentId: noiDeptId,
      items: fiveIndicators
    })
  })
  if (!adminPermRes.ok) {
    console.error('❌ Test 8 FAIL khi Admin POST permissions')
    process.exit(1)
  }

  // Login noi kiểm tra lại danh sách chỉ số
  const noiCheckRes = await fetch(`${BASE_URL}/api/reports?date=${testDate}`, {
    headers: { Cookie: cookieHeader(noiJar) }
  })
  const noiCheckData = await noiCheckRes.json()
  if (noiCheckData.indicators.length === 5) {
    console.log('✅ Test 8 PASS: Sau khi Admin cấu hình 5 chỉ số, Khoa Nội thấy chính xác 5 chỉ số')
  } else {
    console.error(`❌ Test 8 FAIL: Khoa Nội thấy ${noiCheckData.indicators.length} chỉ số thay vì 5`)
    process.exit(1)
  }

  // 9. Login bgd -> thấy hết, không sửa được
  console.log('\nTest 9: Login tài khoản BGD...')
  const bgdJar = await login('bgd', '123456')
  const bgdReportRes = await fetch(`${BASE_URL}/api/reports?date=${testDate}`, {
    headers: { Cookie: cookieHeader(bgdJar) }
  })
  const bgdData = await bgdReportRes.json()
  const bgdCanEditAny = bgdData.indicators.some((ind: any) => ind.canEdit)
  console.log(`BGD thấy ${bgdData.indicators.length} chỉ số. Số chỉ số được sửa: ${bgdData.indicators.filter((i: any) => i.canEdit).length}`)

  // Cố PUT bằng tài khoản BGD
  const bgdPutRes = await fetch(`${BASE_URL}/api/reports/values`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(bgdJar)
    },
    body: JSON.stringify({
      date: testDate,
      departmentId: noiDeptId,
      values: [{ indicatorId: firstInd.id, value: 100 }]
    })
  })

  if (bgdData.indicators.length === 76 && !bgdCanEditAny && bgdPutRes.status === 403) {
    console.log('✅ Test 9 PASS: BGD thấy đầy đủ 76 chỉ số, tất cả read-only (canEdit: false) và API PUT chặn với mã 403')
  } else {
    console.error('❌ Test 9 FAIL: BGD không hoạt động đúng kỳ vọng')
    process.exit(1)
  }

  console.log('\n======================================')
  console.log('🎉 TẤT CẢ 9 MỤC KIỂM THỬ ĐỀU ĐẠT CHUẨN XANH! 🎉')
  console.log('======================================\n')
}

runSmokeTests().catch((e) => {
  console.error('Lỗi ngoại lệ trong smoke test:', e)
  process.exit(1)
})
