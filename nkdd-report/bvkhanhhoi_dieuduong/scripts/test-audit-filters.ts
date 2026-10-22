import ExcelJS from 'exceljs'

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
  console.log('=== BẮT ĐẦU TEST TÍNH NĂNG AUDIT LOG: BỘ LỌC ĐA TIÊU CHÍ & XUẤT EXCEL ===\n')

  // 1. Kiểm tra quyền truy cập không hợp lệ
  console.log('1. Kiểm tra bảo vệ quyền khi chưa đăng nhập...')
  const unauthRes = await fetch(`${BASE_URL}/api/audit`)
  if (unauthRes.status === 401) {
    console.log('✅ Chặn đúng với mã 401 khi chưa đăng nhập /api/audit')
  } else {
    throw new Error(`❌ Mong đợi status 401, nhận: ${unauthRes.status}`)
  }

  const unauthExportRes = await fetch(`${BASE_URL}/api/audit/export`)
  if (unauthExportRes.status === 401) {
    console.log('✅ Chặn đúng với mã 401 khi chưa đăng nhập /api/audit/export')
  } else {
    throw new Error(`❌ Mong đợi status 401, nhận: ${unauthExportRes.status}`)
  }

  // 2. Đăng nhập user KHOA_USER noi / 123456 -> mong đợi 403
  console.log('\n2. Kiểm tra chặn KHOA_USER truy cập audit...')
  const noiJar = await login('noi', '123456')
  if (!noiJar) throw new Error('Không thể đăng nhập user noi')

  const noiAuditRes = await fetch(`${BASE_URL}/api/audit`, {
    headers: { Cookie: cookieHeader(noiJar) }
  })
  if (noiAuditRes.status === 403) {
    console.log('✅ Chặn đúng KHOA_USER với mã 403 khi truy cập /api/audit')
  } else {
    throw new Error(`❌ Mong đợi status 403, nhận: ${noiAuditRes.status}`)
  }

  // 3. Đăng nhập Admin
  console.log('\n3. Đăng nhập Quản trị viên (admin / admin123)...')
  const adminJar = await login('admin', 'admin123')
  if (!adminJar) throw new Error('Không thể đăng nhập admin')
  console.log('✅ Admin đăng nhập thành công')

  // 4. Lấy danh sách audit ban đầu và danh mục filter
  console.log('\n4. Kiểm tra API /api/audit mặc định...')
  const auditRes = await fetch(`${BASE_URL}/api/audit`, {
    headers: { Cookie: cookieHeader(adminJar) }
  })
  if (!auditRes.ok) throw new Error(`Lỗi /api/audit: ${auditRes.status}`)
  const auditJson = await auditRes.json()

  console.log(`✅ Lấy thành công: ${auditJson.data.length} bản ghi, tổng ${auditJson.pagination.total}`)
  if (
    !auditJson.filters?.departments?.length ||
    !auditJson.filters?.indicators?.length ||
    !auditJson.filters?.users?.length
  ) {
    throw new Error('❌ Thiếu danh mục filters (departments, indicators, users)')
  }
  console.log(
    `✅ Danh mục filters đầy đủ: ${auditJson.filters.departments.length} khoa, ${auditJson.filters.indicators.length} chỉ số, ${auditJson.filters.users.length} người dùng`
  )

  // 5. Test lọc theo ngày báo cáo (reportDate)
  console.log('\n5. Test lọc theo ngày báo cáo reportDate=2026-10-12...')
  const dateAuditRes = await fetch(`${BASE_URL}/api/audit?reportDate=2026-10-12`, {
    headers: { Cookie: cookieHeader(adminJar) }
  })
  if (!dateAuditRes.ok) throw new Error(`Lỗi lọc theo ngày: ${dateAuditRes.status}`)
  const dateAuditJson = await dateAuditRes.json()
  console.log(`Số bản ghi ngày 2026-10-12: ${dateAuditJson.data.length}`)
  for (const item of dateAuditJson.data) {
    if (item.reportDate !== '2026-10-12') {
      throw new Error(`❌ Bản ghi không đúng ngày: ${item.reportDate}`)
    }
  }
  console.log('✅ Bộ lọc theo ngày báo cáo hoạt động chính xác 100%!')

  // 6. Test lọc theo khoa phòng (departmentId = 1)
  console.log('\n6. Test lọc theo khoa phòng departmentId=1...')
  const deptAuditRes = await fetch(`${BASE_URL}/api/audit?departmentId=1`, {
    headers: { Cookie: cookieHeader(adminJar) }
  })
  if (!deptAuditRes.ok) throw new Error(`Lỗi lọc theo khoa: ${deptAuditRes.status}`)
  const deptAuditJson = await deptAuditRes.json()
  console.log(`Số bản ghi khoa ID=1: ${deptAuditJson.data.length}`)
  for (const item of deptAuditJson.data) {
    if (item.departmentId !== 1) {
      throw new Error(`❌ Bản ghi không đúng khoa: ${item.departmentId}`)
    }
  }
  console.log('✅ Bộ lọc theo khoa phòng hoạt động chính xác 100%!')

  // 7. Test xuất file Excel theo ngày báo cáo
  console.log('\n7. Test API xuất Excel /api/audit/export?reportDate=2026-10-12...')
  const exportRes = await fetch(`${BASE_URL}/api/audit/export?reportDate=2026-10-12`, {
    headers: { Cookie: cookieHeader(adminJar) }
  })
  if (!exportRes.ok) throw new Error(`Lỗi xuất excel: ${exportRes.status}`)

  const contentType = exportRes.headers.get('content-type') || ''
  if (!contentType.includes('spreadsheetml.sheet')) {
    throw new Error(`❌ Content-Type không hợp lệ: ${contentType}`)
  }

  const arrayBuffer = await exportRes.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(Buffer.from(arrayBuffer) as any)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) throw new Error('❌ File Excel không có worksheet')
  console.log(`Tên Sheet: "${worksheet.name}", Tổng số dòng: ${worksheet.rowCount}`)

  // Kiểm tra tiêu đề
  const cellA1 = worksheet.getCell('A1').value?.toString()
  const cellA2 = worksheet.getCell('A2').value?.toString()
  if (!cellA1?.includes('BỆNH VIỆN ĐA KHOA KHÁNH HỘI')) {
    throw new Error(`❌ Sai tiêu đề viện: ${cellA1}`)
  }
  if (!cellA2?.includes('AUDIT LOG')) {
    throw new Error(`❌ Sai tiêu đề báo cáo: ${cellA2}`)
  }
  console.log('✅ Cấu trúc file Excel chuẩn chỉnh, mở bằng ExcelJS thành công!')

  console.log('\n🎉 TẤT CẢ KIỂM THỬ BỘ LỌC AUDIT LOG & XUẤT EXCEL ĐỀU ĐẠT CHUẨN XANH! 🎉\n')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
