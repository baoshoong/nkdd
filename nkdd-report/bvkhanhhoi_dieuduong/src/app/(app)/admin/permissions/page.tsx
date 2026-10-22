'use client'

import { useEffect, useState, useMemo, Fragment, useRef } from 'react'
import {
  ShieldCheck,
  Save,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  RefreshCw,
  GripVertical
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { SyncedHorizontalScroll } from '@/components/ui/SyncedHorizontalScroll'
import { useTableDragScroll } from '@/lib/hooks/use-table-drag-scroll'
import { getShortDeptName } from '@/lib/department-utils'
import { cn } from '@/lib/utils'

interface DepartmentItem {
  id: number
  code: string
  name: string
}

interface IndicatorItem {
  id: number
  code: string
  name: string
  groupName: string
  groupId: number
}

interface PermissionsResponse {
  departments: DepartmentItem[]
  indicators: IndicatorItem[]
  matrix: Record<number, Record<number, boolean>>
}

export default function AdminPermissionsPage() {
  const [data, setData] = useState<PermissionsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingDeptId, setSavingDeptId] = useState<number | null>(null)
  const [savingAll, setSavingAll] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // State lưu trữ ma trận tạm thời khi người dùng tương tác checkbox
  const [dirty, setDirty] = useState<Record<number, Record<number, boolean>>>({})

  // Ref container cuộn của bảng ma trận phân quyền
  const tableContainerRef = useRef<HTMLDivElement>(null)

  // Hook kéo cuộn ngang bằng cách giữ chuột trái
  const { isDragging, dragProps } = useTableDragScroll(tableContainerRef)

  // Fetch dữ liệu phân quyền ban đầu
  const fetchPermissions = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/admin/permissions')
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || 'Không thể tải bảng phân quyền')
      }
      const json: PermissionsResponse = await res.json()
      setData(json)
      // Khởi tạo dirty từ matrix
      setDirty(JSON.parse(JSON.stringify(json.matrix)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi hệ thống')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPermissions()
  }, [])

  // Nhóm indicators theo groupName
  const groups = useMemo(() => {
    if (!data?.indicators) return []
    const map = new Map<string, IndicatorItem[]>()
    for (const ind of data.indicators) {
      if (!map.has(ind.groupName)) {
        map.set(ind.groupName, [])
      }
      map.get(ind.groupName)!.push(ind)
    }
    return Array.from(map.entries()).map(([groupName, indicators]) => ({
      groupName,
      indicators
    }))
  }, [data?.indicators])

  // Bật/tắt checkbox phân quyền
  const togglePermission = (deptId: number, indId: number) => {
    setDirty((prev) => {
      const deptPermissions = { ...(prev[deptId] || {}) }
      deptPermissions[indId] = !deptPermissions[indId]
      return {
        ...prev,
        [deptId]: deptPermissions
      }
    })
  }

  // Chọn tất cả hoặc bỏ chọn tất cả cho một khoa trong một nhóm
  const toggleGroupForDept = (deptId: number, groupIndicators: IndicatorItem[]) => {
    const allChecked = groupIndicators.every((ind) => Boolean(dirty[deptId]?.[ind.id]))
    const newChecked = !allChecked

    setDirty((prev) => {
      const deptPermissions = { ...(prev[deptId] || {}) }
      for (const ind of groupIndicators) {
        deptPermissions[ind.id] = newChecked
      }
      return {
        ...prev,
        [deptId]: deptPermissions
      }
    })
  }

  // Kiểm tra xem khoa có thay đổi chưa lưu không
  const isDeptDirty = (deptId: number): boolean => {
    if (!data?.matrix?.[deptId] || !dirty[deptId]) return false
    const orig = data.matrix[deptId]
    const cur = dirty[deptId]
    for (const ind of data.indicators) {
      if (Boolean(orig[ind.id]) !== Boolean(cur[ind.id])) {
        return true
      }
    }
    return false
  }

  // Danh sách các khoa có thay đổi chưa lưu
  const dirtyDeptList = useMemo(() => {
    if (!data?.departments) return []
    return data.departments.filter((dept) => isDeptDirty(dept.id))
  }, [data, dirty])

  // Lưu phân quyền cho một khoa cụ thể
  const handleSaveDept = async (deptId: number, deptName: string) => {
    if (!data) return
    setSavingDeptId(deptId)
    setError(null)

    try {
      const deptMatrix = dirty[deptId] || {}
      const items = data.indicators.map((ind) => ({
        indicatorId: ind.id,
        canEdit: Boolean(deptMatrix[ind.id])
      }))

      const res = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId: deptId,
          items
        })
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || 'Lỗi khi lưu phân quyền')
      }

      // Cập nhật lại matrix gốc
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          matrix: {
            ...prev.matrix,
            [deptId]: { ...deptMatrix }
          }
        }
      })

      setToast(`Đã lưu phân quyền thành công cho ${deptName}`)
      setTimeout(() => setToast(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi lưu')
    } finally {
      setSavingDeptId(null)
    }
  }

  // Lưu tất cả các khoa có thay đổi một lượt (Batch Save)
  const handleSaveAll = async () => {
    if (!data || dirtyDeptList.length === 0) return
    setSavingAll(true)
    setError(null)

    try {
      const batchPayload = dirtyDeptList.map((dept) => {
        const deptMatrix = dirty[dept.id] || {}
        return {
          departmentId: dept.id,
          items: data.indicators.map((ind) => ({
            indicatorId: ind.id,
            canEdit: Boolean(deptMatrix[ind.id])
          }))
        }
      })

      const res = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: batchPayload })
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || 'Lỗi khi lưu toàn bộ phân quyền')
      }

      // Cập nhật lại toàn bộ matrix gốc
      setData((prev) => {
        if (!prev) return prev
        const newMatrix = { ...prev.matrix }
        for (const item of batchPayload) {
          newMatrix[item.departmentId] = { ...(dirty[item.departmentId] || {}) }
        }
        return {
          ...prev,
          matrix: newMatrix
        }
      })

      setToast(`Đã lưu phân quyền thành công cho ${dirtyDeptList.length} khoa phòng`)
      setTimeout(() => setToast(null), 3500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi lưu hàng loạt')
    } finally {
      setSavingAll(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 bg-white rounded-[20px] border border-[#E8E8F2] shadow-[0_4px_20px_rgba(100,100,180,0.06)]">
        <div className="flex items-center gap-3 text-[#5A5B7C] font-semibold text-sm">
          <Loader2 className="w-5 h-5 text-[#6B63DE] animate-spin" />
          Đang tải cấu hình phân quyền khoa phòng...
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="p-6 bg-[#FDECEC] border border-[#C53030]/20 rounded-[20px] text-[#C53030] flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 font-semibold">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
        <Button variant="danger" size="sm" onClick={fetchPermissions}>
          Thử lại
        </Button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      {/* Toast thông báo */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border-l-4 border-[#1E9E52] text-[#1F2050] px-4 py-3 rounded-[12px] shadow-[0_12px_32px_rgba(31,32,80,0.12)] flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#1E9E52] shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Thanh tiêu đề Card */}
      <Card className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[10px] bg-[#EDECFB] dark:bg-[#202242] text-[#6B63DE] dark:text-[#8E87F5] flex items-center justify-center">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[#1F2050] dark:text-[#F0F1F9]">
              Phân quyền Chỉ số Báo cáo theo Khoa
            </h1>
          </div>
          <p className="text-xs text-[#5A5B7C] dark:text-[#A3A6C4] font-medium mt-1">
            Chọn các chỉ số mà từng khoa phòng được phép nhập và gửi số liệu giao ban hàng ngày
          </p>
        </div>

        <div className="flex items-center gap-3">
          {error && (
            <span className="text-xs font-semibold text-[#C53030] dark:text-[#FF6B6B] bg-[#FDECEC] dark:bg-[#3D1E24] px-3 py-1.5 rounded-full border border-[#C53030]/20 dark:border-[#C53030]/30 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{error}</span>
            </span>
          )}

          {/* Nút Lưu tất cả thay đổi */}
          {dirtyDeptList.length > 0 && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSaveAll}
              disabled={savingAll}
              className="font-bold gap-1.5 shadow-sm"
            >
              {savingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Lưu tất cả ({dirtyDeptList.length} khoa)</span>
            </Button>
          )}

          {/* Nút Tải lại */}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={fetchPermissions}
            className="font-semibold gap-1.5"
            title="Tải lại bảng phân quyền"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#5A5B7C] dark:text-[#A3A6C4]" />
            <span className="hidden sm:inline">Tải lại</span>
          </Button>
        </div>
      </Card>

      {/* Thanh cuộn ngang phụ trên nóc bảng */}
      <SyncedHorizontalScroll
        tableContainerRef={tableContainerRef}
        label="Cuộn ngang để xem tất cả khoa phòng"
      />

      {/* Bảng ma trận checkbox */}
      <div className="relative border border-[#E8E8F2] dark:border-[#2A2C49] rounded-[20px] overflow-hidden bg-white dark:bg-[#18192E] shadow-[0_4px_20px_rgba(100,100,180,0.06)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        <div
          ref={tableContainerRef}
          className="max-h-[calc(100vh-230px)] min-h-[350px] overflow-auto scrollbar-thin"
        >
          <table className="w-full text-xs text-left border-collapse">
            {/* Header cột */}
            <thead className="sticky top-0 bg-[#F6F7FB] dark:bg-[#1E2038] z-20 shadow-2xs">
              <tr className="border-b border-[#E8E8F2] dark:border-[#2A2C49]">
                <th className="px-3.5 py-3 font-bold text-[#1F2050] dark:text-[#F0F1F9] border-r-2 border-[#D4D5E4] dark:border-[#3E4268] min-w-[260px] bg-[#F6F7FB] dark:bg-[#1E2038] sticky left-0 z-30 uppercase tracking-wider text-[11px] relative select-none">
                  <div className="flex items-center justify-between pr-2">
                    <span>CHỈ SỐ BÁO CÁO</span>
                    <span className="text-[10px] font-normal text-[#8A8BA0] dark:text-[#6C6F93] flex items-center gap-0.5" title="Nhấn giữ chuột trái tại mép cột để cuộn ngang">
                      <GripVertical className="w-3.5 h-3.5 text-[#6B63DE] dark:text-[#8E87F5]" />
                    </span>
                  </div>
                  {/* Dải kéo chuột trái ở mép ngoài cùng của cột */}
                  <div
                    {...dragProps}
                    title="Nhấn giữ chuột trái và kéo sang trái/phải để cuộn bảng"
                    className={cn(
                      'absolute -right-2 top-0 bottom-0 w-4 cursor-col-resize z-40 flex items-center justify-center transition-colors',
                      isDragging ? 'bg-[#6B63DE]/30' : 'hover:bg-[#6B63DE]/20'
                    )}
                  >
                    <div className="w-1 h-5 rounded-full bg-[#6B63DE]/50" />
                  </div>
                </th>

                {data.departments.map((dept) => {
                  const isSaving = savingDeptId === dept.id
                  const hasDirty = isDeptDirty(dept.id)

                  return (
                    <th
                      key={dept.id}
                      {...dragProps}
                      title={dept.name}
                      className="px-1 py-1.5 text-center border-r border-[#E8E8F2] dark:border-[#2A2C49] min-w-[68px] w-[72px] bg-[#F6F7FB] dark:bg-[#1E2038] tracking-tight cursor-grab active:cursor-grabbing select-none"
                    >
                      <div className="flex flex-col items-center gap-1 select-none">
                        <div className="flex items-center gap-1">
                          <span
                            className="font-bold text-[11px] leading-tight truncate max-w-[62px]"
                            title={dept.name}
                          >
                            {getShortDeptName(dept.code, dept.name)}
                          </span>
                          {hasDirty && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-[#FFB020] animate-pulse shrink-0"
                              title="Có thay đổi chưa lưu"
                            />
                          )}
                        </div>
                        <span className="text-[9px] font-mono opacity-65 leading-none">
                          [{dept.code}]
                        </span>

                        {hasDirty ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSaveDept(dept.id, dept.name)
                            }}
                            disabled={isSaving || savingAll}
                            className="h-5 px-1.5 rounded-[4px] bg-[#6B63DE] hover:bg-[#534CC9] text-white text-[9px] font-bold flex items-center gap-0.5 shadow-2xs transition cursor-pointer disabled:opacity-50"
                            title={`Lưu thay đổi cho ${dept.name}`}
                          >
                            {isSaving ? (
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            ) : (
                              <Save className="w-2.5 h-2.5" />
                            )}
                            <span>Lưu</span>
                          </button>
                        ) : (
                          <div className="h-5" />
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>

            {/* Dữ liệu gom theo nhóm */}
            <tbody>
              {groups.map((group) => (
                <Fragment key={`group-section-${group.groupName}`}>
                  {/* Tiêu đề nhóm span hết các cột */}
                  <tr className="bg-[#F6F7FB] dark:bg-[#202242] border-y border-[#E8E8F2] dark:border-[#2A2C49]">
                    <td
                      colSpan={1}
                      className="px-3.5 py-2 font-bold text-[#6B63DE] dark:text-[#8E87F5] uppercase tracking-wider text-[11px] bg-[#F6F7FB] dark:bg-[#202242] sticky left-0 z-10"
                    >
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#6B63DE] dark:text-[#8E87F5]" />
                        <span>{group.groupName}</span>
                      </div>
                    </td>
                    {data.departments.map((dept) => (
                      <td
                        key={dept.id}
                        className="px-1 py-1 text-center border-r border-[#E8E8F2] dark:border-[#2A2C49] bg-[#F6F7FB] dark:bg-[#202242] min-w-[68px] w-[72px]"
                      >
                        <button
                          type="button"
                          onClick={() => toggleGroupForDept(dept.id, group.indicators)}
                          title={`Chọn/Bỏ chọn tất cả chỉ số trong nhóm ${group.groupName} cho ${dept.name}`}
                          className="text-[10px] font-bold text-[#6B63DE] dark:text-[#8E87F5] hover:text-[#534CC9] dark:hover:text-[#A8A3FF] hover:underline cursor-pointer select-none inline-block px-1"
                        >
                          Tất cả
                        </button>
                      </td>
                    ))}
                  </tr>

                  {/* Từng dòng chỉ số */}
                  {group.indicators.map((ind) => (
                    <tr
                      key={ind.id}
                      className="border-b border-[#E8E8F2] dark:border-[#2A2C49] hover:bg-[#F0F1F9] dark:hover:bg-[#242744] transition"
                    >
                      <td className="px-3.5 py-2 font-medium text-[#1F2050] dark:text-[#F0F1F9] border-r-2 border-[#D4D5E4] dark:border-[#3E4268] bg-white dark:bg-[#18192E] sticky left-0 z-10 relative select-none">
                        <span>{ind.name}</span>
                        {/* Dải nhận diện kéo chuột trái tại mép cột */}
                        <div
                          {...dragProps}
                          title="Nhấn giữ chuột trái kéo để cuộn bảng"
                          className={cn(
                            'absolute -right-2 top-0 bottom-0 w-4 cursor-col-resize z-20 hover:bg-[#6B63DE]/20 transition-colors',
                            isDragging && 'bg-[#6B63DE]/20'
                          )}
                        />
                      </td>

                      {data.departments.map((dept) => {
                        const checked = Boolean(dirty[dept.id]?.[ind.id])
                        return (
                          <td
                            key={dept.id}
                            className={cn(
                              'p-1 text-center border-r border-[#E8E8F2] dark:border-[#2A2C49] min-w-[68px] w-[72px] transition',
                              checked && 'bg-[#F2F2FD]/40 dark:bg-[#202242]/40'
                            )}
                          >
                            <div className="flex items-center justify-center">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => togglePermission(dept.id, ind.id)}
                              />
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
