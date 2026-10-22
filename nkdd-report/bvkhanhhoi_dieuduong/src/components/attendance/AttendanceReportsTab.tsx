'use client'

import { useState, useEffect } from 'react'
import {
  FileSpreadsheet,
  Download,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Lock,
  Unlock,
  Building2,
  Users,
  ShieldCheck,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
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
import { formatDateTimeShort } from '@/lib/date-utils'

interface DepartmentSummary {
  departmentId: number
  code: string
  name: string
  employeeCount: number
  standardDays: number
  status: 'OPEN' | 'LOCKED'
  isLocked: boolean
  lockedAt: string | null
  lockedBy: { id: number; name: string; role: string } | null
  sheetId: number | null
}

interface AttendanceReportsTabProps {
  currentDeptId: number
  currentDeptCode: string
  currentDeptName: string
  month: number
  year: number
  userRole: string
  onSelectDepartment?: (deptId: number) => void
}

export function AttendanceReportsTab({
  currentDeptId,
  currentDeptCode,
  currentDeptName,
  month,
  year,
  userRole,
  onSelectDepartment
}: AttendanceReportsTabProps) {
  const [summaries, setSummaries] = useState<DepartmentSummary[]>([])
  const [lockedCount, setLockedCount] = useState(0)
  const [totalDepts, setTotalDepts] = useState(11)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const fetchSummary = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/attendance/sheets/summary?month=${month}&year=${year}`)
        const json = await res.json()
        if (!res.ok) {
          throw new Error(json.error || 'Lỗi khi tải tiến độ khóa sổ')
        }
        if (isMounted) {
          setSummaries(json.departments || [])
          setLockedCount(json.lockedCount || 0)
          setTotalDepts(json.totalDepartments || 11)
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchSummary()
    return () => {
      isMounted = false
    }
  }, [month, year])

  const exportUrl = `/api/attendance/export?month=${month}&year=${year}&departmentId=${currentDeptId}`
  const progressPercent = totalDepts > 0 ? Math.round((lockedCount / totalDepts) * 100) : 0

  return (
    <div className="space-y-6">
      {/* 2 Khối Thẻ Xuất Báo Cáo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Thẻ 1: Xuất Excel Bảng Chấm Công Khoa */}
        <Card className="p-5 space-y-4 border border-[#E8E8F2] dark:border-[#2A2C49]">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-[14px] bg-[#EAFBF1] dark:bg-[#152B1E] text-[#1E9E52] dark:text-[#34C759] flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#1F2050] dark:text-[#F0F1F9]">
                Bảng Chấm Công Chi Tiết Khoa {currentDeptCode}
              </h3>
              <p className="text-xs text-[#5A5B7C] dark:text-[#A3A6C4] mt-0.5">
                Mẫu chuẩn Bệnh viện Đa khoa Khánh Hội &bull; Tháng {month}/{year}
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-[12px] bg-[#F6F7FB] dark:bg-[#1E2038] text-xs text-[#5A5B7C] dark:text-[#A3A6C4] space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-[#1F2050] dark:text-[#F0F1F9]">
              <ShieldCheck className="w-4 h-4 text-[#1E9E52]" />
              <span>Quy cách biểu mẫu chuẩn:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-1">
              <li>Toàn bộ định dạng chuẩn font chữ <strong>Times New Roman</strong></li>
              <li>Tự động đánh dấu ngày nghỉ Thứ Bảy, Chủ Nhật và ngày lễ quốc gia</li>
              <li>Phân biệt màu trực quan 7 chế độ: Có mặt (✓), Công tác (CT), Đi học (H), Phép (P), Ốm (Ô), Thai sản (TS), Vắng (V)</li>
              <li>Tích hợp sẵn 3 chữ ký: <em>Người lập biểu</em>, <em>Điều dưỡng trưởng</em>, <em>Ban Giám Đốc</em></li>
            </ul>
          </div>

          <div className="pt-1">
            <a
              href={exportUrl}
              download
              className="w-full inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[12px] bg-[#1E9E52] hover:bg-[#178544] text-white font-bold text-xs transition shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Tải file Excel bảng công khoa ({currentDeptCode})</span>
            </a>
          </div>
        </Card>

        {/* Thẻ 2: Báo Cáo Chốt Công Gửi Phòng TCCB */}
        <Card className="p-5 space-y-4 border border-[#E8E8F2] dark:border-[#2A2C49]">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-[14px] bg-[#EDECFB] dark:bg-[#202242] text-[#6B63DE] dark:text-[#8E87F5] flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#1F2050] dark:text-[#F0F1F9]">
                Báo Cáo Tổng Hợp Chốt Công Toàn Khoa
              </h3>
              <p className="text-xs text-[#5A5B7C] dark:text-[#A3A6C4] mt-0.5">
                Dữ liệu gửi Phòng Tổ Chức Cán Bộ &amp; Tài Chính Kế Toán
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-[12px] bg-[#F6F7FB] dark:bg-[#1E2038] text-xs text-[#5A5B7C] dark:text-[#A3A6C4] space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-[#1F2050] dark:text-[#F0F1F9]">
              <Clock className="w-4 h-4 text-[#6B63DE]" />
              <span>Lưu ý nghiệp vụ chốt công:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-1">
              <li>Chỉ xuất dữ liệu chính thức sau khi Điều dưỡng trưởng đã bấm <strong>Khoá sổ</strong></li>
              <li>Bảng tổng hợp phản ánh số công tính lương thực nhận của từng cán bộ</li>
              <li>Mọi thay đổi sau khi khóa cần báo Quản trị viên (ADMIN) mở khóa</li>
            </ul>
          </div>

          <div className="pt-1">
            <a
              href={exportUrl}
              download
              className="w-full inline-flex items-center justify-center gap-2 h-10 px-4 rounded-[12px] bg-[#6B63DE] hover:bg-[#5850CE] text-white font-bold text-xs transition shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Tải file tổng hợp gửi Phòng TCCB</span>
            </a>
          </div>
        </Card>
      </div>

      {/* Tiến Độ Chốt Sổ Của 11 Khoa Phòng (Dành cho Admin & BGD theo dõi) */}
      <Card className="overflow-hidden border border-[#E8E8F2] dark:border-[#2A2C49]">
        <div className="p-4 border-b border-[#E8E8F2] dark:border-[#2A2C49] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-sm text-[#1F2050] dark:text-[#F0F1F9]">
                Tiến Độ Chốt Sổ Chấm Công 11 Khoa Phòng &bull; Tháng {month}/{year}
              </h3>
              <p className="text-xs text-[#5A5B7C] dark:text-[#A3A6C4]">
                Theo dõi tình hình hoàn thành và chốt bảng công của các khoa phòng trong toàn viện
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="text-[#1F2050] dark:text-[#F0F1F9]">
                Đã chốt: <strong className="text-[#1E9E52] dark:text-[#34C759]">{lockedCount}</strong>/{totalDepts} khoa
              </span>
              <span className="text-[#8A8BA0] dark:text-[#6C6F93]">({progressPercent}%)</span>
            </div>
          </div>

          <ProgressBar
            value={lockedCount}
            max={totalDepts}
            color={lockedCount === totalDepts ? 'bg-[#1E9E52]' : 'bg-[#6B63DE]'}
          />
        </div>

        {loading ? (
          <div className="p-12 text-center text-[#5A5B7C] dark:text-[#A3A6C4]">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#6B63DE]" />
            <span className="text-xs font-semibold">Đang tải tiến độ chốt sổ các khoa...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-[#C53030] dark:text-[#FF6B6B] space-y-2">
            <AlertCircle className="w-6 h-6 mx-auto" />
            <p className="text-xs font-semibold">{error}</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <Table className="w-full text-xs text-left border-collapse">
              <TableHeader>
                <TableRow className="border-b border-[#E8E8F2] dark:border-[#2A2C49] bg-[#F6F7FB] dark:bg-[#1E2038] text-[#1F2050] dark:text-[#F0F1F9]">
                  <TableHead className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px] w-14 text-center">
                    STT
                  </TableHead>
                  <TableHead className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px] w-28">
                    Mã khoa
                  </TableHead>
                  <TableHead className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px]">
                    Tên khoa phòng
                  </TableHead>
                  <TableHead className="py-3 px-3 font-bold text-center uppercase tracking-wider text-[11px] w-28">
                    Nhân sự
                  </TableHead>
                  <TableHead className="py-3 px-3 font-bold text-center uppercase tracking-wider text-[11px] w-28">
                    Công chuẩn
                  </TableHead>
                  <TableHead className="py-3 px-3.5 font-bold text-center uppercase tracking-wider text-[11px] w-36">
                    Trạng thái
                  </TableHead>
                  <TableHead className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px]">
                    Người chốt / Thời gian
                  </TableHead>
                  <TableHead className="py-3 px-3.5 font-bold text-center uppercase tracking-wider text-[11px] w-28">
                    Tải Excel
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody className="divide-y divide-[#E8E8F2] dark:divide-[#2A2C49]">
                {summaries.map((dept, index) => (
                  <TableRow
                    key={dept.departmentId}
                    className="hover:bg-[#F0F1F9]/60 dark:hover:bg-[#242744] transition-colors"
                  >
                    <TableCell className="py-2.5 px-3.5 font-mono text-[#8A8BA0] dark:text-[#6C6F93] text-center">
                      {index + 1}
                    </TableCell>

                    <TableCell className="py-2.5 px-3.5 font-mono font-bold text-[#6B63DE] dark:text-[#8E87F5]">
                      {dept.code}
                    </TableCell>

                    <TableCell className="py-2.5 px-3.5 font-bold text-[#1F2050] dark:text-[#F0F1F9]">
                      {userRole !== 'KHOA_USER' && onSelectDepartment ? (
                        <button
                          type="button"
                          onClick={() => onSelectDepartment(dept.departmentId)}
                          className="hover:text-[#6B63DE] dark:hover:text-[#8E87F5] transition text-left cursor-pointer"
                        >
                          {dept.name}
                        </button>
                      ) : (
                        <span>{dept.name}</span>
                      )}
                    </TableCell>

                    <TableCell className="py-2.5 px-3 font-mono text-center font-bold text-[#1F2050] dark:text-[#F0F1F9]">
                      {dept.employeeCount} <span className="text-[10px] font-normal text-[#8A8BA0]">NV</span>
                    </TableCell>

                    <TableCell className="py-2.5 px-3 font-mono text-center text-[#5A5B7C] dark:text-[#A3A6C4]">
                      {dept.standardDays}
                    </TableCell>

                    <TableCell className="py-2.5 px-3.5 text-center">
                      {dept.isLocked ? (
                        <Badge variant="warning" className="h-6 px-2 text-[10px] font-bold gap-1">
                          <Lock className="w-3 h-3" />
                          <span>Đã khoá sổ</span>
                        </Badge>
                      ) : (
                        <Badge variant="success" className="h-6 px-2 text-[10px] font-bold gap-1">
                          <Unlock className="w-3 h-3" />
                          <span>Đang mở</span>
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="py-2.5 px-3.5 text-xs text-[#5A5B7C] dark:text-[#A3A6C4]">
                      {dept.isLocked && dept.lockedBy ? (
                        <div>
                          <div className="font-semibold text-[#1F2050] dark:text-[#F0F1F9]">
                            {dept.lockedBy.name}
                          </div>
                          {dept.lockedAt && (
                            <div className="text-[10px] text-[#8A8BA0] dark:text-[#6C6F93]">
                              {formatDateTimeShort(dept.lockedAt)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[#8A8BA0] dark:text-[#6C6F93] italic">Chưa chốt số liệu</span>
                      )}
                    </TableCell>

                    <TableCell className="py-2.5 px-3.5 text-center">
                      <a
                        href={`/api/attendance/export?month=${month}&year=${year}&departmentId=${dept.departmentId}`}
                        download
                        className="inline-flex items-center justify-center w-7 h-7 rounded-[8px] hover:bg-[#EAFBF1] dark:hover:bg-[#152B1E] text-[#1E9E52] dark:text-[#34C759] transition cursor-pointer"
                        title={`Tải file Excel của khoa ${dept.code}`}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  )
}
