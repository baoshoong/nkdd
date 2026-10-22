'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  History,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Loader2,
  Calendar,
  User,
  Activity,
  Building2,
  Filter,
  RotateCcw,
  Download,
  X
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table'
import { DatePicker } from '@/components/ui/DatePicker'
import { formatDateShort, formatDateTimeWithSeconds } from '@/lib/date-utils'

interface AuditLogItem {
  id: number
  reportDate: string
  departmentId: number
  departmentCode: string
  departmentName: string
  indicatorId: number
  indicatorName: string
  userId: number
  userName: string
  oldValue: number | null
  newValue: number
  createdAt: string
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface FilterOptions {
  departments: Array<{ id: number; code: string; name: string }>
  indicators: Array<{ id: number; code: string; name: string }>
  users: Array<{ id: number; username: string; name: string }>
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 30,
    total: 0,
    totalPages: 1
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Bộ lọc đa tiêu chí
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedDept, setSelectedDept] = useState<string>('')
  const [selectedIndicator, setSelectedIndicator] = useState<string>('')
  const [selectedUser, setSelectedUser] = useState<string>('')

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    departments: [],
    indicators: [],
    users: []
  })

  const fetchLogs = useCallback(
    async (pageToFetch: number) => {
      try {
        setLoading(true)
        setError(null)

        const query = new URLSearchParams()
        query.set('page', String(pageToFetch))
        query.set('limit', '50')
        query.set('order', 'desc')

        if (selectedDate) query.set('reportDate', selectedDate)
        if (selectedDept) query.set('departmentId', selectedDept)
        if (selectedIndicator) query.set('indicatorId', selectedIndicator)
        if (selectedUser) query.set('userId', selectedUser)

        const res = await fetch(`/api/audit?${query.toString()}`)
        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}))
          throw new Error(errJson.error || 'Không thể tải lịch sử thay đổi')
        }
        const json = await res.json()
        setLogs(json.data)
        setPagination(json.pagination)

        if (json.filters) {
          setFilterOptions(json.filters)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Lỗi hệ thống')
      } finally {
        setLoading(false)
      }
    },
    [selectedDate, selectedDept, selectedIndicator, selectedUser]
  )

  // Khi thay đổi điều kiện lọc, reset trang về 1 và fetch
  useEffect(() => {
    fetchLogs(1)
  }, [fetchLogs])

  const handleResetFilters = () => {
    setSelectedDate('')
    setSelectedDept('')
    setSelectedIndicator('')
    setSelectedUser('')
  }

  // URL xuất file Excel dựa trên các filter hiện tại
  const exportQuery = new URLSearchParams()
  if (selectedDate) exportQuery.set('reportDate', selectedDate)
  if (selectedDept) exportQuery.set('departmentId', selectedDept)
  if (selectedIndicator) exportQuery.set('indicatorId', selectedIndicator)
  if (selectedUser) exportQuery.set('userId', selectedUser)
  const exportUrl = `/api/audit/export?${exportQuery.toString()}`

  const hasActiveFilters = Boolean(
    selectedDate || selectedDept || selectedIndicator || selectedUser
  )

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      {/* Header Card */}
      <Card className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[10px] bg-[#EDECFB] dark:bg-[#202242] text-[#6B63DE] dark:text-[#8E87F5] flex items-center justify-center">
              <History className="w-4.5 h-4.5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[#1F2050] dark:text-[#F0F1F9]">
              Lịch sử Thay đổi Dữ liệu (Audit Log)
            </h1>
          </div>
          <p className="text-xs text-[#5A5B7C] dark:text-[#A3A6C4] font-medium mt-1">
            Theo dõi nhật ký chi tiết tất cả các thao tác nhập và sửa số liệu báo cáo điều dưỡng
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="brand" className="h-8 px-3 text-xs">
            Tổng {pagination.total.toLocaleString('vi-VN')} bản ghi
          </Badge>

          <a
            href={exportUrl}
            download
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-[10px] bg-[#34C759] text-white text-xs font-bold hover:bg-[#2EB34F] active:bg-[#289E45] shadow-xs transition select-none cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Xuất Excel</span>
          </a>
        </div>
      </Card>

      {/* Thanh Công Cụ Bộ Lọc Đa Tiêu Chí */}
      <Card className="p-4 bg-white dark:bg-[#18192E] border border-[#E8E8F2] dark:border-[#2A2C49]">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#F0F1F9] dark:border-[#2A2C49]">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1F2050] dark:text-[#F0F1F9]">
            <Filter className="w-4 h-4 text-[#6B63DE] dark:text-[#8E87F5]" />
            <span>Bộ Lọc Nhật Ký</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-[#34C759]" title="Đang áp dụng bộ lọc" />
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#6B63DE] dark:text-[#8E87F5] hover:text-[#534CC9] dark:hover:text-[#A8A3FF] hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Đặt lại bộ lọc</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Lọc theo ngày báo cáo */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#5A5B7C] dark:text-[#A3A6C4] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#6B63DE] dark:text-[#8E87F5]" />
                Ngày báo cáo
              </span>
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate('')}
                  className="text-[10px] text-[#C53030] dark:text-[#FF6B6B] hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" /> Tất cả ngày
                </button>
              )}
            </label>
            <div className="w-full">
              <DatePicker
                value={selectedDate}
                onChange={(d) => setSelectedDate(d)}
                placeholder="Tất cả các ngày..."
                className="w-full"
              />
            </div>
          </div>

          {/* 2. Lọc theo khoa phòng */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#5A5B7C] dark:text-[#A3A6C4] flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#6B63DE] dark:text-[#8E87F5]" />
              Khoa phòng
            </label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full h-9 px-3 rounded-[12px] text-xs font-semibold text-[#1F2050] dark:text-[#F0F1F9] bg-white dark:bg-[#1E2038] border border-[#E8E8F2] dark:border-[#2A2C49] focus:outline-none focus:ring-2 focus:ring-[#6B63DE]/25 dark:focus:ring-[#8E87F5]/25 cursor-pointer shadow-2xs"
            >
              <option value="">-- Tất cả khoa phòng --</option>
              {filterOptions.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  [{d.code}] {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Lọc theo chỉ số báo cáo */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#5A5B7C] dark:text-[#A3A6C4] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#6B63DE] dark:text-[#8E87F5]" />
              Chỉ số báo cáo
            </label>
            <select
              value={selectedIndicator}
              onChange={(e) => setSelectedIndicator(e.target.value)}
              className="w-full h-9 px-3 rounded-[12px] text-xs font-semibold text-[#1F2050] dark:text-[#F0F1F9] bg-white dark:bg-[#1E2038] border border-[#E8E8F2] dark:border-[#2A2C49] focus:outline-none focus:ring-2 focus:ring-[#6B63DE]/25 dark:focus:ring-[#8E87F5]/25 cursor-pointer shadow-2xs"
            >
              <option value="">-- Tất cả chỉ số --</option>
              {filterOptions.indicators.map((ind) => (
                <option key={ind.id} value={ind.id}>
                  {ind.name}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Lọc theo người thực hiện */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#5A5B7C] dark:text-[#A3A6C4] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#6B63DE] dark:text-[#8E87F5]" />
              Người thực hiện
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full h-9 px-3 rounded-[12px] text-xs font-semibold text-[#1F2050] dark:text-[#F0F1F9] bg-white dark:bg-[#1E2038] border border-[#E8E8F2] dark:border-[#2A2C49] focus:outline-none focus:ring-2 focus:ring-[#6B63DE]/25 dark:focus:ring-[#8E87F5]/25 cursor-pointer shadow-2xs"
            >
              <option value="">-- Tất cả người dùng --</option>
              {filterOptions.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.username})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Bảng Audit Log */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-16">
            <div className="flex items-center gap-3 text-[#5A5B7C] dark:text-[#A3A6C4] font-semibold text-sm">
              <Loader2 className="w-5 h-5 text-[#6B63DE] dark:text-[#8E87F5] animate-spin" />
              Đang tải danh sách lịch sử...
            </div>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-[#C53030] dark:text-[#FF6B6B]">
            <p className="font-semibold text-sm">{error}</p>
            <Button
              variant="danger"
              size="sm"
              onClick={() => fetchLogs(pagination.page)}
              className="mt-3"
            >
              Thử lại
            </Button>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-[#8A8BA0] dark:text-[#6C6F93]">
            <History className="w-10 h-10 mx-auto mb-2 opacity-50 text-[#8A8BA0] dark:text-[#6C6F93]" />
            <p className="text-sm font-medium">Không tìm thấy bản ghi nhật ký phù hợp với bộ lọc</p>
            {hasActiveFilters && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleResetFilters}
                className="mt-3 gap-1.5 font-semibold text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại tất cả bộ lọc</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <Table className="w-full text-xs text-left border-collapse">
              <TableHeader>
                <TableRow className="border-b border-[#E8E8F2] dark:border-[#2A2C49] bg-[#F6F7FB] dark:bg-[#1E2038] text-[#1F2050] dark:text-[#F0F1F9]">
                  <TableHead className="py-2.5 px-3 font-bold uppercase tracking-wider text-[11px]">
                    Thời gian
                  </TableHead>
                  <TableHead className="py-2.5 px-3 font-bold uppercase tracking-wider text-[11px]">
                    Ngày báo cáo
                  </TableHead>
                  <TableHead className="py-2.5 px-3 font-bold uppercase tracking-wider text-[11px]">
                    Khoa phòng
                  </TableHead>
                  <TableHead className="py-2.5 px-3 font-bold uppercase tracking-wider text-[11px]">
                    Chỉ số báo cáo
                  </TableHead>
                  <TableHead className="py-2.5 px-3 font-bold text-center uppercase tracking-wider text-[11px]">
                    Biến động (Cũ → Mới)
                  </TableHead>
                  <TableHead className="py-2.5 px-3 font-bold uppercase tracking-wider text-[11px]">
                    Người thực hiện
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#E8E8F2] dark:divide-[#2A2C49]">
                {logs.map((log) => {
                  const timeFormatted = formatDateTimeWithSeconds(log.createdAt)
                  const reportDateFormatted = formatDateShort(log.reportDate)

                  const delta =
                    log.oldValue !== null ? log.newValue - log.oldValue : log.newValue

                  return (
                    <TableRow
                      key={log.id}
                      className="hover:bg-[#F0F1F9] dark:hover:bg-[#242744] transition-colors duration-150"
                    >
                      <TableCell className="py-2.5 px-3 font-mono text-[#5A5B7C] dark:text-[#A3A6C4] tabular-nums whitespace-nowrap">
                        {timeFormatted}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 font-semibold text-[#1F2050] dark:text-[#F0F1F9] whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[#6B63DE] dark:text-[#8E87F5]" />
                          {reportDateFormatted}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 px-3 font-semibold text-[#1F2050] dark:text-[#F0F1F9] whitespace-nowrap">
                        <span className="font-bold text-[#6B63DE] dark:text-[#8E87F5] mr-1.5">
                          [{log.departmentCode}]
                        </span>
                        {log.departmentName}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 font-medium text-[#1F2050] dark:text-[#F0F1F9]">
                        {log.indicatorName}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-2 font-mono tabular-nums font-semibold">
                          <span className="text-[#8A8BA0] dark:text-[#6C6F93]">
                            {log.oldValue !== null ? log.oldValue : '0'}
                          </span>
                          <ArrowRight className="w-3 h-3 text-[#5A5B7C] dark:text-[#A3A6C4]" />
                          <span className="text-[#1F2050] dark:text-[#F0F1F9] font-bold">
                            {log.newValue}
                          </span>
                          <Badge
                            variant={delta >= 0 ? 'success' : 'danger'}
                            className="h-4.5 px-1.5 text-[10px]"
                          >
                            {delta >= 0 ? `+${delta}` : delta}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-[#5A5B7C] dark:text-[#A3A6C4] whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <User className="w-3.5 h-3.5 text-[#8A8BA0] dark:text-[#6C6F93]" />
                          {log.userName}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Thanh phân trang UI */}
        <div className="p-4 border-t border-[#E8E8F2] dark:border-[#2A2C49] flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#F6F7FB]/50 dark:bg-[#1E2038]/50">
          <span className="text-xs font-semibold text-[#5A5B7C] dark:text-[#A3A6C4]">
            Trang{' '}
            <strong className="text-[#1F2050] dark:text-[#F0F1F9]">{pagination.page}</strong> /{' '}
            <strong className="text-[#1F2050] dark:text-[#F0F1F9]">{pagination.totalPages}</strong>{' '}
            (Tổng {pagination.total.toLocaleString('vi-VN')} bản ghi)
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page <= 1 || loading}
              onClick={() => {
                const prevPage = pagination.page - 1
                setPagination((prev) => ({ ...prev, page: prevPage }))
                fetchLogs(prevPage)
              }}
              className="gap-1 font-semibold"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Trang trước</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => {
                const nextPage = pagination.page + 1
                setPagination((prev) => ({ ...prev, page: nextPage }))
                fetchLogs(nextPage)
              }}
              className="gap-1 font-semibold"
            >
              <span>Trang sau</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
