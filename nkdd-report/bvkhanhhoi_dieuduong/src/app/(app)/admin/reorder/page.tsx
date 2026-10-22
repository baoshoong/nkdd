'use client'

import { useEffect, useState, useCallback, Fragment } from 'react'
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  X,
  Eye,
  EyeOff
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { cn } from '@/lib/utils'

// ============================
// Types
// ============================

type ModelType = 'indicator' | 'department' | 'indicatorGroup'

interface TabConfig {
  key: ModelType
  label: string
}

interface IndicatorItem {
  id: number
  code: string
  name: string
  sortOrder: number
  isActive: boolean
  groupId: number
  group: {
    id: number
    name: string
    sortOrder: number
  }
}

interface DepartmentItem {
  id: number
  code: string
  name: string
  sortOrder: number
  isTotal: boolean
  isActive?: boolean
}

interface GroupItem {
  id: number
  name: string
  sortOrder: number
  _count: { indicators: number }
}

interface IndicatorGrouped {
  groupId: number
  groupName: string
  groupSortOrder: number
  items: IndicatorItem[]
}

// Form data types
interface IndicatorForm {
  code: string
  name: string
  groupId: number | ''
}

interface DepartmentForm {
  code: string
  name: string
  isTotal: boolean
}

interface GroupForm {
  name: string
}

// ============================
// Constants
// ============================

const TABS: TabConfig[] = [
  { key: 'indicator', label: 'Chỉ số' },
  { key: 'department', label: 'Khoa phòng' },
  { key: 'indicatorGroup', label: 'Nhóm chỉ số' }
]

// ============================
// Reusable Modal Shell
// ============================

