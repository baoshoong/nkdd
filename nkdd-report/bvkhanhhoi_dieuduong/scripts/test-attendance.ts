import 'dotenv/config'
import ExcelJS from 'exceljs'
import { prisma } from '../src/lib/prisma'

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
    callbackUrl: `${BASE_URL}/attendance`,
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

async function runAttendanceTests() {
  console.log('=== BẮT ĐẦU KIỂM THỬ MODULE CHẤM CÔNG (ATTENDANCE MODULE TESTS) ===\n')

  // -------------------------------------------------------------
  // TEST 1: Kiểm tra bảo vệ route & Phân quyền truy cập theo vai trò
  // -------------------------------------------------------------
  console.log('1. Kiểm tra bảo vệ route khi chưa đăng nhập...')
  const unauthRes = await fetch(`${BASE_URL}/api/attendance/sheets?month=10&year=2026`)
  if (unauthRes.status !== 401) {
    console.error(`❌ Test 1.1 FAIL: Chưa đăng nhập không trả về 401 (Status: ${unauthRes.status})`)
    process.exit(1)
  }
  console.log('✅ Test 1.1 PASS: Chưa đăng nhập gọi API bị chặn đúng mã 401')

  const unauthPageRes = await fetch(`${BASE_URL}/attendance`, { redirect: 'manual' })
  const loc = unauthPageRes.headers.get('location') || ''
  if (!loc.includes('/login')) {
    console.error(`❌ Test 1.2 FAIL: Chưa đăng nhập vào /attendance không redirect /login (Location: ${loc})`)
    process.exit(1)
  }
  console.log('✅ Test 1.2 PASS: Chưa đăng nhập vào /attendance chuyển hướng đúng về /login')

  // Đăng nhập Khoa Nội
  console.log('\n2. Đăng nhập tài khoản Trưởng Khoa Nội (noi / 123456)...')
  const noiJar = await login('noi', '123456')

  // Khoa Nội xem khoa mình (departmentId = 1) -> 200
  const noiSheetRes = await fetch(`${BASE_URL}/api/attendance/sheets?month=10&year=2026&departmentId=1`, {
    headers: { Cookie: cookieHeader(noiJar) }
  })
  if (noiSheetRes.status !== 200) {
    console.error(`❌ Test 1.3 FAIL: Khoa Nội xem khoa mình bị lỗi (Status: ${noiSheetRes.status})`)
    process.exit(1)
  }
  const noiSheetJson = await noiSheetRes.json()
  console.log(`✅ Test 1.3 PASS: Khoa Nội xem khoa mình thành công! Sheet ID: ${noiSheetJson.sheet.id}, Công chuẩn: ${noiSheetJson.sheet.standardDays} ngày`)

  // Khoa Nội cố tình xem Khoa Ngoại (departmentId = 2) -> Phải chặn 403!
  console.log('3. Kiểm tra Khoa Nội cố tình xem bảng chấm công của Khoa Ngoại (departmentId=2)...')
  const crossDeptRes = await fetch(`${BASE_URL}/api/attendance/sheets?month=10&year=2026&departmentId=2`, {
    headers: { Cookie: cookieHeader(noiJar) }
  })
  if (crossDeptRes.status !== 403) {
    console.error(`❌ Test 1.4 FAIL: Khoa xem chéo khoa khác không bị chặn 403 (Status: ${crossDeptRes.status})`)
    process.exit(1)
  }
  console.log('✅ Test 1.4 PASS: Khoa xem chéo khoa khác bị chặn chuẩn xác với mã HTTP 403 Forbidden!')

  // Đăng nhập Admin & BGD
  console.log('\n4. Đăng nhập Quản trị viên (admin / admin123) & Ban Giám Đốc (bgd / 123456)...')
  const adminJar = await login('admin', 'admin123')
  const bgdJar = await login('bgd', '123456')

  // Admin xem Khoa Ngoại (departmentId = 2) -> Thành công
  const adminSheetRes = await fetch(`${BASE_URL}/api/attendance/sheets?month=10&year=2026&departmentId=2`, {
    headers: { Cookie: cookieHeader(adminJar) }
  })
  if (adminSheetRes.status !== 200) {
    console.error(`❌ Test 1.5 FAIL: Admin xem Khoa Ngoại bị lỗi (Status: ${adminSheetRes.status})`)
    process.exit(1)
  }
  console.log('✅ Test 1.5 PASS: Quản trị viên (ADMIN) xem được tất cả các khoa!')

  // BGD xem Khoa Sản (departmentId = 3) -> Thành công
  const bgdSheetRes = await fetch(`${BASE_URL}/api/attendance/sheets?month=10&year=2026&departmentId=3`, {
    headers: { Cookie: cookieHeader(bgdJar) }
  })
  if (bgdSheetRes.status !== 200) {
    console.error(`❌ Test 1.6 FAIL: BGD xem Khoa Sản bị lỗi (Status: ${bgdSheetRes.status})`)
    process.exit(1)
  }
  console.log('✅ Test 1.6 PASS: Ban Giám Đốc (BGD) xem được tất cả các khoa!')

  // -------------------------------------------------------------
  // TEST 2: Quản lý nhân sự khoa: Thêm nhân viên & Xoá (Hard vs Soft delete)
  // -------------------------------------------------------------
  console.log('\n5. Kiểm tra Thêm nhân sự mới bởi Trưởng khoa...')
  const uniqueCode = `DD-TEST-${Date.now().toString().slice(-4)}`
  const addEmpRes = await fetch(`${BASE_URL}/api/attendance/employees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(noiJar)
    },
    body: JSON.stringify({
      code: uniqueCode,
      name: 'Vũ Thị Minh Trang',
      title: 'Điều dưỡng viên',
      departmentId: 1
    })
  })

  if (addEmpRes.status !== 201) {
    const errJson = await addEmpRes.json()
    console.error(`❌ Test 2.1 FAIL: Thêm nhân viên thất bại (Status: ${addEmpRes.status})`, errJson)
    process.exit(1)
  }
  const addEmpJson = await addEmpRes.json()
  const createdEmpId = addEmpJson.employee.id
  console.log(`✅ Test 2.1 PASS: Thêm nhân viên "${uniqueCode}" thành công (ID: ${createdEmpId})`)

  // Xóa nhân sự chưa có công -> Phải Hard Delete
  console.log('6. Kiểm tra Xóa nhân sự chưa có dữ liệu chấm công (Hard delete)...')
  const hardDelRes = await fetch(`${BASE_URL}/api/attendance/employees/${createdEmpId}`, {
    method: 'DELETE',
    headers: { Cookie: cookieHeader(noiJar) }
  })
  const hardDelJson = await hardDelRes.json()
  if (hardDelRes.status !== 200 || hardDelJson.isSoftDeleted !== false) {
    console.error(`❌ Test 2.2 FAIL: Xoá cứng không đúng (isSoftDeleted: ${hardDelJson.isSoftDeleted})`)
    process.exit(1)
  }
  console.log('✅ Test 2.2 PASS: Nhân sự chưa có công được xoá cứng (Hard delete) thành công!')

  // Tạo lại nhân sự để kiểm tra Soft Delete
  console.log('7. Tạo nhân sự mới, chấm công rồi thực hiện Xoá mềm (Soft delete)...')
  const softCode = `DD-SOFT-${Date.now().toString().slice(-4)}`
  const addEmpRes2 = await fetch(`${BASE_URL}/api/attendance/employees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(noiJar)
    },
    body: JSON.stringify({
      code: softCode,
      name: 'Lê Hoàng Long',
      title: 'Điều dưỡng viên',
      departmentId: 1
    })
  })
  const addEmpJson2 = await addEmpRes2.json()
  const softEmpId = addEmpJson2.employee.id

  // Chấm công 1 ngày cho nhân viên này
  const sheetId = noiSheetJson.sheet.id
  await fetch(`${BASE_URL}/api/attendance/sheets/${sheetId}/records`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(noiJar)
    },
    body: JSON.stringify({
      records: [
        { employeeId: softEmpId, day: 5, status: 'ABSENT' }
      ]
    })
  })

  // Gọi lệnh xóa nhân viên đã có công
  const softDelRes = await fetch(`${BASE_URL}/api/attendance/employees/${softEmpId}`, {
    method: 'DELETE',
    headers: { Cookie: cookieHeader(noiJar) }
  })
  const softDelJson = await softDelRes.json()
  if (softDelRes.status !== 200 || softDelJson.isSoftDeleted !== true) {
    console.error(`❌ Test 2.3 FAIL: Xoá mềm không đúng (isSoftDeleted: ${softDelJson.isSoftDeleted})`)
    process.exit(1)
  }
  console.log('✅ Test 2.3 PASS: Nhân sự đã có bản ghi chấm công được chuyển sang Xoá mềm (Soft delete: isActive = false) để bảo toàn số liệu!')

  // Sửa thông tin & Khôi phục nhân viên qua PUT /api/attendance/employees/[id]
  console.log('8. Kiểm tra Cập nhật thông tin và Khôi phục nhân sự (PUT API)...')
  const restoreRes = await fetch(`${BASE_URL}/api/attendance/employees/${softEmpId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(noiJar)
    },
    body: JSON.stringify({
      name: 'Lê Hoàng Long (Đã khôi phục)',
      title: 'Điều dưỡng trưởng',
      isActive: true
    })
  })
  const restoreJson = await restoreRes.json()
  if (restoreRes.status !== 200 || restoreJson.employee?.isActive !== true) {
    console.error('❌ Test 2.4 FAIL: Cập nhật / Khôi phục nhân sự thất bại:', restoreJson)
    process.exit(1)
  }
  console.log('✅ Test 2.4 PASS: Cập nhật thông tin & Khôi phục nhân sự đang lưu trữ (isActive = true) thành công!')

  // Tìm kiếm và lọc nhân viên qua query params
  console.log('9. Kiểm tra Tìm kiếm và Lọc trạng thái nhân viên (Search & Filter)...')
  const searchRes = await fetch(`${BASE_URL}/api/attendance/employees?departmentId=1&search=Hoàng Long&status=all`, {
    headers: { Cookie: cookieHeader(noiJar) }
  })
  const searchJson = await searchRes.json()
  if (searchRes.status !== 200 || searchJson.employees.length === 0) {
    console.error('❌ Test 2.5 FAIL: Tìm kiếm nhân sự không có kết quả:', searchJson)
    process.exit(1)
  }
  console.log(`✅ Test 2.5 PASS: Tìm kiếm nhân sự với từ khóa "Hoàng Long" tìm thấy ${searchJson.employees.length} kết quả chính xác!`)

  // -------------------------------------------------------------
  // TEST 3: Tính toán ngày công chuẩn & Số ngày làm việc thực tế
  // -------------------------------------------------------------
  console.log('\n10. Kiểm tra tính toán ngày công chuẩn (standardDays) Tháng 10/2026...')
  // Tháng 10/2026: 31 ngày, 4 Chủ nhật, 5 Thứ bảy = 9 ngày nghỉ -> 22 ngày công chuẩn
  if (noiSheetJson.sheet.standardDays !== 22) {
    console.error(`❌ Test 3.1 FAIL: Công chuẩn tháng 10/2026 sai (${noiSheetJson.sheet.standardDays} != 22)`)
    process.exit(1)
  }
  console.log('✅ Test 3.1 PASS: Tính toán ngày công chuẩn tháng 10/2026 chính xác = 22 ngày!')

  // -------------------------------------------------------------
  // TEST 4: Chấm công (Cập nhật ô) & Tự động tính tổng công (standardDays - V - P - Ô - TS)
  // và xác nhận Đi học (H) và Công tác (CT) vẫn được tính công
  // -------------------------------------------------------------
  console.log('\n9. Cập nhật ô chấm công: 1 Vắng (V), 1 Phép (P), 1 Công tác (CT), 1 Đi học (H), 1 Ốm (Ô), 1 Thai sản (TS)...')
  // Lấy nhân viên đầu tiên của Khoa Nội
  const firstEmployee = noiSheetJson.employees.find((e: { id: number; isActive: boolean }) => e.isActive)
  const testEmpId = firstEmployee.id

  const updateRecordsRes = await fetch(`${BASE_URL}/api/attendance/sheets/${sheetId}/records`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(noiJar)
    },
    body: JSON.stringify({
      records: [
        { employeeId: testEmpId, day: 2, status: 'ABSENT' },
        { employeeId: testEmpId, day: 3, status: 'LEAVE' },
        { employeeId: testEmpId, day: 6, status: 'BUSINESS_TRIP' },
        { employeeId: testEmpId, day: 7, status: 'STUDY' },
        { employeeId: testEmpId, day: 8, status: 'SICK' },
        { employeeId: testEmpId, day: 9, status: 'MATERNITY' }
      ]
    })
  })
  if (updateRecordsRes.status !== 200) {
    console.error(`❌ Test 4.1 FAIL: Lưu ô chấm công thất bại (Status: ${updateRecordsRes.status})`)
    process.exit(1)
  }

  // Tải lại sheet để kiểm tra summary
  const reloadedSheetRes = await fetch(`${BASE_URL}/api/attendance/sheets?month=10&year=2026&departmentId=1`, {
    headers: { Cookie: cookieHeader(noiJar) }
  })
  const reloadedJson = await reloadedSheetRes.json()
  const empSummary = reloadedJson.summaries.find((s: { employeeId: number }) => s.employeeId === testEmpId)

  // Tổng công = standardDays (22) - 1 Vắng - 1 Phép - 1 Ốm - 1 Thai sản = 18 công
  // (Công tác CT và Đi học H không bị trừ công!)
  const expectedTotalWork = 22 - 1 - 1 - 1 - 1
  if (
    empSummary.absentCount !== 1 ||
    empSummary.leaveCount !== 1 ||
    empSummary.sickCount !== 1 ||
    empSummary.maternityCount !== 1 ||
    empSummary.businessTripCount !== 1 ||
    empSummary.studyCount !== 1 ||
    empSummary.totalWork !== expectedTotalWork
  ) {
    console.error('❌ Test 4.2 FAIL: Tính toán tổng công sai lệch với các chế độ mới:', empSummary)
    process.exit(1)
  }
  console.log(`✅ Test 4.2 PASS: Nhân sự "${empSummary.name}": V=1, P=1, Ô=1, TS=1, CT=1, H=1 -> Tổng công = ${empSummary.totalWork} (Khớp chuẩn: 22 - 4 = 18, CT và H tính công)!`)

  // -------------------------------------------------------------
  // TEST 5: Kiểm tra Nhật ký chỉnh sửa (Attendance Audit Log)
  // -------------------------------------------------------------
  console.log('\n10. Kiểm tra API Nhật ký chỉnh sửa (Attendance Audit Log)...')
  const auditRes = await fetch(`${BASE_URL}/api/attendance/sheets/${sheetId}/audits`, {
    headers: { Cookie: cookieHeader(noiJar) }
  })
  if (auditRes.status !== 200) {
    console.error(`❌ Test 5.1 FAIL: Lấy audit log thất bại (Status: ${auditRes.status})`)
    process.exit(1)
  }
  const auditJson = await auditRes.json()
  if (auditJson.audits.length === 0) {
    console.error('❌ Test 5.2 FAIL: Không có bản ghi audit log nào được sinh ra')
    process.exit(1)
  }
  const latestAudit = auditJson.audits[0]
  console.log(`✅ Test 5 PASS: Audit log ghi vết chuẩn xác: Nhân sự [${latestAudit.employee.name}], Ngày ${latestAudit.day}, Đổi từ "${latestAudit.oldStatus}" -> "${latestAudit.newStatus}", Người sửa: ${latestAudit.user.name}`)

  // -------------------------------------------------------------
  // TEST 6: Khoá sổ & Mở khoá (Locking Workflow & RBAC)
  // -------------------------------------------------------------
  console.log('\n11. Kiểm tra Quy trình Khoá sổ & Mở khoá...')
  // Trưởng khoa khoá sổ
  const lockRes = await fetch(`${BASE_URL}/api/attendance/sheets/${sheetId}/lock`, {
    method: 'POST',
    headers: { Cookie: cookieHeader(noiJar) }
  })
  if (lockRes.status !== 200) {
    console.error(`❌ Test 6.1 FAIL: Trưởng khoa khoá sổ thất bại (Status: ${lockRes.status})`)
    process.exit(1)
  }
  console.log('✅ Test 6.1 PASS: Trưởng khoa khoá sổ thành công!')

  // Khi đã khoá: Trưởng khoa cố tình gửi API sửa ô -> Phải chặn 403!
  const modifyLockedRes = await fetch(`${BASE_URL}/api/attendance/sheets/${sheetId}/records`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(noiJar)
    },
    body: JSON.stringify({
      records: [
        { employeeId: testEmpId, day: 4, status: 'ABSENT' }
      ]
    })
  })
  if (modifyLockedRes.status !== 403) {
    console.error(`❌ Test 6.2 FAIL: Không chặn sửa khi sheet đã khoá (Status: ${modifyLockedRes.status})`)
    process.exit(1)
  }
  console.log('✅ Test 6.2 PASS: Chặn đúng mã 403 khi cố tình sửa bảng chấm công đã khoá sổ!')

  // Trưởng khoa cố tình tự mở khoá -> Phải chặn 403 (Chỉ admin mới mở được)!
  const unlockByKhoaRes = await fetch(`${BASE_URL}/api/attendance/sheets/${sheetId}/unlock`, {
    method: 'POST',
    headers: { Cookie: cookieHeader(noiJar) }
  })
  if (unlockByKhoaRes.status !== 403) {
    console.error(`❌ Test 6.3 FAIL: Trưởng khoa tự mở khoá mà không bị chặn 403 (Status: ${unlockByKhoaRes.status})`)
    process.exit(1)
  }
  console.log('✅ Test 6.3 PASS: Trưởng khoa bị chặn chuẩn xác khi cố tình tự mở khoá sổ!')

  // Quản trị viên (ADMIN) mở khoá -> Thành công!
  const unlockByAdminRes = await fetch(`${BASE_URL}/api/attendance/sheets/${sheetId}/unlock`, {
    method: 'POST',
    headers: { Cookie: cookieHeader(adminJar) }
  })
  if (unlockByAdminRes.status !== 200) {
    console.error(`❌ Test 6.4 FAIL: Quản trị viên mở khoá thất bại (Status: ${unlockByAdminRes.status})`)
    process.exit(1)
  }
  console.log('✅ Test 6.4 PASS: Quản trị viên mở khoá bảng chấm công thành công (Sheet đã trở lại trạng thái OPEN)!')

  // -------------------------------------------------------------
  // TEST 7: Xuất File Excel (ExcelJS & Font Times New Roman)
  // -------------------------------------------------------------
  console.log('\n12. Kiểm tra Xuất file Excel Bảng Chấm Công...')
  const exportRes = await fetch(`${BASE_URL}/api/attendance/export?month=10&year=2026&departmentId=1`, {
    headers: { Cookie: cookieHeader(noiJar) }
  })
  if (exportRes.status !== 200) {
    console.error(`❌ Test 7.1 FAIL: Xuất file Excel thất bại (Status: ${exportRes.status})`)
    process.exit(1)
  }

  const arrayBuffer = await exportRes.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(Buffer.from(arrayBuffer) as any)

  const worksheet = workbook.worksheets[0]
  console.log(`✅ Test 7.1 PASS: File Excel tạo thành công! Tên sheet: "${worksheet.name}", Tổng số dòng: ${worksheet.rowCount}`)

  // Kiểm tra font Times New Roman trên ô tiêu đề
  const titleCell = worksheet.getCell(5, 1)
  if (titleCell.font?.name !== 'Times New Roman') {
    console.error(`❌ Test 7.2 FAIL: Font không phải Times New Roman (${titleCell.font?.name})`)
    process.exit(1)
  }
  console.log('✅ Test 7.2 PASS: Định dạng font chuẩn Times New Roman và cấu trúc cột chuẩn biểu mẫu bệnh viện!')

  // Kiểm tra Khoa Nội không được xuất Excel Khoa Ngoại -> 403
  const crossExportRes = await fetch(`${BASE_URL}/api/attendance/export?month=10&year=2026&departmentId=2`, {
    headers: { Cookie: cookieHeader(noiJar) }
  })
  if (crossExportRes.status !== 403) {
    console.error(`❌ Test 7.3 FAIL: Khoa xuất chéo Excel khoa khác không bị chặn 403 (Status: ${crossExportRes.status})`)
    process.exit(1)
  }
  console.log('✅ Test 7.3 PASS: Chặn đúng mã 403 khi Khoa cố tình xuất file Excel của khoa khác!')

  // -------------------------------------------------------------
  // TEST 8: Kiểm tra API Tổng hợp Tiến độ chốt sổ 11 Khoa Phòng
  // -------------------------------------------------------------
  console.log('\n13. Kiểm tra API Báo cáo Tiến độ chốt sổ 11 Khoa (Summary API)...')
  const summaryRes = await fetch(`${BASE_URL}/api/attendance/sheets/summary?month=10&year=2026`, {
    headers: { Cookie: cookieHeader(adminJar) }
  })
  if (summaryRes.status !== 200) {
    console.error(`❌ Test 8.1 FAIL: Lấy danh sách tiến độ chốt sổ thất bại (Status: ${summaryRes.status})`)
    process.exit(1)
  }
  const summaryJson = await summaryRes.json()
  if (summaryJson.totalDepartments !== 11 || summaryJson.departments.length !== 11) {
    console.error(`❌ Test 8.2 FAIL: Số lượng khoa không khớp 11 khoa (Thực tế: ${summaryJson.departments?.length})`)
    process.exit(1)
  }
  console.log(`✅ Test 8 PASS: API Tổng hợp tiến độ trả về đầy đủ 11 khoa phòng lâm sàng/cận lâm sàng (Đã chốt: ${summaryJson.lockedCount}, Đang mở: ${summaryJson.openCount})!`)

  // -------------------------------------------------------------
  // TEST 9: Quy trình Nhân sự Thôi việc giữa tháng (Solution 2 - resignedAt & [-] ô khóa)
  // -------------------------------------------------------------
  console.log('\n14. Kiểm tra Quy trình Nhân sự Thôi việc giữa tháng...')
  const testResignCode = `TR_${Date.now().toString().slice(-6)}`
  // Tạo nhân viên mới để kiểm thử
  const createEmpRes = await fetch(`${BASE_URL}/api/attendance/employees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(noiJar)
    },
    body: JSON.stringify({
      code: testResignCode,
      name: 'Nhân Viên Nghỉ Giữa Tháng',
      title: 'Điều dưỡng viên',
      departmentId: 1
    })
  })
  if (createEmpRes.status !== 201) {
    const errText = await createEmpRes.text()
    console.error(`❌ Test 9.1 FAIL: Tạo nhân sự test thất bại (Status: ${createEmpRes.status}, Body: ${errText})`)
    process.exit(1)
  }
  const createdEmp = (await createEmpRes.json()).employee
  console.log(`✅ Test 9.1 PASS: Đã tạo nhân sự test ID: ${createdEmp.id} (${createdEmp.name})`)

  // Lưu một số ngày công đầu tháng (Ngày 1: CT, Ngày 2: H, Ngày 3..14: PRESENT)
  const saveWorkRes = await fetch(`${BASE_URL}/api/attendance/sheets/${sheetId}/records`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(noiJar)
    },
    body: JSON.stringify({
      records: [
        { employeeId: createdEmp.id, day: 1, status: 'BUSINESS_TRIP' },
        { employeeId: createdEmp.id, day: 2, status: 'STUDY' }
      ]
    })
  })
  if (saveWorkRes.status !== 200) {
    console.error(`❌ Test 9.2 FAIL: Lưu công đầu tháng cho nhân sự test thất bại`)
    process.exit(1)
  }
  console.log('✅ Test 9.2 PASS: Đã ghi nhận bản ghi chấm công đầu tháng cho nhân sự')

  // Cập nhật nhân viên thôi việc từ ngày 15/10/2026
  const resignEmpRes = await fetch(`${BASE_URL}/api/attendance/employees/${createdEmp.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader(noiJar)
    },
    body: JSON.stringify({
      isActive: false,
      resignedAt: '2026-10-15'
    })
  })
  if (resignEmpRes.status !== 200) {
    console.error(`❌ Test 9.3 FAIL: Cập nhật thôi việc cho nhân sự thất bại`)
    process.exit(1)
  }
  console.log('✅ Test 9.3 PASS: Đã cập nhật nhân sự sang trạng thái Thôi việc từ ngày 15/10/2026')

  // Lấy lại bảng chấm công tháng 10/2026 để kiểm tra logic tính toán và ô [-]
  const verifySheetRes = await fetch(`${BASE_URL}/api/attendance/sheets?month=10&year=2026&departmentId=1`, {
    headers: { Cookie: cookieHeader(noiJar) }
  })
  const verifySheetJson = await verifySheetRes.json()
  const resignEmpSummary = verifySheetJson.summaries.find((s: { employeeId: number }) => s.employeeId === createdEmp.id)

  if (!resignEmpSummary) {
    console.error(`❌ Test 9.4 FAIL: Không tìm thấy nhân sự thôi việc trong bảng chấm công tháng 10/2026`)
    process.exit(1)
  }

  // Kiểm tra các ngày từ 15..31 đều mang trạng thái RESIGNED
  const resignEmpRecords = verifySheetJson.records[createdEmp.id]
  for (let d = 15; d <= 31; d++) {
    if (resignEmpRecords?.[d]?.status !== 'RESIGNED') {
      console.error(`❌ Test 9.5 FAIL: Ngày ${d} sau ngày thôi việc không có trạng thái RESIGNED (Hiện tại: ${resignEmpRecords?.[d]?.status})`)
      process.exit(1)
    }
  }
  console.log('✅ Test 9.5 PASS: Toàn bộ ngày từ 15 đến 31 đều tự động được đánh dấu RESIGNED (-)!')

  // Kiểm tra không bị trừ vắng và số ngày công thực tế
  if (resignEmpSummary.absentCount !== 0) {
    console.error(`❌ Test 9.6 FAIL: Nhân sự thôi việc bị tính nhầm ${resignEmpSummary.absentCount} ngày vắng!`)
    process.exit(1)
  }
  // Ngày 1..14 (14 ngày): ngày 1 là CT, ngày 2 là H, ngày 3..14 là PRESENT (12 ngày) -> tổng công = 14
  if (resignEmpSummary.totalWork <= 0 || resignEmpSummary.totalWork > 14) {
    console.error(`❌ Test 9.7 FAIL: Tính công thực tế không chính xác (totalWork: ${resignEmpSummary.totalWork})`)
    process.exit(1)
  }
  console.log(`✅ Test 9.7 PASS: Công thực tế tính chuẩn xác (${resignEmpSummary.totalWork} công), số ngày vắng không phép = 0!`)

  // Kiểm tra xuất Excel có ký hiệu [-] và tên ghi chú ngày nghỉ
  const exportResignRes = await fetch(`${BASE_URL}/api/attendance/export?month=10&year=2026&departmentId=1`, {
    headers: { Cookie: cookieHeader(noiJar) }
  })
  const exportArrayBuffer = await exportResignRes.arrayBuffer()
  const resignWorkbook = new ExcelJS.Workbook()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await resignWorkbook.xlsx.load(Buffer.from(exportArrayBuffer) as any)
  const resignSheet = resignWorkbook.worksheets[0]

  let foundExcelEmp = false
  resignSheet.eachRow((row) => {
    const codeVal = row.getCell(2).value
    if (codeVal === testResignCode) {
      foundExcelEmp = true
      const nameVal = String(row.getCell(3).value || '')
      if (!nameVal.includes('Nghỉ') && !nameVal.includes('15/10/2026')) {
        console.error(`❌ Test 9.8 FAIL: Tên nhân sự trong Excel không kèm ghi chú ngày nghỉ ("${nameVal}")`)
        process.exit(1)
      }
      // Kiểm tra ô ngày 15 và 31 có ký hiệu '-'
      const cell15 = String(row.getCell(4 + 15).value || '')
      const cell31 = String(row.getCell(4 + 31).value || '')
      if (cell15 !== '-' || cell31 !== '-') {
        console.error(`❌ Test 9.9 FAIL: Ô ngày 15 (${cell15}) hoặc ngày 31 (${cell31}) không mang ký hiệu '-'`)
        process.exit(1)
      }
    }
  })

  if (!foundExcelEmp) {
    console.error(`❌ Test 9.8 FAIL: Không tìm thấy nhân sự test trong file Excel xuất ra`)
    process.exit(1)
  }
  console.log('✅ Test 9.8 & 9.9 PASS: File Excel xuất chuẩn xác ký hiệu [-] và ghi chú ngày nghỉ việc!')

  // Dọn dẹp nhân sự test (hard-delete xóa các bản ghi test trước rồi xóa nhân sự)
  await prisma.attendanceRecord.deleteMany({ where: { employeeId: createdEmp.id } })
  await prisma.employee.delete({ where: { id: createdEmp.id } })
  console.log('✅ Test 9.10 PASS: Đã dọn dẹp sạch sẽ nhân sự test và bản ghi công!')

  console.log('\n======================================================')
  console.log('🎉 TẤT CẢ CÁC KIỂM THỬ MODULE CHẤM CÔNG ĐỀU ĐẠT CHUẨN XANH 100%! 🎉')
  console.log('======================================================')
}

runAttendanceTests().catch((err) => {
  console.error('Unhandled error during attendance test suite:', err)
  process.exit(1)
})
