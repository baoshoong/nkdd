import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Users,
  UserPlus,
  UserMinus,
  Activity,
  ArrowRight,
  ClipboardList
} from 'lucide-react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StatCard } from '@/components/ui/StatCard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table'
import { RightPanel } from '@/components/layout/RightPanel'
import { DashboardDatePicker } from '@/components/dashboard/DashboardDatePicker'
import { formatDateShort, getTodayHCM } from '@/lib/date-utils'
import { getShortDeptName } from '@/lib/department-utils'

interface DashboardPageProps {
  searchParams: Promise<{ date?: string }>
}

function computeDelta(
  curr: number,
  prev: number | null,
  prevDateLabel?: string
): { value: string; isPositive: boolean; label: string } {
  if (prev === null) {
    return { value: '0%', isPositive: true, label: 'Kỳ báo cáo đầu tiên' }
  }
  const diff = curr - prev
  if (prev === 0) {
    if (diff === 0) {
      return {
        value: '0%',
        isPositive: true,
        label: prevDateLabel ? `So với ${prevDateLabel}` : 'So với kỳ trước'
      }
    }
    return {
      value: `${diff > 0 ? '+' : ''}${diff}`,
      isPositive: diff >= 0,
      label: prevDateLabel ? `So với ${prevDateLabel}` : 'So với kỳ trước'
    }
  }

  const pct = Math.abs(Math.round((diff / prev) * 100 * 10) / 10)
  const sign = diff >= 0 ? '+' : '-'
  return {
    value: `${sign}${pct}%`,
    isPositive: diff >= 0,
    label: prevDateLabel ? `So với ${prevDateLabel}` : 'So với kỳ trước'
  }
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  // Chỉ ADMIN và BGD được vào Dashboard
  if (session.user.role !== 'ADMIN' && session.user.role !== 'BGD') {
    redirect('/report')
  }

  const params = await searchParams
  const dateParam = params.date

  // 1. Xác định ngày báo cáo: nếu có tham số hợp lệ thì dùng, nếu không mặc định lấy hôm nay (giờ HCM)
  const targetDateStr =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? dateParam
      : getTodayHCM()

  const targetDate = new Date(`${targetDateStr}T00:00:00.000Z`)

  const currentReport = await prisma.report.findUnique({
    where: { reportDate: targetDate },
    include: {
      reportValues: {
        include: {
          indicator: true,
          department: true
        }
      }
    }
  })

  const currentDateObj = targetDate
  const currentDateISO = targetDateStr
  const reportDateStr = formatDateShort(targetDate)

  // 2. Lấy báo cáo của ngày liền trước trong cơ sở dữ liệu để so sánh Delta
  const prevReport = await prisma.report.findFirst({
    where: { reportDate: { lt: targetDate } },
    orderBy: { reportDate: 'desc' },
    include: {
      reportValues: {
        include: {
          indicator: true,
          department: true
        }
      }
    }
  })

  const prevDateLabel = prevReport ? formatDateShort(prevReport.reportDate) : undefined

  // 3. Lấy danh sách 11 khoa lâm sàng chuẩn (không tính TONG)
  const departments = await prisma.department.findMany({
    where: { isTotal: false, isActive: true },
    orderBy: { sortOrder: 'asc' }
  })

  // 4. Tính toán số liệu thống kê cho báo cáo hiện tại
  let totalPatients = 0
  let totalAdmitted = 0
  let totalDischarged = 0
  let totalVisits = 0
  let emptyBeds = 0
  let totalBeds = 0

  const deptHasDataMap = new Map<number, boolean>()
  const deptStatsMap = new Map<
    number,
    { bnHienCo: number; bnVao: number; bnRa: number; giuongKH: number }
  >()

  for (const dept of departments) {
    deptStatsMap.set(dept.id, { bnHienCo: 0, bnVao: 0, bnRa: 0, giuongKH: 0 })
  }

  if (currentReport) {
    for (const rv of currentReport.reportValues) {
      if (rv.department.isTotal) continue

      if (rv.value > 0) {
        deptHasDataMap.set(rv.departmentId, true)
      }

      const currentStats = deptStatsMap.get(rv.departmentId)
      if (currentStats) {
        if (rv.indicator.code === 'BN_HIEN_CO') currentStats.bnHienCo += rv.value
        if (rv.indicator.code === 'BN_VAO') currentStats.bnVao += rv.value
        if (rv.indicator.code === 'BN_RA') currentStats.bnRa += rv.value
        if (rv.indicator.code === 'GIUONG_KH') currentStats.giuongKH += rv.value
      }

      if (rv.indicator.code === 'BN_HIEN_CO') totalPatients += rv.value
      if (rv.indicator.code === 'BN_VAO') totalAdmitted += rv.value
      if (rv.indicator.code === 'BN_RA') totalDischarged += rv.value
      if (rv.indicator.code === 'TONG_SO_KB') totalVisits += rv.value
      if (rv.indicator.code === 'GIUONG_DV_TRONG') emptyBeds += rv.value
      if (rv.indicator.code === 'GIUONG_KH') totalBeds += rv.value
    }
  }

  // 5. Tính toán số liệu kỳ trước để tính Delta thực tế
  let prevTotalPatients: number | null = null
  let prevAdmitted: number | null = null
  let prevDischarged: number | null = null
  let prevVisits: number | null = null

  if (prevReport) {
    prevTotalPatients = 0
    prevAdmitted = 0
    prevDischarged = 0
    prevVisits = 0

    for (const rv of prevReport.reportValues) {
      if (rv.department.isTotal) continue
      if (rv.indicator.code === 'BN_HIEN_CO') prevTotalPatients += rv.value
      if (rv.indicator.code === 'BN_VAO') prevAdmitted += rv.value
      if (rv.indicator.code === 'BN_RA') prevDischarged += rv.value
      if (rv.indicator.code === 'TONG_SO_KB') prevVisits += rv.value
    }
  }

  const patientDelta = computeDelta(totalPatients, prevTotalPatients, prevDateLabel)
  const admittedDelta = computeDelta(totalAdmitted, prevAdmitted, prevDateLabel)
  const dischargedDelta = computeDelta(totalDischarged, prevDischarged, prevDateLabel)
  const visitsDelta = computeDelta(totalVisits, prevVisits, prevDateLabel)

  const submittedCount = Array.from(deptHasDataMap.values()).filter(Boolean).length

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header Dashboard */}
      <Card className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1F2050] dark:text-[#F0F1F9]">
            Tổng quan Báo cáo Giao ban Điều dưỡng
          </h1>
          <p className="text-xs text-[#5A5B7C] dark:text-[#A3A6C4] font-medium mt-1">
            Trung tâm điều hành và theo dõi chỉ số người bệnh toàn bệnh viện
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Bộ chọn ngày xem báo cáo động */}
          <DashboardDatePicker currentDate={currentDateISO} />

          <Badge variant="brand" className="h-8 px-3 text-xs">
            Báo cáo ngày {reportDateStr}
          </Badge>

          <Link href={`/report?date=${currentDateISO}`}>
            <Button variant="primary" size="sm" className="gap-1.5 font-bold h-8">
              <ClipboardList className="w-4 h-4" />
              <span>Xem bảng chi tiết</span>
            </Button>
          </Link>
        </div>
      </Card>

      {/* Grid 4 KPI Cards - 100% Dữ Liệu Động & Delta Thật */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="BN HIỆN CÓ"
          value={totalPatients}
          icon={<Users className="w-5 h-5" />}
          variant="yellow"
          delta={patientDelta}
        />
        <StatCard
          title="BN NHẬP VIỆN"
          value={totalAdmitted}
          icon={<UserPlus className="w-5 h-5" />}
          variant="purple"
          delta={admittedDelta}
        />
        <StatCard
          title="BN XUẤT / CHUYỂN VIỆN"
          value={totalDischarged}
          icon={<UserMinus className="w-5 h-5" />}
          variant="pink"
          delta={dischargedDelta}
        />
        <StatCard
          title="LƯỢT KHÁM BỆNH"
          value={totalVisits}
          icon={<Activity className="w-5 h-5" />}
          variant="blue"
          delta={visitsDelta}
        />
      </div>

      {/* Khung nội dung chính + Right Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 items-start">
        {/* Bảng tiến độ và trạng thái các khoa */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E8F2] dark:border-[#2A2C49]">
            <div>
              <h2 className="text-base font-bold text-[#1F2050] dark:text-[#F0F1F9]">
                Tình hình Báo cáo theo Khoa phòng
              </h2>
              <p className="text-xs text-[#5A5B7C] dark:text-[#A3A6C4] font-medium mt-0.5">
                Tiến độ gửi số liệu và các chỉ số của {departments.length} khoa phòng ngày {reportDateStr}
              </p>
            </div>
            <Link
              href={`/report?date=${currentDateISO}`}
              className="text-xs font-bold text-[#6B63DE] dark:text-[#8E87F5] hover:text-[#534CC9] dark:hover:text-[#A8A3FF] flex items-center gap-1 transition-colors duration-150"
            >
              <span>Xem toàn bộ</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <Table className="w-full text-xs text-left border-collapse">
              <TableHeader>
                <TableRow className="border-b border-[#E8E8F2] dark:border-[#2A2C49] bg-[#F6F7FB] dark:bg-[#1E2038] text-[#1F2050] dark:text-[#F0F1F9]">
                  <TableHead className="py-2 px-2.5 font-bold uppercase tracking-wider text-[11px] min-w-[130px]">
                    Khoa phòng
                  </TableHead>
                  <TableHead className="py-2 px-1.5 font-bold text-center uppercase tracking-wider text-[11px] w-20">
                    Trạng thái
                  </TableHead>
                  <TableHead className="py-2 px-1.5 font-bold text-right uppercase tracking-wider text-[11px] w-20">
                    Giường KH
                  </TableHead>
                  <TableHead className="py-2 px-1.5 font-bold text-right uppercase tracking-wider text-[11px] w-20">
                    BN hiện có
                  </TableHead>
                  <TableHead className="py-2 px-1.5 font-bold text-right uppercase tracking-wider text-[11px] w-16">
                    BN vào
                  </TableHead>
                  <TableHead className="py-2 px-1.5 font-bold text-right uppercase tracking-wider text-[11px] w-16">
                    BN ra
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#E8E8F2] dark:divide-[#2A2C49]">
                {departments.map((dept) => {
                  const hasData = Boolean(deptHasDataMap.get(dept.id))
                  const stats = deptStatsMap.get(dept.id) || {
                    bnHienCo: 0,
                    bnVao: 0,
                    bnRa: 0,
                    giuongKH: 0
                  }

                  return (
                    <TableRow
                      key={dept.id}
                      className="hover:bg-[#F0F1F9] dark:hover:bg-[#242744] transition-colors duration-150"
                    >
                      <TableCell
                        className="py-1.5 px-2.5 font-semibold text-[#1F2050] dark:text-[#F0F1F9] whitespace-nowrap"
                        title={`${dept.name} (${dept.code})`}
                      >
                        <span className="font-bold text-[#6B63DE] dark:text-[#8E87F5] mr-1.5 text-[11px]">
                          [{dept.code}]
                        </span>
                        <span className="text-xs font-bold">
                          {getShortDeptName(dept.code, dept.name)}
                        </span>
                      </TableCell>
                      <TableCell className="py-1.5 px-1.5 text-center">
                        {hasData ? (
                          <Badge variant="success" dot className="h-5 text-[10px] px-1.5">
                            Đã gửi
                          </Badge>
                        ) : (
                          <Badge variant="warning" dot className="h-5 text-[10px] px-1.5">
                            Chưa nhập
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-1.5 px-1.5 text-right font-mono tabular-nums text-[#5A5B7C] dark:text-[#A3A6C4] text-xs">
                        {stats.giuongKH > 0 ? stats.giuongKH.toLocaleString('vi-VN') : '-'}
                      </TableCell>
                      <TableCell className="py-1.5 px-1.5 text-right font-mono font-bold tabular-nums text-[#1F2050] dark:text-[#F0F1F9] text-xs">
                        {stats.bnHienCo > 0 ? stats.bnHienCo.toLocaleString('vi-VN') : '-'}
                      </TableCell>
                      <TableCell className="py-1.5 px-1.5 text-right font-mono tabular-nums text-[#1E9E52] dark:text-[#34C759] font-semibold text-xs">
                        {stats.bnVao > 0 ? `+${stats.bnVao.toLocaleString('vi-VN')}` : '-'}
                      </TableCell>
                      <TableCell className="py-1.5 px-1.5 text-right font-mono tabular-nums text-[#C53030] dark:text-[#FF6B6B] font-semibold text-xs">
                        {stats.bnRa > 0 ? `-${stats.bnRa.toLocaleString('vi-VN')}` : '-'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Right Panel bên phải - 100% Dữ Liệu Động */}
        <RightPanel
          user={{
            name: session.user.name,
            role: session.user.role,
            departmentCode: session.user.departmentCode
          }}
          stats={{
            totalPatients,
            emptyBeds,
            totalBeds,
            patientDelta,
            submittedDepts: submittedCount,
            totalDepts: departments.length
          }}
        />
      </div>
    </div>
  )
}
