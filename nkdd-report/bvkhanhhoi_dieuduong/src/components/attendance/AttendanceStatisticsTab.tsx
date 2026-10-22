'use client'

import { useMemo } from 'react'
import {
  TrendingUp,
  Award,
  AlertTriangle,
  CalendarCheck,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table'
import { EmployeeStat } from './TimesheetTab'

interface AttendanceStatisticsTabProps {
  employeeStats: EmployeeStat[]
  standardDays: number
  departmentName: string
  month: number
  year: number
}

export function AttendanceStatisticsTab({
  employeeStats,
  standardDays,
  departmentName,
  month,
  year
}: AttendanceStatisticsTabProps) {
  // Tính toán các chỉ số thống kê chuyên sâu
  const analytics = useMemo(() => {
    const totalStaff = employeeStats.length
    if (totalStaff === 0) {
      return {
        avgAttendanceRate: 100,
        totalActualWork: 0,
        totalExpectedWork: 0,
        totalBusinessTrip: 0,
        totalStudy: 0,
        totalLeave: 0,
        totalSick: 0,
        totalMaternity: 0,
        totalAbsent: 0,
        perfectAttendanceCount: 0,
        warningStaff: [],
        rankedEmployees: []
      }
    }

    let sumActualWork = 0
    let sumBusinessTrip = 0
    let sumStudy = 0
    let sumLeave = 0
    let sumSick = 0
    let sumMaternity = 0
    let sumAbsent = 0
    let perfectCount = 0

    const processed = employeeStats.map((emp) => {
      sumActualWork += emp.totalWork
      sumBusinessTrip += emp.businessTripCount || 0
      sumStudy += emp.studyCount || 0
      sumLeave += emp.leaveCount || 0
      sumSick += emp.sickCount || 0
      sumMaternity += emp.maternityCount || 0
      sumAbsent += emp.absentCount || 0

      const rate = standardDays > 0 ? Math.round((emp.totalWork / standardDays) * 100) : 100
      const totalDeducted = (emp.absentCount || 0) + (emp.leaveCount || 0) + (emp.sickCount || 0) + (emp.maternityCount || 0)
      if (totalDeducted === 0 && emp.isActive) {
        perfectCount++
      }

      let evaluation: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'RESIGNED' = 'GOOD'
      if (!emp.isActive) {
        evaluation = 'RESIGNED'
      } else if (rate >= 100) {
        evaluation = 'EXCELLENT'
      } else if (rate < 90) {
        evaluation = 'WARNING'
      }

      return {
        ...emp,
        rate: Math.min(100, rate),
        totalDeducted,
        evaluation
      }
    })

    const totalExpectedWork = totalStaff * standardDays
    const avgAttendanceRate =
      totalExpectedWork > 0 ? Math.round((sumActualWork / totalExpectedWork) * 100) : 100

    // Cảnh báo chỉ dành cho nhân sự đang làm việc có >= 2 ngày giảm trừ, hoặc nhân sự có >= 2 ngày vắng không phép
    const warningStaff = processed.filter(
      (e) => (e.isActive && e.totalDeducted >= 2) || (e.absentCount || 0) >= 2
    )

    // Sắp xếp theo tỷ lệ chuyên cần giảm dần
    processed.sort((a, b) => b.rate - a.rate || a.name.localeCompare(b.name))

    return {
      avgAttendanceRate,
      totalActualWork: sumActualWork,
      totalExpectedWork,
      totalBusinessTrip: sumBusinessTrip,
      totalStudy: sumStudy,
      totalLeave: sumLeave,
      totalSick: sumSick,
      totalMaternity: sumMaternity,
      totalAbsent: sumAbsent,
      perfectAttendanceCount: perfectCount,
      warningStaff,
      rankedEmployees: processed
    }
  }, [employeeStats, standardDays])

  return (
    <div className="space-y-6">
      {/* 4 Thẻ KPI Phân Tích Chuyên Cần */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[12px] bg-[#EAFBF1] dark:bg-[#152B1E] text-[#1E9E52] dark:text-[#34C759] flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#8A8BA0] dark:text-[#6C6F93]">Tỷ lệ chuyên cần</div>
            <div className="text-xl font-extrabold text-[#1E9E52] dark:text-[#34C759] tabular-nums">
              {analytics.avgAttendanceRate}%
            </div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[12px] bg-[#EDECFB] dark:bg-[#202242] text-[#6B63DE] dark:text-[#8E87F5] flex items-center justify-center shrink-0">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#8A8BA0] dark:text-[#6C6F93]">Tổng ngày công khoa</div>
            <div className="text-xl font-extrabold text-[#1F2050] dark:text-[#F0F1F9] tabular-nums">
              {analytics.totalActualWork} <span className="text-xs font-normal text-[#8A8BA0] dark:text-[#6C6F93]">/ {analytics.totalExpectedWork}</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[12px] bg-[#FFF8E6] dark:bg-[#2D2616] text-[#B7791F] dark:text-[#E0A838] flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#8A8BA0] dark:text-[#6C6F93]">Đạt 100% công chuẩn</div>
            <div className="text-xl font-extrabold text-[#B7791F] dark:text-[#E0A838] tabular-nums">
              {analytics.perfectAttendanceCount} <span className="text-xs font-normal text-[#8A8BA0] dark:text-[#6C6F93]">/ {employeeStats.length}</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[12px] bg-[#FDECEC] dark:bg-[#3D1E24] text-[#C53030] dark:text-[#FF6B6B] flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#8A8BA0] dark:text-[#6C6F93]">Tổng ngày giảm trừ công</div>
            <div className="text-xl font-extrabold text-[#C53030] dark:text-[#FF6B6B] tabular-nums">
              {analytics.totalAbsent + analytics.totalLeave + analytics.totalSick + analytics.totalMaternity} <span className="text-xs font-normal text-[#8A8BA0] dark:text-[#6C6F93]">ngày</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Thẻ phụ chi tiết các chế độ: Công tác, Đi học, Nghỉ ốm, Thai sản */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-[12px] bg-[#EFF6FF] dark:bg-[#1E293B] border border-[#3B82F6]/20 flex items-center justify-between">
          <span className="text-xs font-medium text-[#2563EB] dark:text-[#60A5FA]">Công tác (CT):</span>
          <span className="text-sm font-bold font-mono text-[#2563EB] dark:text-[#60A5FA]">{analytics.totalBusinessTrip} ngày</span>
        </div>
        <div className="p-3 rounded-[12px] bg-[#F5F3FF] dark:bg-[#2E1065] border border-[#8B5CF6]/20 flex items-center justify-between">
          <span className="text-xs font-medium text-[#7C3AED] dark:text-[#A78BFA]">Đi học (H):</span>
          <span className="text-sm font-bold font-mono text-[#7C3AED] dark:text-[#A78BFA]">{analytics.totalStudy} ngày</span>
        </div>
        <div className="p-3 rounded-[12px] bg-[#FFF7ED] dark:bg-[#431407] border border-[#F97316]/20 flex items-center justify-between">
          <span className="text-xs font-medium text-[#EA580C] dark:text-[#FB923C]">Nghỉ ốm (Ô):</span>
          <span className="text-sm font-bold font-mono text-[#EA580C] dark:text-[#FB923C]">{analytics.totalSick} ngày</span>
        </div>
        <div className="p-3 rounded-[12px] bg-[#FDF2F8] dark:bg-[#500724] border border-[#EC4899]/20 flex items-center justify-between">
          <span className="text-xs font-medium text-[#DB2777] dark:text-[#F472B6]">Thai sản (TS):</span>
          <span className="text-sm font-bold font-mono text-[#DB2777] dark:text-[#F472B6]">{analytics.totalMaternity} ngày</span>
        </div>
      </div>

      {/* Cảnh báo chuyên cần (nếu có nhân sự nghỉ >= 2 ngày) */}
      {analytics.warningStaff.length > 0 && (
        <Card className="p-4 border-l-4 border-[#FFB020] bg-[#FFFBF0] dark:bg-[#201C12] space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#B7791F] dark:text-[#E0A838]">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Lưu ý: Có {analytics.warningStaff.length} nhân sự có ngày nghỉ giảm trừ công từ 2 ngày trở lên trong tháng:</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {analytics.warningStaff.map((emp) => (
              <span
                key={emp.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-white dark:bg-[#18192E] border border-[#B7791F]/30 text-xs text-[#1F2050] dark:text-[#F0F1F9] font-medium"
              >
                <strong>{emp.name}</strong> ({emp.code}):
                {emp.absentCount > 0 && <span className="text-[#C53030] font-bold">{emp.absentCount} V</span>}
                {emp.leaveCount > 0 && <span className="text-[#B7791F] font-bold">{emp.leaveCount} P</span>}
                {emp.sickCount > 0 && <span className="text-[#EA580C] font-bold">{emp.sickCount} Ô</span>}
                {emp.maternityCount > 0 && <span className="text-[#DB2777] font-bold">{emp.maternityCount} TS</span>}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Bảng Xếp Hạng & Đánh Giá Chuyên Cần Chi Tiết */}
      <Card className="overflow-hidden border border-[#E8E8F2] dark:border-[#2A2C49]">
        <div className="p-4 border-b border-[#E8E8F2] dark:border-[#2A2C49] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-[#1F2050] dark:text-[#F0F1F9]">
              Bảng Đánh Giá Chuyên Cần Nhân Sự &bull; Khoa {departmentName}
            </h3>
            <p className="text-xs text-[#5A5B7C] dark:text-[#A3A6C4] mt-0.5">
              Tháng {month}/{year} &bull; Công chuẩn tháng: <strong className="text-[#1E9E52] dark:text-[#34C759]">{standardDays} ngày</strong>
            </p>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <Table className="w-full text-xs text-left border-collapse">
            <TableHeader>
              <TableRow className="border-b border-[#E8E8F2] dark:border-[#2A2C49] bg-[#F6F7FB] dark:bg-[#1E2038] text-[#1F2050] dark:text-[#F0F1F9]">
                <TableHead className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] w-12 text-center">
                  Hạng
                </TableHead>
                <TableHead className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] w-28">
                  Mã NV
                </TableHead>
                <TableHead className="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">
                  Họ và tên
                </TableHead>
                <TableHead className="py-3 px-3 font-bold uppercase tracking-wider text-[11px]">
                  Chức danh
                </TableHead>
                <TableHead className="py-3 px-2 font-bold text-center uppercase tracking-wider text-[11px] w-16">
                  Chuẩn
                </TableHead>
                <TableHead className="py-3 px-2 font-bold text-center uppercase tracking-wider text-[11px] w-14 text-[#2563EB]" title="Công tác">
                  CT
                </TableHead>
                <TableHead className="py-3 px-2 font-bold text-center uppercase tracking-wider text-[11px] w-14 text-[#7C3AED]" title="Đi học">
                  Học
                </TableHead>
                <TableHead className="py-3 px-2 font-bold text-center uppercase tracking-wider text-[11px] w-14 text-[#B7791F]" title="Nghỉ phép">
                  Phép
                </TableHead>
                <TableHead className="py-3 px-2 font-bold text-center uppercase tracking-wider text-[11px] w-14 text-[#EA580C]" title="Nghỉ ốm">
                  Ốm
                </TableHead>
                <TableHead className="py-3 px-2 font-bold text-center uppercase tracking-wider text-[11px] w-14 text-[#DB2777]" title="Nghỉ thai sản">
                  TS
                </TableHead>
                <TableHead className="py-3 px-2 font-bold text-center uppercase tracking-wider text-[11px] w-14 text-[#C53030]" title="Vắng">
                  Vắng
                </TableHead>
                <TableHead className="py-3 px-2.5 font-bold text-center uppercase tracking-wider text-[11px] w-20 text-[#1E9E52]">
                  Tổng công
                </TableHead>
                <TableHead className="py-3 px-3 font-bold uppercase tracking-wider text-[11px] w-44">
                  Tỷ lệ chuyên cần
                </TableHead>
                <TableHead className="py-3 px-3 font-bold text-center uppercase tracking-wider text-[11px] w-24">
                  Xếp loại
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-[#E8E8F2] dark:divide-[#2A2C49]">
              {analytics.rankedEmployees.map((emp, index) => (
                <TableRow
                  key={emp.id}
                  className="hover:bg-[#F0F1F9]/60 dark:hover:bg-[#242744] transition-colors"
                >
                  <TableCell className="py-2.5 px-3 font-mono text-center font-bold">
                    {index === 0 ? (
                      <span className="w-5 h-5 rounded-full bg-[#FFD700] text-[#7A5800] inline-flex items-center justify-center text-[10px]">1</span>
                    ) : index === 1 ? (
                      <span className="w-5 h-5 rounded-full bg-[#C0C0C0] text-[#333] inline-flex items-center justify-center text-[10px]">2</span>
                    ) : index === 2 ? (
                      <span className="w-5 h-5 rounded-full bg-[#CD7F32] text-white inline-flex items-center justify-center text-[10px]">3</span>
                    ) : (
                      <span className="text-[#8A8BA0] dark:text-[#6C6F93]">{index + 1}</span>
                    )}
                  </TableCell>

                  <TableCell className="py-2.5 px-3 font-mono font-bold text-[#6B63DE] dark:text-[#8E87F5]">
                    {emp.code}
                  </TableCell>

                  <TableCell className="py-2.5 px-3 font-bold text-[#1F2050] dark:text-[#F0F1F9]">
                    <div className="flex items-center gap-1.5">
                      <span>{emp.name}</span>
                      {!emp.isActive && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#F0F1F9] dark:bg-[#1E2038] text-[#8A8BA0] dark:text-[#6C6F93] border border-[#8A8BA0]/20">
                          Thôi việc
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="py-2.5 px-3 text-[#5A5B7C] dark:text-[#A3A6C4]">
                    {emp.title}
                  </TableCell>

                  <TableCell className="py-2.5 px-2 font-mono text-center text-[#5A5B7C] dark:text-[#A3A6C4]">
                    {standardDays}
                  </TableCell>

                  <TableCell className="py-2.5 px-2 font-mono font-bold text-center text-[#2563EB]">
                    {emp.businessTripCount || 0}
                  </TableCell>

                  <TableCell className="py-2.5 px-2 font-mono font-bold text-center text-[#7C3AED]">
                    {emp.studyCount || 0}
                  </TableCell>

                  <TableCell className="py-2.5 px-2 font-mono font-bold text-center text-[#B7791F]">
                    {emp.leaveCount || 0}
                  </TableCell>

                  <TableCell className="py-2.5 px-2 font-mono font-bold text-center text-[#EA580C]">
                    {emp.sickCount || 0}
                  </TableCell>

                  <TableCell className="py-2.5 px-2 font-mono font-bold text-center text-[#DB2777]">
                    {emp.maternityCount || 0}
                  </TableCell>

                  <TableCell className="py-2.5 px-2 font-mono font-bold text-center text-[#C53030]">
                    {emp.absentCount || 0}
                  </TableCell>

                  <TableCell className="py-2.5 px-2.5 font-mono font-extrabold text-center text-[#1E9E52] dark:text-[#34C759] text-sm">
                    {emp.totalWork}
                  </TableCell>

                  <TableCell className="py-2.5 px-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-[#1F2050] dark:text-[#F0F1F9]">{emp.rate}%</span>
                        <span className="text-[10px] text-[#8A8BA0] dark:text-[#6C6F93] font-normal">{emp.totalWork}/{standardDays} công</span>
                      </div>
                      <ProgressBar
                        value={emp.rate}
                        max={100}
                        color={
                          emp.rate >= 100
                            ? 'bg-[#1E9E52]'
                            : emp.rate >= 90
                            ? 'bg-[#6B63DE]'
                            : 'bg-[#C53030]'
                        }
                      />
                    </div>
                  </TableCell>

                  <TableCell className="py-2.5 px-3 text-center">
                    {emp.evaluation === 'RESIGNED' ? (
                      <Badge variant="neutral" className="h-6 px-2 text-[10px] font-bold bg-[#F0F1F9] dark:bg-[#1E2038] text-[#8A8BA0] dark:text-[#6C6F93] border border-[#8A8BA0]/20">
                        Đã thôi việc
                      </Badge>
                    ) : emp.evaluation === 'EXCELLENT' ? (
                      <Badge variant="success" className="h-6 px-2 text-[10px] font-bold">
                        Xuất sắc
                      </Badge>
                    ) : emp.evaluation === 'GOOD' ? (
                      <Badge variant="neutral" className="h-6 px-2 text-[10px] font-bold">
                        Đạt chuẩn
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="h-6 px-2 text-[10px] font-bold bg-[#FDECEC] dark:bg-[#3D1E24] text-[#C53030] dark:text-[#FF6B6B] border border-[#C53030]/20">
                        Cần lưu ý
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
