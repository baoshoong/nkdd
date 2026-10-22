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
  console.log('=== BẮT ĐẦU KIỂM THỬ ĐA THIẾT BỊ / ĐA MÁY KHÁCH (MULTI-CLIENT SIMULATION) ===\n')

  const testDate = '2026-10-12'

  // 1. Đăng nhập đồng thời 3 máy khách độc lập
  console.log('1. Mô phỏng 3 máy khách kết nối đồng thời:')
  console.log('   - Client 1: Điều dưỡng Khoa Nội (tài khoản "noi")')
  console.log('   - Client 2: Quản trị viên Bệnh viện (tài khoản "admin")')
  console.log('   - Client 3: Ban Giám Đốc theo dõi giao ban (tài khoản "bgd")')

  const [noiJar, adminJar, bgdJar] = await Promise.all([
    login('noi', '123456'),
    login('admin', 'admin123'),
    login('bgd', '123456')
  ])

  if (!noiJar || !adminJar || !bgdJar) {
    throw new Error('❌ Một trong 3 client đăng nhập thất bại')
  }
  console.log('✅ Cả 3 máy khách đã đăng nhập thành công và thiết lập session riêng biệt!\n')

  // 2. Client 3 (BGD) đọc ma trận ban đầu để lấy danh sách indicator
  console.log('2. Client 3 (BGD) nạp ma trận giao ban ban đầu...')
  const initRes = await fetch(`${BASE_URL}/api/reports?date=${testDate}`, {
    headers: { Cookie: cookieHeader(bgdJar) }
  })
  if (!initRes.ok) throw new Error('Không thể đọc dữ liệu báo cáo')
  const initData = await initRes.json()

  // Tìm ID của chỉ số Giường Kế hoạch (GIUONG_KH)
  const giuongKhInd = initData.indicators.find(
    (i: { code: string; id: number }) => i.code === 'GIUONG_KH'
  )
  if (!giuongKhInd) throw new Error('Không tìm thấy chỉ số GIUONG_KH')
  const giuongKhId = giuongKhInd.id

  // Tìm ID Khoa Nội (NOI) và Khoa Ngoại (NGOAI)
  const deptNoi = initData.departments.find((d: { code: string; id: number }) => d.code === 'NOI')
  const deptNgoai = initData.departments.find((d: { code: string; id: number }) => d.code === 'NGOAI')
  const deptTong = initData.departments.find((d: { isTotal: boolean; id: number }) => d.isTotal)

  if (!deptNoi || !deptNgoai || !deptTong) {
    throw new Error('Không tìm thấy khoa NOI, NGOAI hoặc TONG')
  }

  console.log(`✅ Chỉ số kiểm thử: GIUONG_KH (ID: ${giuongKhId})`)
  console.log(`   - Khoa Nội: ID ${deptNoi.id}`)
  console.log(`   - Khoa Ngoại: ID ${deptNgoai.id}`)
  console.log(`   - Cột TỔNG: ID ${deptTong.id}\n`)

  // 3. Mô phỏng Client 1 và Client 2 GỬI CẬP NHẬT ĐỒNG THỜI TRONG CÙNG MỘT GIÂY (Concurrent Updates)
  // Dùng giá trị ngẫu nhiên để luôn tạo sự thay đổi so với lần chạy trước -> đảm bảo sinh Audit Log
  const randValNoi = Math.floor(Math.random() * 20) + 40
  const randValNgoai = Math.floor(Math.random() * 20) + 60

  console.log('3. Mô phỏng 2 khoa nhập số liệu và bấm LƯU ĐỒNG THỜI:')
  console.log(`   - Client 1 (Khoa Nội) lưu GIUONG_KH = ${randValNoi}`)
  console.log(`   - Client 2 (Admin nhập cho Khoa Ngoại) lưu GIUONG_KH = ${randValNgoai}`)

  const startTime = Date.now()

  const [res1, res2] = await Promise.all([
    // Client 1 (noi) lưu dữ liệu của mình
    fetch(`${BASE_URL}/api/reports/values`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(noiJar)
      },
      body: JSON.stringify({
        date: testDate,
        values: [{ indicatorId: giuongKhId, value: randValNoi }]
      })
    }),
    // Client 2 (admin) lưu dữ liệu cho Khoa Ngoại
    fetch(`${BASE_URL}/api/reports/values`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader(adminJar)
      },
      body: JSON.stringify({
        date: testDate,
        departmentId: deptNgoai.id,
        values: [{ indicatorId: giuongKhId, value: randValNgoai }]
      })
    })
  ])

  const elapsedMs = Date.now() - startTime
  console.log(`⏱ Thời gian hoàn tất 2 request đồng thời: ${elapsedMs}ms`)

  if (!res1.ok || !res2.ok) {
    throw new Error(`❌ Request cập nhật thất bại: Client 1 status ${res1.status}, Client 2 status ${res2.status}`)
  }

  const json1 = await res1.json()
  const json2 = await res2.json()
  if (!json1.success || !json2.success) {
    throw new Error(`❌ Cập nhật không thành công: ${JSON.stringify(json1)}, ${JSON.stringify(json2)}`)
  }
  console.log('✅ Cả 2 client lưu số liệu thành công 100% trong cùng thời điểm mà không bị xung đột DB!\n')

  // 4. Client 3 (BGD) làm mới và kiểm tra tính toàn vẹn ma trận
  console.log('4. Client 3 (BGD) đọc ma trận mới để kiểm tra sự hội tụ dữ liệu:')
  const verifyRes = await fetch(`${BASE_URL}/api/reports?date=${testDate}`, {
    headers: { Cookie: cookieHeader(bgdJar) }
  })
  if (!verifyRes.ok) throw new Error('Client 3 không thể đọc dữ liệu')
  const verifyData = await verifyRes.json()

  const valNoi = verifyData.matrix[deptNoi.id]?.[giuongKhId]
  const valNgoai = verifyData.matrix[deptNgoai.id]?.[giuongKhId]
  const valTong = verifyData.matrix[deptTong.id]?.[giuongKhId]

  console.log(`   - Giá trị Khoa Nội nhận được: ${valNoi}`)
  console.log(`   - Giá trị Khoa Ngoại nhận được: ${valNgoai}`)
  console.log(`   - Giá trị Cột TỔNG tự động tính: ${valTong}`)

  if (valNoi !== randValNoi) {
    throw new Error(`❌ Sai giá trị Khoa Nội: mong đợi ${randValNoi}, nhận ${valNoi}`)
  }
  if (valNgoai !== randValNgoai) {
    throw new Error(`❌ Sai giá trị Khoa Ngoại: mong đợi ${randValNgoai}, nhận ${valNgoai}`)
  }

  // Tính tổng kỳ vọng từ tất cả các khoa lâm sàng
  let expectedSum = 0
  for (const dept of verifyData.departments) {
    if (!dept.isTotal) {
      expectedSum += verifyData.matrix[dept.id]?.[giuongKhId] || 0
    }
  }

  if (valTong !== expectedSum) {
    throw new Error(`❌ Cột TỔNG không khớp tổng các khoa: mong đợi ${expectedSum}, nhận ${valTong}`)
  }
  console.log(`✅ Cột TỔNG tự động tổng hợp chính xác ${valTong} khớp 100% với tổng các khoa!\n`)

  // 5. Kiểm tra AuditLog ghi nhận đầy đủ cả 2 client
  console.log('5. Kiểm tra Nhật ký Audit ghi nhận độc lập cả 2 thao tác:')
  const auditRes = await fetch(`${BASE_URL}/api/audit?reportDate=${testDate}&indicatorId=${giuongKhId}&limit=10`, {
    headers: { Cookie: cookieHeader(adminJar) }
  })
  if (!auditRes.ok) throw new Error('Không thể đọc Audit Log')
  const auditData = await auditRes.json()

  const hasNoiLog = auditData.data.some(
    (log: { departmentId: number; newValue: number }) =>
      log.departmentId === deptNoi.id && log.newValue === randValNoi
  )
  const hasNgoaiLog = auditData.data.some(
    (log: { departmentId: number; newValue: number }) =>
      log.departmentId === deptNgoai.id && log.newValue === randValNgoai
  )

  if (!hasNoiLog || !hasNgoaiLog) {
    throw new Error(`❌ Thiếu bản ghi audit log của một trong hai client`)
  }
  console.log('✅ Audit Log ghi nhận chính xác 2 bản ghi riêng biệt cho 2 khoa phòng và người thực hiện!\n')

  // 6. Dọn dẹp số liệu test (khôi phục Khoa Ngoại về 0)
  await fetch(`${BASE_URL}/api/reports/values`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(adminJar)
    },
    body: JSON.stringify({
      date: testDate,
      departmentId: deptNgoai.id,
      values: [{ indicatorId: giuongKhId, value: 0 }]
    })
  })

  console.log('🎉 TẤT CẢ KIỂM THỬ ĐA MÁY KHÁCH (MULTI-CLIENT) ĐỀU ĐẠT CHUẨN XANH! 🎉\n')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
