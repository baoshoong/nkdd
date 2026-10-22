import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  getDaysInMonth,
  getMonthHolidays,
  calculateStandardDays
} from '@/lib/attendance-utils'

// GET /api/attendance/export?month=10&year=2026&departmentId=...
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const user = session.user

  const now = new Date()
  const monthParam = searchParams.get('month')
  const yearParam = searchParams.get('year')
  const deptIdParam = searchParams.get('departmentId')

  const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1
  const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear()

  if (isNaN(month) || month < 1 || month > 12 || isNaN(year) || year < 2000) {
    return NextResponse.json({ error: 'Thời gian không hợp lệ' }, { status: 400 })
  }

  let targetDeptId: number
  if (user.role === 'KHOA_USER') {
    if (!user.departmentId) {
      return NextResponse.json({ error: 'Tài khoản chưa được gán khoa phòng' }, { status: 403 })
    }
    if (deptIdParam && parseInt(deptIdParam, 10) !== user.departmentId) {
      return NextResponse.json(
        { error: 'Bạn không có quyền xuất dữ liệu của khoa phòng khác' },
        { status: 403 }
      )
    }
    targetDeptId = user.departmentId
  } else {
    if (deptIdParam) {
      targetDeptId = parseInt(deptIdParam, 10)
    } else if (user.departmentId) {
      targetDeptId = user.departmentId
    } else {
      const firstDept = await prisma.department.findFirst({
        where: { isActive: true, isTotal: false },
        orderBy: { sortOrder: 'asc' }
      })
      if (!firstDept) {
        return NextResponse.json({ error: 'Khoa phòng không tồn tại' }, { status: 404 })
      }
      targetDeptId = firstDept.id
    }
  }

  const department = await prisma.department.findUnique({
    where: { id: targetDeptId }
  })
  if (!department) {
    return NextResponse.json({ error: 'Khoa phòng không tồn tại' }, { status: 404 })
  }

  const daysInMonth = getDaysInMonth(year, month)
  const holidays = await getMonthHolidays(year, month)
  const holidayDaySet = new Set(holidays.map((h) => h.day))
  const standardDays = await calculateStandardDays(year, month)

  // Lấy sheet và records
  const sheet = await prisma.attendanceSheet.findUnique({
    where: {
      departmentId_month_year: {
        departmentId: targetDeptId,
        month,
        year
      }
    }
  })

  const records = sheet
    ? await prisma.attendanceRecord.findMany({ where: { sheetId: sheet.id } })
    : []

  const startOfMonth = new Date(year, month - 1, 1)
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999)

  const activeEmployees = await prisma.employee.findMany({
    where: { departmentId: targetDeptId, isActive: true },
    orderBy: { code: 'asc' }
  })

  const activeEmployeeIds = new Set(activeEmployees.map((e) => e.id))
  const recordedEmployeeIds = [...new Set(records.map((r) => r.employeeId))]

  // Lấy danh sách nhân sự đã thôi việc nếu có record trong tháng hoặc thôi việc trong tháng này
  const inactiveEmployees = await prisma.employee.findMany({
    where: {
      departmentId: targetDeptId,
      isActive: false,
      OR: [
        { id: { in: recordedEmployeeIds } },
        {
          resignedAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      ]
    },
    orderBy: { code: 'asc' }
  })

  const uniqueInactiveEmployees = inactiveEmployees.filter((e) => !activeEmployeeIds.has(e.id))
  const allEmployees = [...activeEmployees, ...uniqueInactiveEmployees]

  // Map records: empId -> day -> status
  const recordsMap: Record<number, Record<number, string>> = {}
  for (const r of records) {
    if (!recordsMap[r.employeeId]) recordsMap[r.employeeId] = {}
    recordsMap[r.employeeId][r.day] = r.status
  }

  // Khởi tạo Workbook ExcelJS
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Bệnh viện Đa khoa Khánh Hội'
  workbook.created = new Date()

  const sheetName = `Tháng ${month}-${year}`
  const worksheet = workbook.addWorksheet(sheetName, {
    pageSetup: { orientation: 'landscape', paperSize: 9 }
  })

  // Định dạng font Times New Roman chung cho toàn bộ
  const fontTitle = { name: 'Times New Roman', size: 14, bold: true }
  const fontSubtitle = { name: 'Times New Roman', size: 11, bold: true }
  const fontNormal = { name: 'Times New Roman', size: 11 }
  const fontBold = { name: 'Times New Roman', size: 11, bold: true }
  const fontHeader = { name: 'Times New Roman', size: 10, bold: true }
  const fontData = { name: 'Times New Roman', size: 10 }

  // 1. Header cơ quan
  worksheet.addRow(['SỞ Y TẾ TP. HỒ CHÍ MINH']).font = fontNormal
  worksheet.addRow(['BỆNH VIỆN ĐA KHOA KHÁNH HỘI']).font = fontSubtitle
  worksheet.addRow([`KHOA: ${department.name.toUpperCase()}`]).font = fontSubtitle
  worksheet.addRow([])

  // 2. Tiêu đề bảng
  const titleRow = worksheet.addRow([`BẢNG CHẤM CÔNG VÀ THEO DÕI CÁN BỘ - THÁNG ${month}/${year}`])
  titleRow.font = fontTitle
  titleRow.alignment = { horizontal: 'center', vertical: 'middle' }

  // Merge tiêu đề qua tất cả các cột
  const totalCols = 4 + daysInMonth + 7 // STT, Mã, Họ tên, Chức danh + ngày 1..N + Công, CT, Học, Phép, Ốm, TS, Vắng
  worksheet.mergeCells(5, 1, 5, totalCols)

  // Phụ đề ngày công chuẩn
  const subRow = worksheet.addRow([`Số ngày công chuẩn trong tháng: ${sheet?.standardDays ?? standardDays} ngày`])
  subRow.font = { name: 'Times New Roman', size: 11, italic: true }
  subRow.alignment = { horizontal: 'center', vertical: 'middle' }
  worksheet.mergeCells(6, 1, 6, totalCols)
  worksheet.addRow([])

  // 3. Header bảng: 2 dòng header (Dòng 8: Thứ, Dòng 9: Số ngày)
  const headerDayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const headerDayOfWeek = headerDayNumbers.map((d) => {
    const dt = new Date(Date.UTC(year, month - 1, d))
    const dow = dt.getUTCDay()
    if (dow === 0) return 'CN'
    return `T${dow + 1}`
  })

  const row8Values = ['STT', 'Mã NV', 'Họ và tên', 'Chức danh', ...headerDayOfWeek, 'Công', 'CT', 'Học', 'Phép', 'Ốm', 'TS', 'Vắng']
  const row9Values = ['', '', '', '', ...headerDayNumbers.map(String), 'Chuẩn', 'CT', 'H', 'P', 'Ô', 'TS', 'V']

  const headerRow1 = worksheet.addRow(row8Values)
  const headerRow2 = worksheet.addRow(row9Values)

  // Merge các cột cố định giữa hàng 8 và 9
  worksheet.mergeCells(8, 1, 9, 1) // STT
  worksheet.mergeCells(8, 2, 9, 2) // Mã NV
  worksheet.mergeCells(8, 3, 9, 3) // Họ tên
  worksheet.mergeCells(8, 4, 9, 4) // Chức danh

  // Style cho 2 hàng header
  const borderThin: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFB0B0B0' } },
    left: { style: 'thin', color: { argb: 'FFB0B0B0' } },
    bottom: { style: 'thin', color: { argb: 'FFB0B0B0' } },
    right: { style: 'thin', color: { argb: 'FFB0B0B0' } }
  }

  const fillHeaderDefault = {
    type: 'pattern' as const,
    pattern: 'solid' as const,
    fgColor: { argb: 'FFEAEAEA' }
  }

  const fillWeekendHeader = {
    type: 'pattern' as const,
    pattern: 'solid' as const,
    fgColor: { argb: 'FFF0E6D2' } // Màu xám hổ phách cho ngày nghỉ
  }

  ;[headerRow1, headerRow2].forEach((row) => {
    row.alignment = { horizontal: 'center', vertical: 'middle' }
    row.font = fontHeader
    row.height = 20
  })

  for (let colIdx = 1; colIdx <= totalCols; colIdx++) {
    const isDayCol = colIdx >= 5 && colIdx <= 4 + daysInMonth
    const day = isDayCol ? colIdx - 4 : 0
    const dt = day > 0 ? new Date(Date.UTC(year, month - 1, day)) : null
    const isWeekendOrHoliday = dt ? dt.getUTCDay() === 0 || dt.getUTCDay() === 6 || holidayDaySet.has(day) : false

    const cell1 = headerRow1.getCell(colIdx)
    const cell2 = headerRow2.getCell(colIdx)

    cell1.border = borderThin
    cell2.border = borderThin

    if (isWeekendOrHoliday) {
      cell1.fill = fillWeekendHeader
      cell2.fill = fillWeekendHeader
    } else {
      cell1.fill = fillHeaderDefault
      cell2.fill = fillHeaderDefault
    }
  }

  // 4. Đổ dữ liệu nhân viên
  allEmployees.forEach((emp, index) => {
    let presentCount = 0
    let businessTripCount = 0
    let studyCount = 0
    let leaveCount = 0
    let sickCount = 0
    let maternityCount = 0
    let absentCount = 0
    const empRecords = recordsMap[emp.id] || {}

    // Xác định ngày chính thức thôi việc trong tháng
    let resignedDay: number | null = null
    if (emp.resignedAt) {
      const rDate = new Date(emp.resignedAt)
      if (rDate.getFullYear() === year && rDate.getMonth() + 1 === month) {
        resignedDay = rDate.getDate()
      } else if (rDate < startOfMonth) {
        resignedDay = 1
      }
    } else if (!emp.isActive) {
      resignedDay = 1
    }

    const dayCells: string[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      if (resignedDay !== null && d >= resignedDay) {
        // Sau ngày thôi việc: Ghi nhận [-], không cộng công, không tính vắng
        dayCells.push('-')
        continue
      }

      const status = empRecords[d] || 'PRESENT'
      if (status === 'ABSENT') {
        absentCount += 1
        dayCells.push('V')
      } else if (status === 'LEAVE') {
        leaveCount += 1
        dayCells.push('P')
      } else if (status === 'BUSINESS_TRIP') {
        businessTripCount += 1
        dayCells.push('CT')
      } else if (status === 'STUDY') {
        studyCount += 1
        dayCells.push('H')
      } else if (status === 'SICK') {
        sickCount += 1
        dayCells.push('Ô')
      } else if (status === 'MATERNITY') {
        maternityCount += 1
        dayCells.push('TS')
      } else if (status === 'RESIGNED') {
        dayCells.push('-')
      } else {
        presentCount += 1
        dayCells.push('✓')
      }
    }

    let totalWork = 0
    if (resignedDay !== null) {
      totalWork = presentCount + businessTripCount + studyCount
    } else {
      const deductedDays = absentCount + leaveCount + sickCount + maternityCount
      totalWork = Math.max(0, (sheet?.standardDays ?? standardDays) - deductedDays)
    }

    const employeeDisplayLabel = emp.isActive
      ? emp.name
      : emp.resignedAt
      ? `${emp.name} (Nghỉ ${new Date(emp.resignedAt).toLocaleDateString('vi-VN')})`
      : `${emp.name} (Đã nghỉ)`

    const rowData = [
      index + 1,
      emp.code,
      employeeDisplayLabel,
      emp.title,
      ...dayCells,
      totalWork,
      businessTripCount,
      studyCount,
      leaveCount,
      sickCount,
      maternityCount,
      absentCount
    ]

    const dataRow = worksheet.addRow(rowData)
    dataRow.font = fontData
    dataRow.height = 22

    // Căn chỉnh và tô màu ô
    dataRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }
    dataRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' }
    dataRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' }
    dataRow.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' }

    // Các cột ngày
    for (let d = 1; d <= daysInMonth; d++) {
      const colIdx = 4 + d
      const cell = dataRow.getCell(colIdx)
      const val = dayCells[d - 1]
      const dt = new Date(Date.UTC(year, month - 1, d))
      const isWeekendOrHoliday = dt.getUTCDay() === 0 || dt.getUTCDay() === 6 || holidayDaySet.has(d)

      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = borderThin

      if (val === '-') {
        // Đã thôi việc: xám nhạt
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' }
        }
        cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF888888' } }
      } else if (val === 'V') {
        // Vắng: đỏ nhạt
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFDECEC' }
        }
        cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FFC53030' } }
      } else if (val === 'P') {
        // Phép: vàng nhạt
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF8E6' }
        }
        cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FFB7791F' } }
      } else if (val === 'CT') {
        // Công tác: xanh dương nhạt
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFEFF6FF' }
        }
        cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF2563EB' } }
      } else if (val === 'H') {
        // Đi học: tím nhạt
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF5F3FF' }
        }
        cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF7C3AED' } }
      } else if (val === 'Ô') {
        // Nghỉ ốm: cam nhạt
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF7ED' }
        }
        cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FFEA580C' } }
      } else if (val === 'TS') {
        // Thai sản: hồng nhạt
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFDF2F8' }
        }
        cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FFDB2777' } }
      } else {
        // Có mặt: xanh lá nhạt
        if (isWeekendOrHoliday) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF9F9F9' }
          }
        }
        cell.font = { name: 'Times New Roman', size: 10, bold: true, color: { argb: 'FF1E9E52' } }
      }
    }

    // 7 cột tổng kết: Công, CT, Học, Phép, Ốm, TS, Vắng
    for (let c = 0; c < 7; c++) {
      const summaryCol = dataRow.getCell(totalCols - 6 + c)
      summaryCol.alignment = { horizontal: 'center', vertical: 'middle' }
      summaryCol.font = fontBold
      summaryCol.border = borderThin
    }

    // Border cho các cột đầu
    for (let c = 1; c <= 4; c++) {
      dataRow.getCell(c).border = borderThin
    }
  })

  // 5. Chú thích ký hiệu & Khung chữ ký cuối trang
  worksheet.addRow([])
  const legendRow = worksheet.addRow([
    '* Chú thích:  [✓] Có mặt  |  [CT] Đi công tác  |  [H] Đi học  |  [P] Nghỉ phép  |  [Ô] Nghỉ ốm  |  [TS] Nghỉ thai sản  |  [V] Vắng không phép  |  [-] Đã thôi việc'
  ])
  legendRow.font = { name: 'Times New Roman', size: 10, italic: true }
  worksheet.mergeCells(legendRow.number, 1, legendRow.number, totalCols)
  worksheet.addRow([])

  const signDateStr = `TP. Hồ Chí Minh, ngày ...... tháng ${month} năm ${year}`
  const dateSignRow = worksheet.addRow(['', '', '', '', '', '', signDateStr])
  dateSignRow.font = { name: 'Times New Roman', size: 11, italic: true }

  const signTitleRow = worksheet.addRow([
    '',
    'NGƯỜI LẬP BIỂU',
    '',
    '',
    'ĐIỀU DƯỠNG TRƯỞNG KHOA',
    '',
    'BAN GIÁM ĐỐC'
  ])
  signTitleRow.font = fontBold
  signTitleRow.alignment = { horizontal: 'center', vertical: 'middle' }

  const signSubRow = worksheet.addRow([
    '',
    '(Ký và ghi rõ họ tên)',
    '',
    '',
    '(Ký và ghi rõ họ tên)',
    '',
    '(Ký, đóng dấu)'
  ])
  signSubRow.font = { name: 'Times New Roman', size: 10, italic: true }
  signSubRow.alignment = { horizontal: 'center', vertical: 'middle' }

  // Độ rộng cột
  worksheet.getColumn(1).width = 6   // STT
  worksheet.getColumn(2).width = 14  // Mã NV
  worksheet.getColumn(3).width = 24  // Họ và tên
  worksheet.getColumn(4).width = 20  // Chức danh
  for (let d = 1; d <= daysInMonth; d++) {
    worksheet.getColumn(4 + d).width = 4.5 // Ô ngày
  }
  worksheet.getColumn(totalCols - 6).width = 8 // Công
  worksheet.getColumn(totalCols - 5).width = 6 // CT
  worksheet.getColumn(totalCols - 4).width = 6 // Học
  worksheet.getColumn(totalCols - 3).width = 6 // Phép
  worksheet.getColumn(totalCols - 2).width = 6 // Ốm
  worksheet.getColumn(totalCols - 1).width = 6 // TS
  worksheet.getColumn(totalCols).width = 6     // Vắng

  // Xuất file
  const buffer = await workbook.xlsx.writeBuffer()
  const filename = `Bang_Cham_Cong_${department.code}_Thang_${month}_${year}.xlsx`

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  })
}
