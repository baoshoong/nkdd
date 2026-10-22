import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  formatDateFull,
  formatDateTimeWithSeconds,
  formatDateShort
} from '@/lib/date-utils'

const exportQuerySchema = z.object({
  reportDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  userId: z.coerce.number().int().positive().optional(),
  indicatorId: z.coerce.number().int().positive().optional()
})

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

  // 2. Parse query params
  const url = new URL(request.url)
  const rawParams = {
    reportDate: url.searchParams.get('reportDate') || undefined,
    departmentId: url.searchParams.get('departmentId') || undefined,
    userId: url.searchParams.get('userId') || undefined,
    indicatorId: url.searchParams.get('indicatorId') || undefined
  }

  const parseResult = exportQuerySchema.safeParse(rawParams)
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Tham số bộ lọc không hợp lệ' },
      { status: 400 }
    )
  }

  const { reportDate, departmentId, userId, indicatorId } = parseResult.data

  const where: {
    reportDate?: Date
    departmentId?: number
    userId?: number
    indicatorId?: number
  } = {}

  if (reportDate) {
    where.reportDate = new Date(`${reportDate}T00:00:00.000Z`)
  }
  if (departmentId) {
    where.departmentId = departmentId
  }
  if (userId) {
    where.userId = userId
  }
  if (indicatorId) {
    where.indicatorId = indicatorId
  }

  // 3. Query toàn bộ danh sách audit log phù hợp (giới hạn tối đa 5000 dòng để an toàn bộ nhớ)
  const [logs, departments, indicators, users] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5000
    }),
    prisma.department.findMany({ select: { id: true, code: true, name: true } }),
    prisma.indicator.findMany({ select: { id: true, code: true, name: true } }),
    prisma.user.findMany({ select: { id: true, username: true, name: true } })
  ])

  const deptMap = new Map(departments.map((d) => [d.id, d]))
  const indMap = new Map(indicators.map((i) => [i.id, i]))
  const userMap = new Map(users.map((u) => [u.id, u]))

  // 4. Tạo workbook ExcelJS
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Hệ thống Báo cáo Điều dưỡng NKDD'
  workbook.created = new Date()

  const sheetName = reportDate
    ? `Audit_${reportDate}`
    : 'Nhat_Ky_Thay_Doi'
  const worksheet = workbook.addWorksheet(sheetName.slice(0, 31))

  // Tiêu đề bệnh viện và báo cáo
  const titleRow1 = worksheet.addRow(['BỆNH VIỆN ĐA KHOA KHÁNH HỘI'])
  titleRow1.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF1F2050' } }

  const titleRow2 = worksheet.addRow(['NHẬT KÝ THAY ĐỔI DỮ LIỆU (AUDIT LOG)'])
  titleRow2.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF6B63DE' } }

  const filterSummary = [
    reportDate ? `Ngày báo cáo: ${formatDateFull(reportDate)}` : 'Ngày báo cáo: Tất cả',
    departmentId ? `Khoa: ${deptMap.get(departmentId)?.name || departmentId}` : null,
    indicatorId ? `Chỉ số: ${indMap.get(indicatorId)?.name || indicatorId}` : null,
    userId ? `Người thực hiện: ${userMap.get(userId)?.name || userId}` : null
  ]
    .filter(Boolean)
    .join('  |  ')

  const titleRow3 = worksheet.addRow([`Bộ lọc: ${filterSummary}`])
  titleRow3.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF5A5B7C' } }

  const titleRow4 = worksheet.addRow([
    `Thời gian xuất: ${formatDateTimeWithSeconds(new Date())} - Tổng cộng: ${logs.length} bản ghi`
  ])
  titleRow4.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF5A5B7C' } }

  worksheet.addRow([]) // Dòng trống

  // Header bảng dữ liệu
  const headers = [
    'STT',
    'Thời gian ghi nhận',
    'Ngày báo cáo',
    'Mã khoa',
    'Khoa phòng',
    'Chỉ số báo cáo',
    'Giá trị cũ',
    'Giá trị mới',
    'Biến động',
    'Người thực hiện'
  ]

  const headerRow = worksheet.addRow(headers)
  headerRow.height = 28
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF6B63DE' } // Brand color
    }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF4D46B8' } },
      left: { style: 'thin', color: { argb: 'FF4D46B8' } },
      bottom: { style: 'thin', color: { argb: 'FF4D46B8' } },
      right: { style: 'thin', color: { argb: 'FF4D46B8' } }
    }
  })

  // Dữ liệu từng dòng
  logs.forEach((log, index) => {
    const dept = deptMap.get(log.departmentId)
    const ind = indMap.get(log.indicatorId)
    const user = userMap.get(log.userId)

    const delta =
      log.oldValue !== null ? log.newValue - log.oldValue : log.newValue

    const deltaStr =
      delta > 0 ? `+${delta}` : `${delta}`

    const row = worksheet.addRow([
      index + 1,
      formatDateTimeWithSeconds(log.createdAt),
      formatDateFull(log.reportDate),
      dept?.code || `ID_${log.departmentId}`,
      dept?.name || `Khoa #${log.departmentId}`,
      ind?.name || `Chỉ số #${log.indicatorId}`,
      log.oldValue ?? '-',
      log.newValue,
      deltaStr,
      user?.name || user?.username || `User #${log.userId}`
    ])

    row.height = 22
    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', size: 10 }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE8E8F2' } },
        left: { style: 'thin', color: { argb: 'FFE8E8F2' } },
        bottom: { style: 'thin', color: { argb: 'FFE8E8F2' } },
        right: { style: 'thin', color: { argb: 'FFE8E8F2' } }
      }

      // Căn lề từng cột
      if (colNumber === 1 || colNumber === 3 || colNumber === 4) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
      } else if (colNumber === 2) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
      } else if (colNumber === 7 || colNumber === 8 || colNumber === 9) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' }
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' }
      }

      // Màu nền xen kẽ nhẹ
      if (index % 2 === 1) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9F9FE' }
        }
      }
    })
  })

  // Thiết lập độ rộng các cột
  worksheet.columns = [
    { width: 8 },  // STT
    { width: 22 }, // Thời gian ghi nhận
    { width: 14 }, // Ngày báo cáo
    { width: 12 }, // Mã khoa
    { width: 24 }, // Khoa phòng
    { width: 34 }, // Chỉ số báo cáo
    { width: 13 }, // Giá trị cũ
    { width: 13 }, // Giá trị mới
    { width: 13 }, // Biến động
    { width: 22 }  // Người thực hiện
  ]

  const buffer = await workbook.xlsx.writeBuffer()

  const filenameDate = reportDate ? reportDate : 'all'
  const filename = `Audit_Log_${filenameDate}.xlsx`

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  })
}
