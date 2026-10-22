'use client'

import { useState, useMemo } from 'react'
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Filter,
  Loader2
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from '@/components/ui/table'

export interface EmployeeItem {
  id: number
  code: string
  name: string
  title: string
  isActive: boolean
  resignedAt?: string | null
}

interface EmployeeManagementTabProps {
  employees: EmployeeItem[]
  departmentName: string
  departmentId: number
  canEdit: boolean
  onAddClick: () => void
  onEditClick: (emp: EmployeeItem) => void
  onDeleteClick: (emp: EmployeeItem) => void
  onRefresh: () => void
  showToast: (msg: string) => void
}

export function EmployeeManagementTab({
  employees,
  departmentName,
  departmentId,
  canEdit,
  onAddClick,
  onEditClick,
  onDeleteClick,
  onRefresh,
  showToast
}: EmployeeManagementTabProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [restoringId, setRestoringId] = useState<number | null>(null)

  // Lọc nhân sự theo từ khoá và trạng thái
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // 1. Lọc theo trạng thái
      if (statusFilter === 'ACTIVE' && !emp.isActive) return false
      if (statusFilter === 'INACTIVE' && emp.isActive) return false

      // 2. Lọc theo từ khoá
      if (!searchTerm.trim()) return true
      const term = searchTerm.toLowerCase().trim()
      return (
        emp.name.toLowerCase().includes(term) ||
        emp.code.toLowerCase().includes(term) ||
        emp.title.toLowerCase().includes(term)
      )
    })
  }, [employees, searchTerm, statusFilter])

  // Khôi phục nhân sự đã nghỉ việc
  const handleRestore = async (emp: EmployeeItem) => {
    try {
      setRestoringId(emp.id)
      const res = await fetch(`/api/attendance/employees/${emp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true })
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Lỗi khi khôi phục nhân viên')
      }

      showToast(`Đã khôi phục nhân sự "${emp.name}" về trạng thái đang làm việc!`)
      onRefresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi khi khôi phục nhân sự')
    } finally {
      setRestoringId(null)
    }
  }

  const activeCount = employees.filter((e) => e.isActive).length
  const inactiveCount = employees.filter((e) => !e.isActive).length

  return (
    <div className="space-y-5">
      {/* 3 Thẻ thống kê nhân sự */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[12px] bg-[#EDECFB] dark:bg-[#202242] text-[#6B63DE] dark:text-[#8E87F5] flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#8A8BA0] dark:text-[#6C6F93]">Tổng danh sách</div>
            <div className="text-xl font-extrabold text-[#1F2050] dark:text-[#F0F1F9] tabular-nums">
              {employees.length} <span className="text-xs font-normal text-[#8A8BA0] dark:text-[#6C6F93]">nhân sự</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[12px] bg-[#EAFBF1] dark:bg-[#152B1E] text-[#1E9E52] dark:text-[#34C759] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#8A8BA0] dark:text-[#6C6F93]">Đang làm việc</div>
            <div className="text-xl font-extrabold text-[#1E9E52] dark:text-[#34C759] tabular-nums">
              {activeCount} <span className="text-xs font-normal text-[#8A8BA0] dark:text-[#6C6F93]">người</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-[12px] bg-[#FDECEC] dark:bg-[#3D1E24] text-[#C53030] dark:text-[#FF6B6B] flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#8A8BA0] dark:text-[#6C6F93]">Đã nghỉ việc / Lưu trữ</div>
            <div className="text-xl font-extrabold text-[#C53030] dark:text-[#FF6B6B] tabular-nums">
              {inactiveCount} <span className="text-xs font-normal text-[#8A8BA0] dark:text-[#6C6F93]">người</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Thanh công cụ: Tìm kiếm, Bộ lọc & Nút Thêm mới */}
      <Card className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          {/* Ô tìm kiếm */}
          <div className="relative min-w-[220px] max-w-sm flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8BA0] dark:text-[#6C6F93]" />
            <Input
              type="text"
              placeholder="Tìm theo tên, mã NV hoặc chức danh..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Bộ lọc trạng thái */}
          <div className="flex items-center gap-1 bg-[#F6F7FB] dark:bg-[#1E2038] p-1 rounded-[12px] border border-[#E8E8F2] dark:border-[#2A2C49]">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-[8px] text-xs font-bold transition cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white dark:bg-[#18192E] text-[#6B63DE] dark:text-[#8E87F5] shadow-2xs'
                  : 'text-[#5A5B7C] dark:text-[#A3A6C4] hover:text-[#1F2050] dark:hover:text-white'
              }`}
            >
              Tất cả ({employees.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1 rounded-[8px] text-xs font-bold transition cursor-pointer ${
                statusFilter === 'ACTIVE'
                  ? 'bg-white dark:bg-[#18192E] text-[#1E9E52] dark:text-[#34C759] shadow-2xs'
                  : 'text-[#5A5B7C] dark:text-[#A3A6C4] hover:text-[#1F2050] dark:hover:text-white'
              }`}
            >
              Đang làm ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-1 rounded-[8px] text-xs font-bold transition cursor-pointer ${
                statusFilter === 'INACTIVE'
                  ? 'bg-white dark:bg-[#18192E] text-[#C53030] dark:text-[#FF6B6B] shadow-2xs'
                  : 'text-[#5A5B7C] dark:text-[#A3A6C4] hover:text-[#1F2050] dark:hover:text-white'
              }`}
            >
              Đã nghỉ ({inactiveCount})
            </button>
          </div>
        </div>

        {/* Nút Thêm nhân viên */}
        {canEdit && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onAddClick}
            className="font-bold gap-1.5 h-9 shrink-0 shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Thêm nhân sự mới</span>
          </Button>
        )}
      </Card>

      {/* Bảng danh sách nhân sự */}
      <Card className="overflow-hidden border border-[#E8E8F2] dark:border-[#2A2C49]">
        <div className="overflow-x-auto scrollbar-thin">
          <Table className="w-full text-xs text-left border-collapse">
            <TableHeader>
              <TableRow className="border-b border-[#E8E8F2] dark:border-[#2A2C49] bg-[#F6F7FB] dark:bg-[#1E2038] text-[#1F2050] dark:text-[#F0F1F9]">
                <TableHead className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px] w-14 text-center">
                  STT
                </TableHead>
                <TableHead className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px] w-36">
                  Mã nhân viên
                </TableHead>
                <TableHead className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px]">
                  Họ và tên nhân sự
                </TableHead>
                <TableHead className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px]">
                  Chức danh chuyên môn
                </TableHead>
                <TableHead className="py-3 px-3.5 font-bold text-center uppercase tracking-wider text-[11px] w-36">
                  Trạng thái
                </TableHead>
                {canEdit && (
                  <TableHead className="py-3 px-3.5 font-bold text-center uppercase tracking-wider text-[11px] w-32">
                    Thao tác
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-[#E8E8F2] dark:divide-[#2A2C49]">
              {filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canEdit ? 6 : 5}
                    className="py-12 text-center text-[#8A8BA0] dark:text-[#6C6F93]"
                  >
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-sm">Không tìm thấy nhân sự phù hợp</p>
                    <p className="text-xs mt-1">Thử đổi từ khoá tìm kiếm hoặc chuyển bộ lọc trạng thái</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((emp, index) => (
                  <TableRow
                    key={emp.id}
                    className="hover:bg-[#F0F1F9]/60 dark:hover:bg-[#242744] transition-colors"
                  >
                    <TableCell className="py-2.5 px-3.5 font-mono text-[#8A8BA0] dark:text-[#6C6F93] text-center tabular-nums">
                      {index + 1}
                    </TableCell>

                    <TableCell className="py-2.5 px-3.5">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-[6px] bg-[#EDECFB] dark:bg-[#202242] text-[#6B63DE] dark:text-[#8E87F5] border border-[#6B63DE]/20">
                        {emp.code}
                      </span>
                    </TableCell>

                    <TableCell className="py-2.5 px-3.5 font-bold text-[#1F2050] dark:text-[#F0F1F9]">
                      {emp.name}
                    </TableCell>

                    <TableCell className="py-2.5 px-3.5 text-[#5A5B7C] dark:text-[#A3A6C4] font-medium">
                      {emp.title}
                    </TableCell>

                    <TableCell className="py-2.5 px-3.5 text-center">
                      {emp.isActive ? (
                        <Badge variant="success" className="h-6 px-2 text-[10px] font-bold">
                          Đang làm việc
                        </Badge>
                      ) : (
                        <div className="flex flex-col items-center gap-0.5">
                          <Badge variant="neutral" className="h-6 px-2 text-[10px] font-bold bg-[#FDECEC] dark:bg-[#3D1E24] text-[#C53030] dark:text-[#FF6B6B] border border-[#C53030]/20">
                            Đã nghỉ việc
                          </Badge>
                          {emp.resignedAt && (
                            <span className="text-[10px] text-[#8A8BA0] dark:text-[#6C6F93] font-mono">
                              Từ {new Date(emp.resignedAt).toLocaleDateString('vi-VN')}
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>

                    {canEdit && (
                      <TableCell className="py-2.5 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Nút Sửa */}
                          <button
                            type="button"
                            onClick={() => onEditClick(emp)}
                            className="w-7 h-7 rounded-[8px] hover:bg-[#EDECFB] dark:hover:bg-[#202242] text-[#6B63DE] dark:text-[#8E87F5] flex items-center justify-center transition cursor-pointer"
                            title="Sửa thông tin nhân sự"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Nút Khôi phục hoặc Xoá */}
                          {!emp.isActive ? (
                            <button
                              type="button"
                              onClick={() => handleRestore(emp)}
                              disabled={restoringId === emp.id}
                              className="w-7 h-7 rounded-[8px] hover:bg-[#EAFBF1] dark:hover:bg-[#152B1E] text-[#1E9E52] dark:text-[#34C759] flex items-center justify-center transition cursor-pointer"
                              title="Khôi phục trạng thái làm việc"
                            >
                              {restoringId === emp.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3.5 h-3.5" />
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onDeleteClick(emp)}
                              className="w-7 h-7 rounded-[8px] hover:bg-[#FDECEC] dark:hover:bg-[#3D1E24] text-[#8A8BA0] hover:text-[#C53030] dark:hover:text-[#FF6B6B] flex items-center justify-center transition cursor-pointer"
                              title="Xoá nhân sự"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
