import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// API xuất file Excel báo cáo điều dưỡng theo ngày
export async function GET(request: Request) {
  // 1. Kiểm tra session và quyền (chỉ ADMIN hoặc BGD)
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN' && session.user.role !== 'BGD') {
    return NextResponse.json(
      { error: 'Chỉ ADMIN hoặc BGD mới có quyền xuất file Excel' },
      { status: 403 }
    )
  }

  // 2. Parse param date=YYYY-MM-DD
  const { searchParams } = new URL(request.url)
  const dateParam = searchParams.get('date')
  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json(
      { error: 'Thiếu hoặc sai định dạng ngày (?date=YYYY-MM-DD)' },
      { status: 400 }
    )
  }

  const reportDate = new Date(`${dateParam}T00:00:00.000Z`)

  // 3. Query dữ liệu đầy đủ không lọc theo permission
  const [report, departments, indicators] = await Promise.all([
    prisma.report.findUnique({
      where: { reportDate },
      include: { reportValues: true }
    }),
    prisma.department.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    }),
    prisma.indicator.findMany({
      where: { isActive: true },
      include: { group: true },
      orderBy: [
        { group: { sortOrder: 'asc' } },
        { sortOrder: 'asc' }
      ]
    })
  ])

  // 4. Xây dựng ma trận giá trị
  const matrix: Record<number, Record<number, number>> = {}
  for (const dept of departments) {
    matrix[dept.id] = {}
    for (const ind of indicators) {
      matrix[dept.id][ind.id] = 0
    }
  }

  if (report?.reportValues) {
    for (const rv of report.reportValues) {
      if (matrix[rv.departmentId] && matrix[rv.departmentId][rv.indicatorId] !== undefined) {
        matrix[rv.departmentId][rv.indicatorId] = rv.value
      }
    }
  }

  // Cột TỔNG: SUM từ các khoa thường
  const totalDept = departments.find((d) => d.isTotal)
  if (totalDept) {
    for (const ind of indicators) {
      let sum = 0
      for (const dept of departments) {
        if (!dept.isTotal) {
          sum += matrix[dept.id]?.[ind.id] || 0
        }
      }
      matrix[totalDept.id][ind.id] = sum
    }
  }

  // 5. Tạo workbook ExcelJS
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Hệ thống Báo cáo Điều dưỡng NKDD'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet(`Báo cáo ${dateParam}`)

  // Header row: Cột 1 = "KHOA", các cột tiếp theo là tên khoa, cột cuối = "TỔNG"
  const headerRowValues = ['KHOA', ...departments.map((d) => d.name)]
  const headerRow = worksheet.addRow(headerRowValues)

  // Style header row
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FF000000' } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEAEAEA' }
    }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }
  })

  // Thêm từng hàng chỉ số
  let currentGroup = ''
  for (const ind of indicators) {
    // Nếu chuyển sang nhóm mới, chèn một dòng tiêu đề nhóm
    if (ind.group.name !== currentGroup) {
      currentGroup = ind.group.name
      const groupRowValues = [currentGroup, ...departments.map(() => '')]
      const groupRow = worksheet.addRow(groupRowValues)
      groupRow.eachCell((cell) => {
        cell.font = { bold: true, italic: true }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF0F4F8' }
        }
      })
    }

    const rowData: (string | number)[] = [ind.name]
    for (const dept of departments) {
      const val = matrix[dept.id]?.[ind.id] ?? 0
      rowData.push(val)
    }
    const row = worksheet.addRow(rowData)

    // Border và căn lề cho từng cell
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
      }
      if (colNumber > 1) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' }
        cell.numFmt = '#,##0'
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' }
      }
    })
  }

  // Tự động set độ rộng cột
  worksheet.columns[0].width = 38
  for (let i = 1; i <= departments.length; i++) {
    worksheet.columns[i].width = 14
  }

  // 6. Trả về buffer file Excel
  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="NKDD_${dateParam}.xlsx"`
    }
  })
}
