import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTodayHCM } from '@/lib/date-utils'

// Helper tạo danh sách chuỗi ngày YYYY-MM-DD trong khoảng
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
  // 1. Kiểm tra session và quyền (chỉ ADMIN hoặc BGD)
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN' && session.user.role !== 'BGD') {
    return NextResponse.json(
      { error: 'Chỉ Quản trị viên (ADMIN) hoặc Ban Giám Đốc (BGD) mới có quyền xem thống kê' },
      { status: 403 }
    )
  }

  // 2. Parse query parameters
  const { searchParams } = new URL(request.url)
  const todayStr = getTodayHCM()

  // Mặc định: 7 ngày qua
  const defaultFrom = new Date(`${todayStr}T00:00:00.000Z`)
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 6)
  const defaultFromStr = defaultFrom.toISOString().slice(0, 10)

  let fromStr = searchParams.get('from') || defaultFromStr
  let toStr = searchParams.get('to') || todayStr

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromStr)) fromStr = defaultFromStr
  if (!/^\d{4}-\d{2}-\d{2}$/.test(toStr)) toStr = todayStr

  let fromDate = new Date(`${fromStr}T00:00:00.000Z`)
  let toDate = new Date(`${toStr}T00:00:00.000Z`)

  // Nếu người dùng chọn ngược ngày, tự động đảo lại
  if (fromDate > toDate) {
    const tempDate = fromDate
    fromDate = toDate
    toDate = tempDate
    const tempStr = fromStr
    fromStr = toStr
    toStr = tempStr
  }

  // Giới hạn tối đa 366 ngày (1 năm)
  const daysDiff = Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  if (daysDiff > 366) {
    return NextResponse.json(
      { error: 'Khoảng thời gian thống kê không được vượt quá 366 ngày' },
      { status: 400 }
    )
  }

  const allDateStrings = getDatesInRange(fromDate, toDate)
  const totalDays = allDateStrings.length

  // 3. Lấy dữ liệu danh mục Khoa phòng và Chỉ số
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

  // 4. Lập bản đồ số liệu theo ngày: dateMap[dateStr][deptId][indicatorId] = value
  const dateMap: Record<string, Record<number, Record<number, number>>> = {}
  for (const date of allDateStrings) {
    dateMap[date] = {}
    for (const dept of departments) {
      dateMap[date][dept.id] = {}
      for (const ind of indicators) {
        dateMap[date][dept.id][ind.id] = 0
      }
    }
  }

  // Điền giá trị từ các bản ghi ReportValue có sẵn trong DB
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

  // Tính toán cột TỔNG cho từng ngày
  const clinicalDepts = departments.filter((d) => !d.isTotal)
  const totalDept = departments.find((d) => d.isTotal)

  if (totalDept) {
    for (const date of allDateStrings) {
      for (const ind of indicators) {
        let sumDay = 0
        for (const dept of clinicalDepts) {
          sumDay += dateMap[date][dept.id]?.[ind.id] || 0
        }
        dateMap[date][totalDept.id][ind.id] = sumDay
      }
    }
  }

  // 5. Tính toán ma trận thống kê tổng hợp: stats[deptId][indicatorId] = { sum, avg, max, min }
  type StatValue = { sum: number; avg: number; max: number; min: number }
  const stats: Record<number, Record<number, StatValue>> = {}

  for (const dept of departments) {
    stats[dept.id] = {}
    for (const ind of indicators) {
      let sum = 0
      let max = -Infinity
      let min = Infinity

      for (const date of allDateStrings) {
        const val = dateMap[date][dept.id]?.[ind.id] || 0
        sum += val
        if (val > max) max = val
        if (val < min) min = val
      }

      if (max === -Infinity) max = 0
      if (min === Infinity) min = 0

      const avg = Math.round((sum / totalDays) * 10) / 10
      stats[dept.id][ind.id] = { sum, avg, max, min }
    }
  }

  // 6. Tính toán 4 Thẻ KPI chính toàn viện
  let kpiTotalKb = 0
  let kpiTotalBnVao = 0
  let kpiTotalBnRa = 0
  let kpiSumBnHienCo = 0

  if (totalDept) {
    for (const ind of indicators) {
      const indStat = stats[totalDept.id]?.[ind.id]
      if (!indStat) continue

      if (ind.code === 'TONG_SO_KB') {
        kpiTotalKb = indStat.sum
      } else if (ind.code === 'BN_VAO') {
        kpiTotalBnVao = indStat.sum
      } else if (ind.code === 'BN_RA' || ind.code === 'CHUYEN_VIEN') {
        kpiTotalBnRa += indStat.sum
      } else if (ind.code === 'BN_HIEN_CO') {
        kpiSumBnHienCo = indStat.sum
      }
    }
  }

  // Nhóm indicators theo group
  const groupMap = new Map<number, { id: number; name: string; indicators: typeof indicators }>()
  for (const ind of indicators) {
    const g = ind.group
    if (!groupMap.has(g.id)) {
      groupMap.set(g.id, { id: g.id, name: g.name, indicators: [] })
    }
    groupMap.get(g.id)!.indicators.push(ind)
  }

  return NextResponse.json({
    range: {
      from: fromStr,
      to: toStr,
      days: totalDays,
      dates: allDateStrings
    },
    kpis: {
      totalKhamBenh: kpiTotalKb,
      avgKhamBenh: Math.round((kpiTotalKb / totalDays) * 10) / 10,
      totalBnVao: kpiTotalBnVao,
      avgBnVao: Math.round((kpiTotalBnVao / totalDays) * 10) / 10,
      totalBnRa: kpiTotalBnRa,
      avgBnRa: Math.round((kpiTotalBnRa / totalDays) * 10) / 10,
      avgBnHienCo: Math.round((kpiSumBnHienCo / totalDays) * 10) / 10
    },
    departments: departments.map((d) => ({
      id: d.id,
      code: d.code,
      name: d.name,
      isTotal: d.isTotal
    })),
    groups: Array.from(groupMap.values()).map((g) => ({
      id: g.id,
      name: g.name,
      indicators: g.indicators.map((i) => ({
        id: i.id,
        code: i.code,
        name: i.name,
        groupName: g.name
      }))
    })),
    stats
  })
}
