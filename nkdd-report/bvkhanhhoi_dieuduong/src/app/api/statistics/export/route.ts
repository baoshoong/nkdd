import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTodayHCM, formatDateFull } from '@/lib/date-utils'

function getDatesInRange(startDate: Date, endDate: Date): string[] {
  const dates: string[] = []
  const curr = new Date(startDate)
  while (curr <= endDate) {
    const y = curr.getUTCFullYear()
    const m = String(curr.getUTCMonth() + 1).padStart(2, '0')
    const d = String(curr.getUTCDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${d}`)
    curr.setUTCDate(curr.getUTCDate() + 1)
  }
  return dates
}

export async function GET(request: Request) {
  // 1. Kiểm tra session và quyền
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN' && session.user.role !== 'BGD') {
    return NextResponse.json(
      { error: 'Chỉ ADMIN hoặc BGD mới có quyền xuất file Excel thống kê' },
      { status: 403 }
    )
  }

  // 2. Parse query params
  const { searchParams } = new URL(request.url)
  const todayStr = getTodayHCM()

  const defaultFrom = new Date(`${todayStr}T00:00:00.000Z`)
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 6)
  const defaultFromStr = defaultFrom.toISOString().slice(0, 10)

  let fromStr = searchParams.get('from') || defaultFromStr
  let toStr = searchParams.get('to') || todayStr

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromStr)) fromStr = defaultFromStr
  if (!/^\d{4}-\d{2}-\d{2}$/.test(toStr)) toStr = todayStr

  let fromDate = new Date(`${fromStr}T00:00:00.000Z`)
  let toDate = new Date(`${toStr}T00:00:00.000Z`)

  if (fromDate > toDate) {
    const tempDate = fromDate
    fromDate = toDate
    toDate = tempDate
    const tempStr = fromStr
    fromStr = toStr
    toStr = tempStr
  }

  const allDates = getDatesInRange(fromDate, toDate)
  const totalDays = allDates.length

  // 3. Query DB
  const [departments, indicators, reports] = await Promise.all([
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
    }),
    prisma.report.findMany({
      where: {
        reportDate: {
          gte: fromDate,
          lte: toDate
        }
      },
      include: {
        reportValues: true
      }
    })
  ])

  // Lập dateMap
  const dateMap: Record<string, Record<number, Record<number, number>>> = {}
  for (const d of allDates) {
    dateMap[d] = {}
    for (const dept of departments) {
      dateMap[d][dept.id] = {}
      for (const ind of indicators) {
        dateMap[d][dept.id][ind.id] = 0
      }
    }
  }

  for (const report of reports) {
    const dStr = report.reportDate.toISOString().slice(0, 10)
    if (dateMap[dStr]) {
      for (const rv of report.reportValues) {
        if (dateMap[dStr][rv.departmentId]) {
          dateMap[dStr][rv.departmentId][rv.indicatorId] = rv.value
        }
      }
    }
  }

  const clinicalDepts = departments.filter((d) => !d.isTotal)
  const totalDept = departments.find((d) => d.isTotal)

  if (totalDept) {
    for (const d of allDates) {
      for (const ind of indicators) {
        let sumDay = 0
        for (const dept of clinicalDepts) {
          sumDay += dateMap[d][dept.id]?.[ind.id] || 0
        }
        dateMap[d][totalDept.id][ind.id] = sumDay
      }
    }
  }

  // 4. Khởi tạo ExcelJS Workbook
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Bệnh viện Đa khoa Khánh Hội - NKDD Report'
  workbook.created = new Date()

  // Sheet 1: Tổng hợp theo kỳ
  const sheet = workbook.addWorksheet('Thống kê Tổng hợp', {
    views: [{ showGridLines: true }]
  })

  // Title rows
  const titleRow1 = sheet.addRow(['BỆNH VIỆN ĐA KHOA KHÁNH HỘI'])
  titleRow1.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF1F2050' } }

  const titleRow2 = sheet.addRow(['BÁO CÁO THỐNG KÊ GIAO BAN ĐIỀU DƯỠNG THEO KỲ'])
  titleRow2.font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FF6B63DE' } }

  const titleRow3 = sheet.addRow([
    `Kỳ thống kê: Từ ngày ${formatDateFull(fromDate)} đến ngày ${formatDateFull(toDate)} (Tổng cộng ${totalDays} ngày)`
  ])
  titleRow3.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF5A5B7C' } }

  sheet.addRow([]) // Dòng trống

  // Header Table: Chỉ số | Tổng Viện | TB/Ngày Viện | 11 Khoa lâm sàng
  const headerCols = [
    'CHỈ SỐ BÁO CÁO',
    'TỔNG VIỆN (SUM)',
    'TB/NGÀY (AVG)',
    ...clinicalDepts.map((d) => `${d.name} [${d.code}]`)
  ]

  const headerRow = sheet.addRow(headerCols)
  headerRow.height = 26
  headerRow.eachCell((cell, colNum) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.alignment = {
      horizontal: colNum === 1 ? 'left' : 'center',
      vertical: 'middle',
      wrapText: true
    }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colNum <= 3 ? 'FF534CC9' : 'FF6B63DE' }
    }
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }
  })

  // Body data
  let currentGroup = ''
  for (const ind of indicators) {
    if (ind.group.name !== currentGroup) {
      currentGroup = ind.group.name
      const groupRow = sheet.addRow([currentGroup.toUpperCase()])
      groupRow.height = 22
      groupRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1F2050' } }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFEDECFB' }
        }
      })
      sheet.mergeCells(groupRow.number, 1, groupRow.number, headerCols.length)
    }

    // Tính toán số liệu từng chỉ số
    let totalSum = 0
    for (const d of allDates) {
      if (totalDept) {
        totalSum += dateMap[d][totalDept.id]?.[ind.id] || 0
      }
    }
    const totalAvg = Math.round((totalSum / totalDays) * 10) / 10

    const rowValues: (string | number)[] = [ind.name, totalSum, totalAvg]

    for (const dept of clinicalDepts) {
      let deptSum = 0
      for (const d of allDates) {
        deptSum += dateMap[d][dept.id]?.[ind.id] || 0
      }
      rowValues.push(deptSum)
    }

    const dataRow = sheet.addRow(rowValues)
    dataRow.height = 20
    dataRow.eachCell((cell, colNum) => {
      cell.font = { name: 'Arial', size: 9.5 }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE8E8F2' } },
        left: { style: 'thin', color: { argb: 'FFE8E8F2' } },
        bottom: { style: 'thin', color: { argb: 'FFE8E8F2' } },
        right: { style: 'thin', color: { argb: 'FFE8E8F2' } }
      }

      if (colNum === 1) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' }
      } else {
        cell.alignment = { horizontal: 'right', vertical: 'middle' }
        cell.numFmt = colNum === 3 ? '#,##0.0' : '#,##0'
        if (colNum === 2) {
          cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFB7791F' } }
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFFBF0' }
          }
        }
      }
    })
  }

  // Tự động căn chỉnh độ rộng các cột
  sheet.getColumn(1).width = 34
  sheet.getColumn(2).width = 18
  sheet.getColumn(3).width = 16
  for (let c = 4; c <= headerCols.length; c++) {
    sheet.getColumn(c).width = 15
  }

  const buffer = await workbook.xlsx.writeBuffer()

  const filename = `Thong_ke_NKDD_${fromStr}_den_${toStr}.xlsx`

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  })
}
