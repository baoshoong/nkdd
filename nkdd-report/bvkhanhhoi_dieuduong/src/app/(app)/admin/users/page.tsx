'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Building2,
  UserCheck,
  KeyRound,
  Eye,
  EyeOff,
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  Plus,
  Pencil,
  Trash2
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
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
import { formatDateShort } from '@/lib/date-utils'
import {
  createUserFormSchema,
  CreateUserFormInput,
  editUserFormSchema,
  EditUserFormInput,
  adminResetPasswordSchema,
  AdminResetPasswordInput
} from '@/lib/schemas/auth-user-schemas'

interface DepartmentItem {
  id: number
  code: string
  name: string
  isTotal: boolean
}

interface UserItem {
  id: number
  username: string
  name: string
  role: 'ADMIN' | 'BGD' | 'KHOA_USER' | string
  departmentId: number | null
  departmentCode: string | null
  departmentName: string | null
  createdAt: string
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [departments, setDepartments] = useState<DepartmentItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // State Tạo người dùng mới (React Hook Form)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    watch: watchCreate,
    formState: { errors: createErrors, isSubmitting: createLoading }
  } = useForm<CreateUserFormInput>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: {
      username: '',
      name: '',
      password: '',
      role: 'KHOA_USER',
      departmentId: ''
    }
  })
  const currentCreateRole = watchCreate('role')

  // State Chỉnh sửa người dùng (React Hook Form)
  const [editingUser, setEditingUser] = useState<UserItem | null>(null)
  const [editError, setEditError] = useState<string | null>(null)

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    watch: watchEdit,
    formState: { errors: editErrors, isSubmitting: editLoading }
  } = useForm<EditUserFormInput>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: {
      name: '',
      role: 'KHOA_USER',
      departmentId: ''
    }
  })
  const currentEditRole = watchEdit('role')

  // State Xóa người dùng
  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // State Đặt lại mật khẩu (React Hook Form)
  const [resetUser, setResetUser] = useState<UserItem | null>(null)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState<string | null>(null)

  const {
    register: registerReset,
    handleSubmit: handleSubmitReset,
    reset: resetReset,
    formState: { errors: resetErrors, isSubmitting: resetLoading }
  } = useForm<AdminResetPasswordInput>({
    resolver: zodResolver(adminResetPasswordSchema),
    defaultValues: {
      newPassword: ''
    }
  })

  // Thông báo toast thành công chung
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  // Tải danh sách khoa phòng cho dropdown
  useEffect(() => {
    fetch('/api/departments')
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          setDepartments(data.data.filter((d: DepartmentItem) => !d.isTotal))
        }
      })
      .catch(() => {})
  }, [])

  // Tải danh sách người dùng
  const fetchUsers = async (page: number, q: string = '') => {
    try {
      setLoading(true)
      setError(null)
      const query = new URLSearchParams({
        page: String(page),
        limit: '20',
        order: 'asc'
      })
      if (q.trim()) {
        query.set('q', q.trim())
      }

      const res = await fetch(`/api/admin/users?${query.toString()}`)
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || 'Không thể tải danh sách người dùng')
      }
      const json = await res.json()
      setUsers(json.data)
      setPagination(json.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi hệ thống')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers(pagination.page, searchTerm)
  }, [pagination.page])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPagination((prev) => ({ ...prev, page: 1 }))
    fetchUsers(1, searchTerm)
  }

  // Xử lý Tạo người dùng mới (React Hook Form + Zod)
  const onSubmitCreate = async (data: CreateUserFormInput) => {
    setCreateError(null)

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: data.username.trim(),
          password: data.password,
          name: data.name.trim(),
          role: data.role,
          departmentId: data.departmentId ? Number(data.departmentId) : null
        })
      })

      const resJson = await res.json()
      if (!res.ok) {
        throw new Error(resJson.error || 'Tạo người dùng thất bại')
      }

      showToast(resJson.message || 'Tạo tài khoản thành công!')
      setIsCreateOpen(false)
      resetCreate()
      fetchUsers(pagination.page, searchTerm)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Lỗi hệ thống')
    }
  }

  // Xử lý Cập nhật người dùng (React Hook Form + Zod)
  const onSubmitEdit = async (data: EditUserFormInput) => {
    if (!editingUser) return
    setEditError(null)

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUser.id,
          name: data.name.trim(),
          role: data.role,
          departmentId: data.departmentId ? Number(data.departmentId) : null
        })
      })

      const resJson = await res.json()
      if (!res.ok) {
        throw new Error(resJson.error || 'Cập nhật thất bại')
      }

      showToast(resJson.message || 'Cập nhật tài khoản thành công!')
      setEditingUser(null)
      fetchUsers(pagination.page, searchTerm)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Lỗi hệ thống')
    }
  }

  // Xử lý Xóa người dùng
  const handleDeleteUser = async () => {
    if (!deletingUser) return
    setDeleteError(null)

    try {
      setDeleteLoading(true)
      const res = await fetch(`/api/admin/users?id=${deletingUser.id}`, {
        method: 'DELETE'
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Xóa người dùng thất bại')
      }

      showToast(data.message || 'Đã xóa tài khoản thành công!')
      setDeletingUser(null)
      fetchUsers(pagination.page, searchTerm)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Lỗi hệ thống')
    } finally {
      setDeleteLoading(false)
    }
  }

  // Xử lý Admin Đặt lại mật khẩu (React Hook Form + Zod)
  const onSubmitResetPassword = async (data: AdminResetPasswordInput) => {
    if (!resetUser) return
    setResetError(null)
    setResetSuccess(null)

    try {
      const res = await fetch('/api/admin/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: resetUser.id,
          newPassword: data.newPassword
        })
      })

      const resJson = await res.json()
      if (!res.ok) {
        throw new Error(resJson.error || 'Đặt lại mật khẩu thất bại')
      }

      setResetSuccess(resJson.message || 'Đặt lại mật khẩu thành công!')
      setTimeout(() => {
        setResetUser(null)
        resetReset()
        setResetSuccess(null)
      }, 1500)
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Lỗi hệ thống')
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return (
          <Badge variant="brand" className="font-bold text-[11px]">
            Quản trị viên
          </Badge>
        )
      case 'BGD':
        return (
          <Badge variant="warning" className="font-bold text-[11px]">
            Ban Giám Đốc
          </Badge>
        )
      default:
        return (
          <Badge variant="neutral" className="font-semibold text-[11px]">
            Khoa phòng
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      {/* Toast thông báo nổi */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border-l-4 border-[#1E9E52] text-[#1F2050] px-4 py-3 rounded-[12px] shadow-[0_12px_32px_rgba(31,32,80,0.12)] flex items-center gap-2.5 text-xs font-bold transition-transform duration-250 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-[#1E9E52] shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Card */}
      <Card className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[10px] bg-[#EDECFB] dark:bg-[#202242] text-[#6B63DE] dark:text-[#8E87F5] flex items-center justify-center">
              <Users className="w-4.5 h-4.5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[#1F2050] dark:text-[#F0F1F9]">
              Quản lý Danh sách Người dùng
            </h1>
          </div>
          <p className="text-xs text-[#5A5B7C] dark:text-[#A3A6C4] font-medium mt-1">
            Thêm mới, phân quyền vai trò, chỉnh sửa và quản lý tài khoản nhân viên bệnh viện
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full lg:w-auto">
          {/* Ô tìm kiếm người dùng */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2 w-full sm:w-72"
          >
            <div className="relative flex-1">
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo tên hoặc tài khoản..."
                className="pl-9 text-xs h-9"
              />
              <Search className="w-4 h-4 text-[#8A8BA0] dark:text-[#6C6F93] absolute left-3 top-2.5 pointer-events-none" />
            </div>
            <Button type="submit" variant="secondary" size="sm" className="h-9 font-semibold">
              Tìm
            </Button>
          </form>

          {/* Nút Thêm Người Dùng */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setCreateError(null)
              resetCreate({
                username: '',
                name: '',
                password: '',
                role: 'KHOA_USER',
                departmentId: '' as any
              })
              setIsCreateOpen(true)
            }}
            className="h-9 font-bold gap-1.5 w-full sm:w-auto shrink-0 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm người dùng</span>
          </Button>
        </div>
      </Card>

      {/* Bảng danh sách người dùng */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-16">
            <div className="flex items-center gap-3 text-[#5A5B7C] dark:text-[#A3A6C4] font-semibold text-sm">
              <Loader2 className="w-5 h-5 text-[#6B63DE] dark:text-[#8E87F5] animate-spin" />
              Đang tải danh sách tài khoản...
            </div>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-[#C53030] dark:text-[#FF6B6B]">
            <p className="font-semibold text-sm">{error}</p>
            <Button
              variant="danger"
              size="sm"
              onClick={() => fetchUsers(pagination.page, searchTerm)}
              className="mt-3"
            >
              Thử lại
            </Button>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-[#8A8BA0] dark:text-[#6C6F93]">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-50 text-[#8A8BA0] dark:text-[#6C6F93]" />
            <p className="text-sm font-medium">Không tìm thấy người dùng phù hợp</p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <Table className="w-full text-xs text-left border-collapse">
              <TableHeader>
                <TableRow className="border-b border-[#E8E8F2] dark:border-[#2A2C49] bg-[#F6F7FB] dark:bg-[#1E2038] text-[#1F2050] dark:text-[#F0F1F9]">
                  <TableHead className="py-2.5 px-3 font-bold uppercase tracking-wider text-[11px] w-12 text-center">
                    #ID
                  </TableHead>
                  <TableHead className="py-2.5 px-3 font-bold uppercase tracking-wider text-[11px]">
                    Tên đăng nhập
                  </TableHead>
                  <TableHead className="py-2.5 px-3 font-bold uppercase tracking-wider text-[11px]">
                    Họ và tên
                  </TableHead>
                  <TableHead className="py-2.5 px-3 font-bold text-center uppercase tracking-wider text-[11px]">
                    Vai trò
                  </TableHead>
                  <TableHead className="py-2.5 px-3 font-bold uppercase tracking-wider text-[11px]">
                    Khoa phòng trực thuộc
                  </TableHead>
                  <TableHead className="py-2.5 px-3 font-bold uppercase tracking-wider text-[11px]">
                    Ngày tạo
                  </TableHead>
                  <TableHead className="py-2.5 px-3 font-bold text-center uppercase tracking-wider text-[11px]">
                    Thao tác
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#E8E8F2] dark:divide-[#2A2C49]">
                {users.map((u) => {
                  const dateStr = formatDateShort(u.createdAt)

                  return (
                    <TableRow
                      key={u.id}
                      className="hover:bg-[#F0F1F9] dark:hover:bg-[#242744] transition-colors duration-150"
                    >
                      <TableCell className="py-2.5 px-3 font-mono text-[#8A8BA0] dark:text-[#6C6F93] text-center tabular-nums">
                        {u.id}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 font-mono font-bold text-[#6B63DE] dark:text-[#8E87F5]">
                        {u.username}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 font-semibold text-[#1F2050] dark:text-[#F0F1F9]">
                        <span className="inline-flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-[#1E9E52] dark:text-[#34C759]" />
                          {u.name}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-center">
                        {getRoleBadge(u.role)}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 font-medium text-[#1F2050] dark:text-[#F0F1F9]">
                        {u.departmentName ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-[#6B63DE] dark:text-[#8E87F5]" />
                            <strong className="text-[#6B63DE] dark:text-[#8E87F5]">[{u.departmentCode}]</strong>{' '}
                            {u.departmentName}
                          </span>
                        ) : (
                          <span className="text-[#8A8BA0] dark:text-[#6C6F93] italic">— Toàn viện —</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 font-mono text-[#5A5B7C] dark:text-[#A3A6C4] tabular-nums">
                        {dateStr}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Nút Sửa */}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setEditingUser(u)
                              resetEdit({
                                name: u.name,
                                role: (u.role as 'ADMIN' | 'BGD' | 'KHOA_USER') || 'KHOA_USER',
                                departmentId: (u.departmentId != null ? String(u.departmentId) : '') as any
                              })
                              setEditError(null)
                            }}
                            title="Sửa thông tin"
                            className="h-7 text-xs px-2 gap-1 font-semibold text-[#5A5B7C] dark:text-[#A3A6C4] hover:text-[#6B63DE] dark:hover:text-[#8E87F5]"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Sửa</span>
                          </Button>

                          {/* Nút Đặt lại MK */}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setResetUser(u)
                              resetReset({
                                newPassword: ''
                              })
                              setResetError(null)
                              setResetSuccess(null)
                              setShowResetPassword(false)
                            }}
                            title="Đặt lại mật khẩu"
                            className="h-7 text-xs px-2 gap-1 font-semibold text-[#5A5B7C] dark:text-[#A3A6C4] hover:text-[#6B63DE] dark:hover:text-[#8E87F5]"
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>Đặt lại MK</span>
                          </Button>

                          {/* Nút Xóa */}
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setDeletingUser(u)
                              setDeleteError(null)
                            }}
                            title="Xóa tài khoản"
                            className="h-7 text-xs px-2 gap-1 font-semibold text-[#C53030] dark:text-[#FF6B6B] hover:bg-[#FDECEC] dark:hover:bg-[#3D1E24] hover:text-[#C53030] dark:hover:text-[#FF6B6B]"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Xóa</span>
                          </Button>
                        </div>
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
            (Tổng {pagination.total} tài khoản)
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page <= 1 || loading}
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
              }
              className="gap-1 font-semibold"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Trang trước</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
              }
              className="gap-1 font-semibold"
            >
              <span>Trang sau</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Modal 1: THÊM NGƯỜI DÙNG MỚI */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 transition-opacity duration-250 animate-in fade-in">
          <div className="bg-white dark:bg-[#18192E] rounded-[20px] border border-[#E8E8F2] dark:border-[#2A2C49] shadow-[0_12px_32px_rgba(31,32,80,0.12)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.5)] max-w-md w-full p-6 space-y-4 transition-all duration-250 ease-out animate-in zoom-in-95">
            <div className="flex items-start justify-between pb-3 border-b border-[#E8E8F2] dark:border-[#2A2C49]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[12px] bg-[#EDECFB] dark:bg-[#202242] text-[#6B63DE] dark:text-[#8E87F5] flex items-center justify-center shrink-0">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F2050] dark:text-[#F0F1F9]">
                    Thêm người dùng mới
                  </h3>
                  <p className="text-xs text-[#5A5B7C] dark:text-[#A3A6C4] font-medium">
                    Tạo tài khoản truy cập hệ thống báo cáo
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-[8px] text-[#8A8BA0] dark:text-[#6C6F93] hover:bg-[#F0F1F9] dark:hover:bg-[#202242] hover:text-[#1F2050] dark:hover:text-[#F0F1F9] transition cursor-pointer"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 text-xs font-semibold text-[#C53030] dark:text-[#FF6B6B] bg-[#FDECEC] dark:bg-[#3D1E24] border border-[#C53030]/20 dark:border-[#C53030]/30 rounded-[10px] flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitCreate(onSubmitCreate)} className="space-y-3.5" noValidate>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#1F2050] dark:text-[#F0F1F9]">
                  Tên đăng nhập <span className="text-[#C53030] dark:text-[#FF6B6B]">*</span>
                </label>
                <Input
                  type="text"
                  {...registerCreate('username')}
                  placeholder="Ví dụ: bs_nam, dd_lan..."
                  aria-invalid={createErrors.username ? 'true' : 'false'}
                />
                {createErrors.username && (
                  <p className="text-[11px] font-semibold text-[#C53030] dark:text-[#FF6B6B] mt-0.5">
                    {createErrors.username.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#1F2050] dark:text-[#F0F1F9]">
                  Họ và tên <span className="text-[#C53030] dark:text-[#FF6B6B]">*</span>
                </label>
                <Input
                  type="text"
                  {...registerCreate('name')}
                  placeholder="Ví dụ: Nguyễn Văn Nam"
                  aria-invalid={createErrors.name ? 'true' : 'false'}
                />
                {createErrors.name && (
                  <p className="text-[11px] font-semibold text-[#C53030] dark:text-[#FF6B6B] mt-0.5">
                    {createErrors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#1F2050] dark:text-[#F0F1F9]">
                  Mật khẩu khởi tạo <span className="text-[#C53030] dark:text-[#FF6B6B]">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    {...registerCreate('password')}
                    placeholder="Ít nhất 6 ký tự"
                    className="pr-10"
                    aria-invalid={createErrors.password ? 'true' : 'false'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 text-[#8A8BA0] dark:text-[#6C6F93] hover:text-[#1F2050] dark:hover:text-[#F0F1F9] transition cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {createErrors.password && (
                  <p className="text-[11px] font-semibold text-[#C53030] dark:text-[#FF6B6B] mt-0.5">
                    {createErrors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#1F2050] dark:text-[#F0F1F9]">
                  Vai trò hệ thống <span className="text-[#C53030] dark:text-[#FF6B6B]">*</span>
                </label>
                <select
                  {...registerCreate('role')}
                  className="w-full h-10 px-3 text-xs bg-white dark:bg-[#1E2038] border border-[#E8E8F2] dark:border-[#2A2C49] rounded-[10px] text-[#1F2050] dark:text-[#F0F1F9] focus:outline-none focus:ring-2 focus:ring-[#6B63DE]/20"
                >
                  <option value="KHOA_USER">Khoa phòng (Nhập và gửi số liệu)</option>
                  <option value="BGD">Ban Giám Đốc (Xem toàn bộ số liệu)</option>
                  <option value="ADMIN">Quản trị viên (Toàn quyền quản trị)</option>
                </select>
                {createErrors.role && (
                  <p className="text-[11px] font-semibold text-[#C53030] dark:text-[#FF6B6B] mt-0.5">
                    {createErrors.role.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#1F2050] dark:text-[#F0F1F9]">
                  {currentCreateRole === 'KHOA_USER' ? (
                    <>
                      Khoa phòng trực thuộc <span className="text-[#C53030] dark:text-[#FF6B6B]">*</span>
                    </>
                  ) : (
                    'Khoa phòng trực thuộc (Tùy chọn)'
                  )}
                </label>
                <select
                  {...registerCreate('departmentId')}
                  className="w-full h-10 px-3 text-xs bg-white dark:bg-[#1E2038] border border-[#E8E8F2] dark:border-[#2A2C49] rounded-[10px] text-[#1F2050] dark:text-[#F0F1F9] focus:outline-none focus:ring-2 focus:ring-[#6B63DE]/20"
                >
                  <option value="">-- Toàn viện / Không trực thuộc --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      [{d.code}] {d.name}
                    </option>
                  ))}
                </select>
                {createErrors.departmentId && (
                  <p className="text-[11px] font-semibold text-[#C53030] dark:text-[#FF6B6B] mt-0.5">
                    {createErrors.departmentId.message}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8E8F2] dark:border-[#2A2C49]">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={createLoading}
                  onClick={() => setIsCreateOpen(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={createLoading}
                  className="font-bold"
                >
                  Tạo tài khoản
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: SỬA THÔNG TIN NGƯỜI DÙNG */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 transition-opacity duration-250 animate-in fade-in">
          <div className="bg-white dark:bg-[#18192E] rounded-[20px] border border-[#E8E8F2] dark:border-[#2A2C49] shadow-[0_12px_32px_rgba(31,32,80,0.12)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.5)] max-w-md w-full p-6 space-y-4 transition-all duration-250 ease-out animate-in zoom-in-95">
            <div className="flex items-start justify-between pb-3 border-b border-[#E8E8F2] dark:border-[#2A2C49]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[12px] bg-[#EDECFB] dark:bg-[#202242] text-[#6B63DE] dark:text-[#8E87F5] flex items-center justify-center shrink-0">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F2050] dark:text-[#F0F1F9]">
                    Sửa thông tin người dùng
                  </h3>
                  <p className="text-xs text-[#5A5B7C] dark:text-[#A3A6C4] font-medium">
                    Tài khoản: <strong className="text-[#6B63DE] dark:text-[#8E87F5] font-semibold">{editingUser.username}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-[8px] text-[#8A8BA0] dark:text-[#6C6F93] hover:bg-[#F0F1F9] dark:hover:bg-[#202242] hover:text-[#1F2050] dark:hover:text-[#F0F1F9] transition cursor-pointer"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 text-xs font-semibold text-[#C53030] dark:text-[#FF6B6B] bg-[#FDECEC] dark:bg-[#3D1E24] border border-[#C53030]/20 dark:border-[#C53030]/30 rounded-[10px] flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitEdit(onSubmitEdit)} className="space-y-3.5" noValidate>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#1F2050] dark:text-[#F0F1F9]">
                  Họ và tên <span className="text-[#C53030] dark:text-[#FF6B6B]">*</span>
                </label>
                <Input
                  type="text"
                  {...registerEdit('name')}
                  placeholder="Nhập họ và tên đầy đủ"
                  aria-invalid={editErrors.name ? 'true' : 'false'}
                />
                {editErrors.name && (
                  <p className="text-[11px] font-semibold text-[#C53030] dark:text-[#FF6B6B] mt-0.5">
                    {editErrors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#1F2050] dark:text-[#F0F1F9]">
                  Vai trò hệ thống <span className="text-[#C53030] dark:text-[#FF6B6B]">*</span>
                </label>
                <select
                  {...registerEdit('role')}
                  className="w-full h-10 px-3 text-xs bg-white dark:bg-[#1E2038] border border-[#E8E8F2] dark:border-[#2A2C49] rounded-[10px] text-[#1F2050] dark:text-[#F0F1F9] focus:outline-none focus:ring-2 focus:ring-[#6B63DE]/20"
                >
                  <option value="KHOA_USER">Khoa phòng (Nhập và gửi số liệu)</option>
                  <option value="BGD">Ban Giám Đốc (Xem toàn bộ số liệu)</option>
                  <option value="ADMIN">Quản trị viên (Toàn quyền quản trị)</option>
                </select>
                {editErrors.role && (
                  <p className="text-[11px] font-semibold text-[#C53030] dark:text-[#FF6B6B] mt-0.5">
                    {editErrors.role.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#1F2050] dark:text-[#F0F1F9]">
                  {currentEditRole === 'KHOA_USER' ? (
                    <>
                      Khoa phòng trực thuộc <span className="text-[#C53030] dark:text-[#FF6B6B]">*</span>
                    </>
                  ) : (
                    'Khoa phòng trực thuộc (Tùy chọn)'
                  )}
                </label>
                <select
                  {...registerEdit('departmentId')}
                  className="w-full h-10 px-3 text-xs bg-white dark:bg-[#1E2038] border border-[#E8E8F2] dark:border-[#2A2C49] rounded-[10px] text-[#1F2050] dark:text-[#F0F1F9] focus:outline-none focus:ring-2 focus:ring-[#6B63DE]/20"
                >
                  <option value="">-- Toàn viện / Không trực thuộc --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      [{d.code}] {d.name}
                    </option>
                  ))}
                </select>
                {editErrors.departmentId && (
                  <p className="text-[11px] font-semibold text-[#C53030] dark:text-[#FF6B6B] mt-0.5">
                    {editErrors.departmentId.message}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8E8F2] dark:border-[#2A2C49]">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={editLoading}
                  onClick={() => setEditingUser(null)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={editLoading}
                  className="font-bold"
                >
                  Lưu thay đổi
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: XÁC NHẬN XÓA NGƯỜI DÙNG */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 transition-opacity duration-250 animate-in fade-in">
          <div className="bg-white dark:bg-[#18192E] rounded-[20px] border border-[#E8E8F2] dark:border-[#2A2C49] shadow-[0_12px_32px_rgba(31,32,80,0.12)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.5)] max-w-sm w-full p-6 space-y-4 transition-all duration-250 ease-out animate-in zoom-in-95">
            <div className="flex items-start justify-between pb-3 border-b border-[#E8E8F2] dark:border-[#2A2C49]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[12px] bg-[#FDECEC] dark:bg-[#3D1E24] text-[#C53030] dark:text-[#FF6B6B] flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F2050] dark:text-[#F0F1F9]">
                    Xác nhận xóa tài khoản
                  </h3>
                  <p className="text-xs text-[#5A5B7C] dark:text-[#A3A6C4] font-medium">
                    Hành động này không thể hoàn tác
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeletingUser(null)}
                className="p-1 rounded-[8px] text-[#8A8BA0] dark:text-[#6C6F93] hover:bg-[#F0F1F9] dark:hover:bg-[#202242] hover:text-[#1F2050] dark:hover:text-[#F0F1F9] transition cursor-pointer"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {deleteError && (
              <div className="p-3 text-xs font-semibold text-[#C53030] dark:text-[#FF6B6B] bg-[#FDECEC] dark:bg-[#3D1E24] border border-[#C53030]/20 dark:border-[#C53030]/30 rounded-[10px] flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <p className="text-xs text-[#5A5B7C] dark:text-[#A3A6C4]">
              Bạn có chắc chắn muốn xóa tài khoản{' '}
              <strong className="text-[#C53030] dark:text-[#FF6B6B] font-bold">
                &ldquo;{deletingUser.username}&rdquo;
              </strong>{' '}
              ({deletingUser.name}) khỏi hệ thống?
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8E8F2] dark:border-[#2A2C49]">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={deleteLoading}
                onClick={() => setDeletingUser(null)}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                loading={deleteLoading}
                onClick={handleDeleteUser}
                className="font-bold"
              >
                Xóa vĩnh viễn
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: ĐẶT LẠI MẬT KHẨU CHO ADMIN */}
      {resetUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 transition-opacity duration-250 animate-in fade-in">
          <div className="bg-white dark:bg-[#18192E] rounded-[20px] border border-[#E8E8F2] dark:border-[#2A2C49] shadow-[0_12px_32px_rgba(31,32,80,0.12)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.5)] max-w-md w-full p-6 space-y-4 transition-all duration-250 ease-out animate-in zoom-in-95">
            <div className="flex items-start justify-between pb-3 border-b border-[#E8E8F2] dark:border-[#2A2C49]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[12px] bg-[#EDECFB] dark:bg-[#202242] text-[#6B63DE] dark:text-[#8E87F5] flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F2050] dark:text-[#F0F1F9]">
                    Đặt lại mật khẩu
                  </h3>
                  <p className="text-xs text-[#5A5B7C] dark:text-[#A3A6C4] font-medium">
                    Tài khoản: <strong className="text-[#6B63DE] dark:text-[#8E87F5] font-semibold">{resetUser.username}</strong> ({resetUser.name})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setResetUser(null)}
                className="p-1 rounded-[8px] text-[#8A8BA0] dark:text-[#6C6F93] hover:bg-[#F0F1F9] dark:hover:bg-[#202242] hover:text-[#1F2050] dark:hover:text-[#F0F1F9] transition cursor-pointer"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetError && (
              <div className="p-3 text-xs font-semibold text-[#C53030] dark:text-[#FF6B6B] bg-[#FDECEC] dark:bg-[#3D1E24] border border-[#C53030]/20 dark:border-[#C53030]/30 rounded-[10px] flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            {resetSuccess && (
              <div className="p-3 text-xs font-semibold text-[#1E9E52] dark:text-[#34C759] bg-[#E6F9EE] dark:bg-[#152B1E] border border-[#1E9E52]/20 dark:border-[#1E9E52]/30 rounded-[10px] flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 shrink-0" />
                <span>{resetSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmitReset(onSubmitResetPassword)} className="space-y-3.5" noValidate>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#1F2050] dark:text-[#F0F1F9]">
                  Mật khẩu mới cho người dùng <span className="text-[#C53030] dark:text-[#FF6B6B]">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showResetPassword ? 'text' : 'password'}
                    {...registerReset('newPassword')}
                    placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                    className="pr-10"
                    aria-invalid={resetErrors.newPassword ? 'true' : 'false'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-3 text-[#8A8BA0] dark:text-[#6C6F93] hover:text-[#1F2050] dark:hover:text-[#F0F1F9] transition cursor-pointer"
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {resetErrors.newPassword && (
                  <p className="text-[11px] font-semibold text-[#C53030] dark:text-[#FF6B6B] mt-0.5">
                    {resetErrors.newPassword.message}
                  </p>
                )}
                <p className="text-[11px] text-[#8A8BA0] dark:text-[#6C6F93]">
                  Người dùng có thể đăng nhập ngay với mật khẩu mới này.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E8E8F2] dark:border-[#2A2C49]">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={resetLoading}
                  onClick={() => setResetUser(null)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={resetLoading}
                  className="font-bold"
                >
                  Xác nhận đặt lại
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
