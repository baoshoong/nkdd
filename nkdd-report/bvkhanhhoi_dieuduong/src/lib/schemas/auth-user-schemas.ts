import { z } from 'zod'

/**
 * Schema xác thực cho Form Đăng nhập
 */
export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Vui lòng nhập tên đăng nhập'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu')
})

export type LoginInput = z.infer<typeof loginSchema>

/**
 * Schema xác thực cho Form Đổi mật khẩu cá nhân
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận lại mật khẩu mới')
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword']
  })

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

/**
 * Schema xác thực cho Form Thêm người dùng mới (Client UI - React Hook Form)
 */
export const createUserFormSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự')
      .max(50, 'Tên đăng nhập tối đa 50 ký tự')
      .regex(/^[a-zA-Z0-9_]+$/, 'Tên đăng nhập chỉ chứa chữ cái, số và dấu gạch dưới'),
    name: z.string().trim().min(1, 'Họ và tên không được để trống').max(100, 'Họ và tên tối đa 100 ký tự'),
    password: z.string().min(6, 'Mật khẩu khởi tạo phải có ít nhất 6 ký tự'),
    role: z.enum(['ADMIN', 'BGD', 'KHOA_USER']),
    departmentId: z.string().optional()
  })
  .refine(
    (data) => {
      if (data.role === 'KHOA_USER') {
        return !!data.departmentId && data.departmentId !== ''
      }
      return true
    },
    {
      message: 'Vui lòng chọn khoa phòng trực thuộc cho tài khoản khoa',
      path: ['departmentId']
    }
  )

export type CreateUserFormInput = z.infer<typeof createUserFormSchema>

/**
 * Schema xác thực cho Form Sửa người dùng (Client UI - React Hook Form)
 */
export const editUserFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Họ và tên không được để trống').max(100, 'Họ và tên tối đa 100 ký tự'),
    role: z.enum(['ADMIN', 'BGD', 'KHOA_USER']),
    departmentId: z.string().optional()
  })
  .refine(
    (data) => {
      if (data.role === 'KHOA_USER') {
        return !!data.departmentId && data.departmentId !== ''
      }
      return true
    },
    {
      message: 'Vui lòng chọn khoa phòng trực thuộc cho tài khoản khoa',
      path: ['departmentId']
    }
  )

export type EditUserFormInput = z.infer<typeof editUserFormSchema>

/**
 * Schema xác thực cho Form Đặt lại mật khẩu người dùng (Admin Reset Password)
 */
export const adminResetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự')
})

export type AdminResetPasswordInput = z.infer<typeof adminResetPasswordSchema>

/**
 * Schema xác thực Server API: Tạo người dùng (POST /api/admin/users)
 */
export const createUserApiSchema = z.object({
  username: z
    .string()
    .min(3, 'Tên đăng nhập phải có ít nhất 3 ký tự')
    .max(50, 'Tên đăng nhập tối đa 50 ký tự')
    .regex(/^[a-zA-Z0-9_]+$/, 'Tên đăng nhập chỉ chứa chữ cái, số và dấu gạch dưới'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  name: z.string().min(1, 'Họ và tên không được để trống'),
  role: z.enum(['ADMIN', 'BGD', 'KHOA_USER']),
  departmentId: z.number().nullable().optional()
})

export type CreateUserApiInput = z.infer<typeof createUserApiSchema>

/**
 * Schema xác thực Server API: Cập nhật người dùng (PUT /api/admin/users)
 */
export const updateUserApiSchema = z.object({
  id: z.number().int().positive('ID người dùng không hợp lệ'),
  name: z.string().min(1, 'Họ và tên không được để trống'),
  role: z.enum(['ADMIN', 'BGD', 'KHOA_USER']),
  departmentId: z.number().nullable().optional()
})

export type UpdateUserApiInput = z.infer<typeof updateUserApiSchema>

/**
 * Schema xác thực Server API: Đặt lại mật khẩu (POST /api/admin/users/reset-password)
 */
export const apiResetPasswordSchema = adminResetPasswordSchema.extend({
  userId: z.number().int().positive('ID người dùng không hợp lệ')
})

export type ApiResetPasswordInput = z.infer<typeof apiResetPasswordSchema>