function ModalShell({
  open,
  onClose,
  title,
  children
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-[#1F2050]/50 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-[#18192E] rounded-[20px] border border-[#E8E8F2] dark:border-[#2A2C49] shadow-[0_16px_40px_rgba(31,32,80,0.16)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.45)] max-w-md w-full p-6 space-y-5 animate-in zoom-in-95">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#1F2050] dark:text-[#F0F1F9]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-[8px] text-[#8A8BA0] hover:bg-[#F0F1F9] dark:hover:bg-[#242744] hover:text-[#1F2050] dark:hover:text-[#F0F1F9] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ============================
// Input component (inline)
// ============================

function Field({
  label,
  error,
  children
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-[#5A5B7C] dark:text-[#A3A6C4]">{label}</label>
      {children}
      {error && <p className="text-[11px] text-[#E11D48] font-medium">{error}</p>}
    </div>
  )
}

const inputClass =
  'w-full h-9 px-3 rounded-[8px] border border-[#E8E8F2] dark:border-[#2A2C49] bg-white dark:bg-[#1E2038] text-sm text-[#1F2050] dark:text-[#F0F1F9] placeholder:text-[#8A8BA0] dark:placeholder:text-[#6C6F93] focus:outline-none focus:ring-2 focus:ring-[#6B63DE]/30 focus:border-[#6B63DE] transition'

const selectClass =
  'w-full h-9 px-3 rounded-[8px] border border-[#E8E8F2] dark:border-[#2A2C49] bg-white dark:bg-[#1E2038] text-sm text-[#1F2050] dark:text-[#F0F1F9] focus:outline-none focus:ring-2 focus:ring-[#6B63DE]/30 focus:border-[#6B63DE] transition appearance-none cursor-pointer'

// ============================
// Main Component
// ============================

export default function AdminReorderPage() {
  const [activeTab, setActiveTab] = useState<ModelType>('indicator')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Data state
  const [indicators, setIndicators] = useState<IndicatorItem[]>([])
  const [departments, setDepartments] = useState<DepartmentItem[]>([])
  const [groups, setGroups] = useState<GroupItem[]>([])

  // Dirty tracking (for reorder)
  const [isDirty, setIsDirty] = useState(false)

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [dragGroupId, setDragGroupId] = useState<number | null>(null)

  // CRUD modal states
  const [createOpen, setCreateOpen] = useState(false)
  const [editItem, setEditItem] = useState<{ model: ModelType; data: Record<string, unknown> } | null>(null)
  const [deleteItem, setDeleteItem] = useState<{ model: ModelType; id: number; name: string } | null>(null)
  const [modalSaving, setModalSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  // Form states
  const [indForm, setIndForm] = useState<IndicatorForm>({ code: '', name: '', groupId: '' })
  const [deptForm, setDeptForm] = useState<DepartmentForm>({ code: '', name: '', isTotal: false })
  const [grpForm, setGrpForm] = useState<GroupForm>({ name: '' })

  // ============================
  // Toast helper
  // ============================

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // ============================
  // Data fetching
  // ============================

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [indRes, deptRes, grpRes] = await Promise.all([
        fetch('/api/admin/indicators'),
        fetch('/api/departments'),
        fetch('/api/admin/indicator-groups')
      ])
      if (!indRes.ok || !deptRes.ok || !grpRes.ok) throw new Error('Không thể tải dữ liệu')
      const [indJson, deptJson, grpJson] = await Promise.all([indRes.json(), deptRes.json(), grpRes.json()])
      setIndicators(indJson.data || [])
      setDepartments(deptJson.data || [])
      setGroups(grpJson.data || [])
      setIsDirty(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi hệ thống')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ============================
  // Grouped indicators
  // ============================

  const groupedIndicators: IndicatorGrouped[] = (() => {
    const map = new Map<number, IndicatorGrouped>()
    for (const ind of indicators) {
      if (!map.has(ind.groupId)) {
        map.set(ind.groupId, {
          groupId: ind.groupId,
          groupName: ind.group.name,
          groupSortOrder: ind.group.sortOrder,
          items: []
        })
      }
      map.get(ind.groupId)!.items.push(ind)
    }
    return Array.from(map.values()).sort((a, b) => a.groupSortOrder - b.groupSortOrder)
  })()

  // ============================
  // Move / Reorder
  // ============================

  const moveItem = <T extends { id: number }>(list: T[], from: number, to: number): T[] => {
    if (from === to) return list
    const a = [...list]
    const [item] = a.splice(from, 1)
    a.splice(to, 0, item)
    return a
  }

  const moveIndicatorInGroup = (groupId: number, from: number, to: number) => {
    setIndicators(prev => {
      const gi = prev.filter(i => i.groupId === groupId)
      const others = prev.filter(i => i.groupId !== groupId)
      const moved = moveItem(gi, from, to)
      const result: IndicatorItem[] = []
      const order = [...new Set(prev.map(i => i.groupId))]
      for (const gid of order) {
        result.push(...(gid === groupId ? moved : others.filter(i => i.groupId === gid)))
      }
      return result
    })
    setIsDirty(true)
  }

  const moveDepartment = (from: number, to: number) => {
    setDepartments(prev => moveItem(prev, from, to))
    setIsDirty(true)
  }

  const moveGroup = (from: number, to: number) => {
    setGroups(prev => moveItem(prev, from, to))
    setIsDirty(true)
  }

  // ============================
  // Save reorder
  // ============================

  const handleSaveOrder = async () => {
    setSaving(true)
    setError(null)
    try {
      const reqs: Promise<Response>[] = []
      if (activeTab === 'indicator') {
        for (const g of groupedIndicators) {
          reqs.push(fetch('/api/admin/reorder', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'indicator', orderedIds: g.items.map(i => i.id) })
          }))
        }
      } else if (activeTab === 'department') {
        reqs.push(fetch('/api/admin/reorder', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'department', orderedIds: departments.map(d => d.id) })
        }))
      } else {
        reqs.push(fetch('/api/admin/reorder', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'indicatorGroup', orderedIds: groups.map(g => g.id) })
        }))
      }
      const responses = await Promise.all(reqs)
      const failed = responses.find(r => !r.ok)
      if (failed) {
        const ej = await failed.json().catch(() => ({}))
        throw new Error(ej.error || 'Lỗi khi lưu thứ tự')
      }
      setIsDirty(false)
      showToast('Đã lưu thứ tự thành công!')
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi lưu')
    } finally {
      setSaving(false)
    }
  }

  // ============================
  // Drag & Drop
  // ============================

  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, index: number, groupId?: number) => {
    setDragIndex(index)
    setDragGroupId(groupId ?? null)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
    const t = e.currentTarget
    setTimeout(() => { t.style.opacity = '0.4' }, 0)
  }

  const handleDragEnd = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.currentTarget.style.opacity = '1'
    setDragIndex(null)
    setDragOverIndex(null)
    setDragGroupId(null)
  }

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, toIdx: number, groupId?: number) => {
    e.preventDefault()
    setDragOverIndex(null)
    if (dragIndex === null) return
    if (activeTab === 'indicator') {
      if (groupId !== dragGroupId) return
      if (groupId != null) moveIndicatorInGroup(groupId, dragIndex, toIdx)
    } else if (activeTab === 'department') {
      moveDepartment(dragIndex, toIdx)
    } else {
      moveGroup(dragIndex, toIdx)
    }
    setDragIndex(null)
    setDragGroupId(null)
  }

  // ============================
  // CRUD: Create
  // ============================

  const openCreate = () => {
    setModalError(null)
    setIndForm({ code: '', name: '', groupId: groups[0]?.id ?? '' })
    setDeptForm({ code: '', name: '', isTotal: false })
    setGrpForm({ name: '' })
    setCreateOpen(true)
  }

  const handleCreate = async () => {
    setModalError(null)
    setModalSaving(true)
    try {
      let url = ''
      let body: Record<string, unknown> = {}

      if (activeTab === 'indicator') {
        if (!indForm.code.trim() || !indForm.name.trim() || !indForm.groupId) {
          setModalError('Vui lòng nhập đầy đủ mã, tên và chọn nhóm')
          setModalSaving(false)
          return
        }
        url = '/api/admin/indicators'
        body = { code: indForm.code.trim(), name: indForm.name.trim(), groupId: Number(indForm.groupId) }
      } else if (activeTab === 'department') {
        if (!deptForm.code.trim() || !deptForm.name.trim()) {
          setModalError('Vui lòng nhập đầy đủ mã và tên')
          setModalSaving(false)
          return
        }
        url = '/api/admin/departments'
        body = { code: deptForm.code.trim(), name: deptForm.name.trim(), isTotal: deptForm.isTotal }
      } else {
        if (!grpForm.name.trim()) {
          setModalError('Vui lòng nhập tên nhóm')
          setModalSaving(false)
          return
        }
        url = '/api/admin/indicator-groups'
        body = { name: grpForm.name.trim() }
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const ej = await res.json().catch(() => ({}))
        throw new Error(ej.error || 'Lỗi khi tạo')
      }

      setCreateOpen(false)
      showToast('Đã tạo thành công!')
      await fetchData()
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Lỗi khi tạo')
    } finally {
      setModalSaving(false)
    }
  }

  // ============================
  // CRUD: Edit
  // ============================

  const openEdit = (model: ModelType, data: Record<string, unknown>) => {
    setModalError(null)
    setEditItem({ model, data })
    if (model === 'indicator') {
      setIndForm({ code: String(data.code || ''), name: String(data.name || ''), groupId: Number(data.groupId) || '' })
    } else if (model === 'department') {
      setDeptForm({ code: String(data.code || ''), name: String(data.name || ''), isTotal: Boolean(data.isTotal) })
    } else {
      setGrpForm({ name: String(data.name || '') })
    }
  }

  const handleEdit = async () => {
    if (!editItem) return
    setModalError(null)
    setModalSaving(true)
    try {
      const id = editItem.data.id
      let url = ''
      let body: Record<string, unknown> = {}

      if (editItem.model === 'indicator') {
        if (!indForm.code.trim() || !indForm.name.trim() || !indForm.groupId) {
          setModalError('Vui lòng nhập đầy đủ mã, tên và chọn nhóm')
          setModalSaving(false)
          return
        }
        url = `/api/admin/indicators/${id}`
        body = { code: indForm.code.trim(), name: indForm.name.trim(), groupId: Number(indForm.groupId) }
      } else if (editItem.model === 'department') {
        if (!deptForm.code.trim() || !deptForm.name.trim()) {
          setModalError('Vui lòng nhập đầy đủ mã và tên')
          setModalSaving(false)
          return
        }
        url = `/api/admin/departments/${id}`
        body = { code: deptForm.code.trim(), name: deptForm.name.trim(), isTotal: deptForm.isTotal }
      } else {
        if (!grpForm.name.trim()) {
          setModalError('Vui lòng nhập tên nhóm')
          setModalSaving(false)
          return
        }
        url = `/api/admin/indicator-groups/${id}`
        body = { name: grpForm.name.trim() }
      }

      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const ej = await res.json().catch(() => ({}))
        throw new Error(ej.error || 'Lỗi khi cập nhật')
      }

      setEditItem(null)
      showToast('Đã cập nhật thành công!')
      await fetchData()
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Lỗi khi cập nhật')
    } finally {
      setModalSaving(false)
    }
  }

  // ============================
  // CRUD: Delete
  // ============================

  const handleDelete = async () => {
    if (!deleteItem) return
    setModalSaving(true)
    setModalError(null)
    try {
      const urlMap: Record<ModelType, string> = {
        indicator: `/api/admin/indicators/${deleteItem.id}`,
        department: `/api/admin/departments/${deleteItem.id}`,
        indicatorGroup: `/api/admin/indicator-groups/${deleteItem.id}`
      }
      const res = await fetch(urlMap[deleteItem.model], { method: 'DELETE' })
      if (!res.ok) {
        const ej = await res.json().catch(() => ({}))
        throw new Error(ej.error || 'Lỗi khi xóa')
      }
      setDeleteItem(null)
      showToast(`Đã xóa "${deleteItem.name}" thành công!`)
      await fetchData()
    } catch (err) {
      // Show error as toast (don't close dialog so user can see)
      setModalError(err instanceof Error ? err.message : 'Lỗi khi xóa')
    } finally {
      setModalSaving(false)
    }
  }

  // ============================
  // Toggle isActive
  // ============================

  const toggleActive = async (model: 'indicator' | 'department', id: number, currentActive: boolean) => {
    try {
      const url = model === 'indicator' ? `/api/admin/indicators/${id}` : `/api/admin/departments/${id}`
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive })
      })
      if (!res.ok) {
        const ej = await res.json().catch(() => ({}))
        throw new Error(ej.error || 'Lỗi')
      }
      showToast(!currentActive ? 'Đã kích hoạt' : 'Đã ẩn')
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi')
    }
  }

  // ============================
  // Render row
  // ============================

  const renderRow = (
    item: { id: number; name: string; code?: string; extra?: string; isActive?: boolean },
    index: number,
    total: number,
    model: ModelType,
    groupId?: number
  ) => {
    const isBeingDragged = dragIndex === index && dragGroupId === (groupId ?? null)
    const isDragTarget = dragOverIndex === index && dragGroupId === (groupId ?? null)

    return (
      <tr
        key={item.id}
        draggable
        onDragStart={(e) => handleDragStart(e, index, groupId)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOver(e, index)}
        onDragLeave={() => setDragOverIndex(null)}
        onDrop={(e) => handleDrop(e, index, groupId)}
        className={cn(
          'border-b border-[#E8E8F2] dark:border-[#2A2C49] transition-all duration-100 cursor-grab active:cursor-grabbing group/row',
          isBeingDragged && 'opacity-40',
          isDragTarget && 'bg-[#EDECFB] dark:bg-[#2A2C60] border-t-2 border-t-[#6B63DE]',
          !isBeingDragged && !isDragTarget && 'hover:bg-[#F6F7FB] dark:hover:bg-[#242744]'
        )}
      >
        {/* Grip */}
        <td className="w-8 px-1.5 py-2 text-center">
          <GripVertical className="w-3.5 h-3.5 text-[#C8C9DA] dark:text-[#3E4268] mx-auto group-hover/row:text-[#8A8BA0] dark:group-hover/row:text-[#6C6F93] transition-colors" />
        </td>

        {/* Index */}
        <td className="w-9 px-1 py-2 text-center text-[11px] font-bold text-[#8A8BA0] dark:text-[#6C6F93] tabular-nums">
          {index + 1}
        </td>

        {/* Name + code */}
        <td className="px-3 py-2">
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-sm font-medium',
              item.isActive === false
                ? 'text-[#8A8BA0] dark:text-[#6C6F93] line-through'
                : 'text-[#1F2050] dark:text-[#F0F1F9]'
            )}>
              {item.name}
            </span>
            {item.code && (
              <span className="text-[10px] text-[#8A8BA0] dark:text-[#6C6F93] font-mono bg-[#F6F7FB] dark:bg-[#242744] px-1.5 py-0.5 rounded">
                {item.code}
              </span>
            )}
            {item.extra && !item.code && (
              <span className="text-[10px] text-[#8A8BA0] dark:text-[#6C6F93]">{item.extra}</span>
            )}
            {item.isActive === false && (
              <span className="text-[9px] font-bold text-[#F59E0B] bg-[#FFFBEB] dark:bg-[#3B2C19] dark:text-[#FCD34D] px-1.5 py-0.5 rounded-full border border-[#F59E0B]/20">
                Ẩn
              </span>
            )}
          </div>
        </td>

        {/* Actions */}
        <td className="w-36 px-2 py-2 text-right">
          <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
            {/* Toggle active (for indicator & department) */}
            {(model === 'indicator' || model === 'department') && item.isActive !== undefined && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleActive(model as 'indicator' | 'department', item.id, item.isActive!) }}
                className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[#5A5B7C] dark:text-[#A3A6C4] hover:bg-[#EDECFB] dark:hover:bg-[#2A2C60] hover:text-[#6B63DE] cursor-pointer transition-colors"
                title={item.isActive ? 'Ẩn' : 'Kích hoạt'}
              >
                {item.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Edit */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (model === 'indicator') {
                  const ind = indicators.find(i => i.id === item.id)!
                  openEdit('indicator', { id: ind.id, code: ind.code, name: ind.name, groupId: ind.groupId })
                } else if (model === 'department') {
                  const dept = departments.find(d => d.id === item.id)!
                  openEdit('department', { id: dept.id, code: dept.code, name: dept.name, isTotal: dept.isTotal })
                } else {
                  const grp = groups.find(g => g.id === item.id)!
                  openEdit('indicatorGroup', { id: grp.id, name: grp.name })
                }
              }}
              className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[#5A5B7C] dark:text-[#A3A6C4] hover:bg-[#EDECFB] dark:hover:bg-[#2A2C60] hover:text-[#6B63DE] cursor-pointer transition-colors"
              title="Sửa"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setModalError(null)
                setDeleteItem({ model, id: item.id, name: item.name })
              }}
              className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[#5A5B7C] dark:text-[#A3A6C4] hover:bg-[#FDECEC] dark:hover:bg-[#3D1E24] hover:text-[#E11D48] cursor-pointer transition-colors"
              title="Xóa"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Separator */}
            <div className="w-px h-4 bg-[#E8E8F2] dark:bg-[#2A2C49] mx-0.5" />

            {/* Move up */}
            <button
              type="button"
              disabled={index === 0}
              onClick={(e) => {
                e.stopPropagation()
                if (activeTab === 'indicator' && groupId != null) moveIndicatorInGroup(groupId, index, index - 1)
                else if (activeTab === 'department') moveDepartment(index, index - 1)
                else moveGroup(index, index - 1)
              }}
              className={cn(
                'w-7 h-7 rounded-[6px] flex items-center justify-center transition-colors',
                index === 0
                  ? 'text-[#C8C9DA] dark:text-[#3E4268] cursor-not-allowed'
                  : 'text-[#5A5B7C] dark:text-[#A3A6C4] hover:bg-[#EDECFB] dark:hover:bg-[#2A2C60] hover:text-[#6B63DE] cursor-pointer'
              )}
              title="Di chuyển lên"
            >
              <ChevronUp className="w-4 h-4" />
            </button>

            {/* Move down */}
            <button
              type="button"
              disabled={index === total - 1}
              onClick={(e) => {
                e.stopPropagation()
                if (activeTab === 'indicator' && groupId != null) moveIndicatorInGroup(groupId, index, index + 1)
                else if (activeTab === 'department') moveDepartment(index, index + 1)
                else moveGroup(index, index + 1)
              }}
              className={cn(
                'w-7 h-7 rounded-[6px] flex items-center justify-center transition-colors',
                index === total - 1
                  ? 'text-[#C8C9DA] dark:text-[#3E4268] cursor-not-allowed'
                  : 'text-[#5A5B7C] dark:text-[#A3A6C4] hover:bg-[#EDECFB] dark:hover:bg-[#2A2C60] hover:text-[#6B63DE] cursor-pointer'
              )}
              title="Di chuyển xuống"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  // ============================
  // Create/Edit Form Content
  // ============================

  const renderFormContent = (isEdit: boolean) => {
    const currentModel = isEdit ? editItem!.model : activeTab

    return (
      <>
        {currentModel === 'indicator' && (
          <div className="space-y-3">
            <Field label="Mã chỉ số">
              <input
                className={inputClass}
                placeholder="VD: HL_TANG_CUONG"
                value={indForm.code}
                onChange={e => setIndForm(p => ({ ...p, code: e.target.value }))}
                autoFocus
              />
            </Field>
            <Field label="Tên chỉ số">
              <input
                className={inputClass}
                placeholder="VD: HL tăng cường"
                value={indForm.name}
                onChange={e => setIndForm(p => ({ ...p, name: e.target.value }))}
              />
            </Field>
            <Field label="Nhóm chỉ số">
              <select
                className={selectClass}
                value={indForm.groupId}
                onChange={e => setIndForm(p => ({ ...p, groupId: e.target.value ? Number(e.target.value) : '' }))}
              >
                <option value="">-- Chọn nhóm --</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </Field>
          </div>
        )}

        {currentModel === 'department' && (
          <div className="space-y-3">
            <Field label="Mã khoa">
              <input
                className={inputClass}
                placeholder="VD: HSCC"
                value={deptForm.code}
                onChange={e => setDeptForm(p => ({ ...p, code: e.target.value }))}
                autoFocus
              />
            </Field>
            <Field label="Tên khoa phòng">
              <input
                className={inputClass}
                placeholder="VD: Hồi sức cấp cứu"
                value={deptForm.name}
                onChange={e => setDeptForm(p => ({ ...p, name: e.target.value }))}
              />
            </Field>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={deptForm.isTotal}
                onChange={e => setDeptForm(p => ({ ...p, isTotal: e.target.checked }))}
                className="w-4 h-4 rounded border-[#E8E8F2] text-[#6B63DE] focus:ring-[#6B63DE]/30"
              />
              <span className="text-xs font-medium text-[#5A5B7C] dark:text-[#A3A6C4]">Dòng tổng hợp</span>
            </label>
          </div>
        )}

        {currentModel === 'indicatorGroup' && (
          <div className="space-y-3">
            <Field label="Tên nhóm">
              <input
                className={inputClass}
                placeholder="VD: Nhân lực Điều dưỡng"
                value={grpForm.name}
                onChange={e => setGrpForm(p => ({ ...p, name: e.target.value }))}
                autoFocus
              />
            </Field>
          </div>
        )}

        {/* Error */}
        {modalError && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#E11D48] bg-[#FDECEC] dark:bg-[#3D1E24] px-3 py-2 rounded-[8px]">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{modalError}</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-[#E8E8F2] dark:border-[#2A2C49]">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => { setCreateOpen(false); setEditItem(null) }}
            disabled={modalSaving}
          >
            Hủy
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={isEdit ? handleEdit : handleCreate}
            disabled={modalSaving}
            className="font-bold gap-1.5"
          >
            {modalSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isEdit ? 'Cập nhật' : 'Tạo mới'}
          </Button>
        </div>
      </>
    )
  }

  // ============================
  // Tab label map for display
  // ============================
  const tabLabel: Record<ModelType, string> = {
    indicator: 'chỉ số',
    department: 'khoa phòng',
    indicatorGroup: 'nhóm chỉ số'
  }

  // ============================
  // Render
  // ============================

  return (
    <div className="space-y-4 max-w-[960px] mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-white dark:bg-[#1E2038] border-l-4 border-[#1E9E52] text-[#1F2050] dark:text-[#F0F1F9] px-4 py-3 rounded-[12px] shadow-[0_12px_32px_rgba(31,32,80,0.12)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.4)] flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#1E9E52] shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Tab bar + Actions (compact, no header card) */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Tabs */}
        <div className="flex gap-1 bg-[#F6F7FB] dark:bg-[#1E2038] p-1 rounded-[10px] border border-[#E8E8F2] dark:border-[#2A2C49] flex-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key)
                setDragIndex(null)
                setDragOverIndex(null)
                setDragGroupId(null)
              }}
              className={cn(
                'flex-1 h-8 px-3 rounded-[7px] text-xs font-bold transition-all duration-150 cursor-pointer select-none',
                activeTab === tab.key
                  ? 'bg-white dark:bg-[#242744] text-[#6B63DE] dark:text-[#8E87F5] shadow-sm'
                  : 'text-[#5A5B7C] dark:text-[#A3A6C4] hover:text-[#1F2050] dark:hover:text-[#F0F1F9]'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {error && (
            <span className="text-[11px] font-semibold text-[#C53030] dark:text-[#FF6B6B] bg-[#FDECEC] dark:bg-[#3D1E24] px-2.5 py-1 rounded-full border border-[#C53030]/20 flex items-center gap-1 max-w-[200px] truncate">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span className="truncate">{error}</span>
            </span>
          )}

          <Button type="button" variant="primary" size="sm" onClick={openCreate} className="font-bold gap-1">
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Thêm</span>
          </Button>

          {isDirty && (
            <Button type="button" variant="success" size="sm" onClick={handleSaveOrder} disabled={saving} className="font-bold gap-1">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Lưu thứ tự</span>
            </Button>
          )}

          <Button type="button" variant="secondary" size="sm" onClick={fetchData} title="Tải lại" className="gap-1">
            <RefreshCw className="w-3.5 h-3.5 text-[#5A5B7C] dark:text-[#A3A6C4]" />
          </Button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center p-16 bg-white dark:bg-[#18192E] rounded-[20px] border border-[#E8E8F2] dark:border-[#2A2C49]">
          <div className="flex items-center gap-3 text-[#5A5B7C] dark:text-[#A3A6C4] font-semibold text-sm">
            <Loader2 className="w-5 h-5 text-[#6B63DE] animate-spin" />
            Đang tải...
          </div>
        </div>
      )}

      {/* Error (no data) */}
      {error && !loading && indicators.length === 0 && departments.length === 0 && groups.length === 0 && (
        <div className="p-6 bg-[#FDECEC] dark:bg-[#3D1E24] border border-[#C53030]/20 rounded-[20px] text-[#C53030] dark:text-[#FF6B6B] flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
          <Button variant="danger" size="sm" onClick={fetchData}>Thử lại</Button>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="bg-white dark:bg-[#18192E] rounded-[16px] border border-[#E8E8F2] dark:border-[#2A2C49] shadow-[0_4px_20px_rgba(100,100,180,0.06)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden">
          <div className="max-h-[calc(100vh-200px)] min-h-[300px] overflow-auto scrollbar-thin">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="sticky top-0 bg-[#F6F7FB] dark:bg-[#1E2038] z-10">
                <tr className="border-b border-[#E8E8F2] dark:border-[#2A2C49]">
                  <th className="w-8 px-1.5 py-2" />
                  <th className="w-9 px-1 py-2 text-center text-[10px] font-bold text-[#8A8BA0] dark:text-[#6C6F93] uppercase">STT</th>
                  <th className="px-3 py-2 text-[10px] font-bold text-[#8A8BA0] dark:text-[#6C6F93] uppercase tracking-wider">
                    {activeTab === 'indicator' ? 'Chỉ số' : activeTab === 'department' ? 'Khoa phòng' : 'Nhóm chỉ số'}
                  </th>
                  <th className="w-36 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {activeTab === 'indicator' && groupedIndicators.map(g => (
                  <Fragment key={`grp-${g.groupId}`}>
                    <tr className="bg-[#F6F7FB] dark:bg-[#202242] border-y border-[#E8E8F2] dark:border-[#2A2C49]">
                      <td colSpan={4} className="px-3 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-[#6B63DE] dark:text-[#8E87F5]" />
                          <span className="font-bold text-[#6B63DE] dark:text-[#8E87F5] uppercase tracking-wider text-[10px]">
                            {g.groupName}
                          </span>
                          <span className="text-[9px] text-[#8A8BA0] dark:text-[#6C6F93]">({g.items.length})</span>
                        </div>
                      </td>
                    </tr>
                    {g.items.map((ind, idx) =>
                      renderRow(
                        { id: ind.id, name: ind.name, code: ind.code, isActive: ind.isActive },
                        idx, g.items.length, 'indicator', g.groupId
                      )
                    )}
                  </Fragment>
                ))}

                {activeTab === 'department' && departments.map((dept, idx) =>
                  renderRow(
                    { id: dept.id, name: dept.name, code: dept.code, extra: dept.isTotal ? '(Tổng)' : undefined, isActive: dept.isActive },
                    idx, departments.length, 'department'
                  )
                )}

                {activeTab === 'indicatorGroup' && groups.map((grp, idx) =>
                  renderRow(
                    { id: grp.id, name: grp.name, extra: `${grp._count.indicators} chỉ số` },
                    idx, groups.length, 'indicatorGroup'
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* Dirty footer */}
          {isDirty && (
            <div className="px-4 py-2.5 bg-[#FFFBEB] dark:bg-[#2A2518] border-t border-[#F59E0B]/20 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#92400E] dark:text-[#FCD34D] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
                Có thay đổi chưa lưu
              </span>
              <Button type="button" variant="primary" size="sm" onClick={handleSaveOrder} disabled={saving} className="font-bold gap-1">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Lưu thứ tự
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ===== MODALS ===== */}

      {/* Create Modal */}
      <ModalShell
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={`Thêm ${tabLabel[activeTab]} mới`}
      >
        {renderFormContent(false)}
      </ModalShell>

      {/* Edit Modal */}
      <ModalShell
        open={!!editItem}
        onClose={() => setEditItem(null)}
        title={`Sửa ${editItem ? tabLabel[editItem.model] : ''}`}
      >
        {editItem && renderFormContent(true)}
      </ModalShell>

      {/* Delete Confirm */}
      {deleteItem && (
        <>
          <ConfirmDialog
            isOpen={!!deleteItem}
            onClose={() => { setDeleteItem(null); setModalError(null) }}
            onConfirm={handleDelete}
            title={`Xóa ${tabLabel[deleteItem.model]}`}
            description={modalError || `Bạn có chắc muốn xóa "${deleteItem.name}"? Hành động này không thể hoàn tác.`}
            confirmText="Xóa"
            cancelText="Hủy"
            variant="danger"
            loading={modalSaving}
          />
        </>
      )}
    </div>
  )
}
