'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Lock, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { loginSchema, LoginInput } from '@/lib/schemas/auth-user-schemas'

export default function LoginPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: ''
    },
    mode: "onChange",
  })

  // Xử lý đăng nhập client-side với dữ liệu đã được Zod xác thực
  const onSubmit = async (data: LoginInput) => {
    setServerError(null)

    try {
      const res = await signIn('credentials', {
        username: data.username.trim(),
        password: data.password,
        redirect: false
      })

      if (res?.error) {
        setServerError('Sai tài khoản hoặc mật khẩu')
      } else {
        router.push('/menu')
        router.refresh()
      }
    } catch {
      setServerError('Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại.')
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#EDEEF5] dark:bg-[#0F1021] px-4 overflow-hidden transition-colors duration-200">
      {/* Họa tiết Blob tím mờ tạo chiều sâu */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#D1D2F7]/50 dark:bg-[#2E2A7A]/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#E8E8FB]/80 dark:bg-[#1F1D55]/30 blur-3xl pointer-events-none" />

      {/* Card đăng nhập chính */}
      <div className="relative z-10 max-w-[420px] w-full bg-white dark:bg-[#18192E] rounded-[20px] border border-[#E8E8F2] dark:border-[#2A2C49] shadow-[0_4px_20px_rgba(100,100,180,0.06)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.4)] p-8 space-y-6 transition-all duration-200">
        {/* Header với Logo Bệnh viện Đa khoa Khánh Hội */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center mb-1">
            <Image
              src="/logo.png"
              alt="Bệnh viện Đa khoa Khánh Hội"
              width={64}
              height={64}
              className="rounded-[14px] object-contain shadow-xs"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1F2050] dark:text-[#F0F1F9]">
            Bệnh viện Đa khoa Khánh Hội
          </h1>
          <p className="text-xs text-[#5A5B7C] dark:text-[#A3A6C4] font-medium">
            Hệ thống báo cáo giao ban điều dưỡng 24h
          </p>
        </div>

        {/* Thông báo lỗi từ server nếu có */}
        {serverError && (
          <div className="p-3 text-xs font-semibold text-[#C53030] dark:text-rose-400 bg-[#FDECEC] dark:bg-[#3D1E24] border border-[#C53030]/20 dark:border-rose-900 rounded-[10px] flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Form đăng nhập quản lý bởi React Hook Form + Zod */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#1F2050] dark:text-[#F0F1F9]">
              Tên đăng nhập
            </label>
            <div className="relative">
              <Input
                type="text"
                {...register('username')}
                placeholder="Nhập tài khoản (admin, noi, bgd...)"
                className="pl-9 dark:bg-[#1E2038] dark:border-[#2A2C49] dark:text-white"
                aria-invalid={errors.username ? 'true' : 'false'}
              />
              <User className="w-4 h-4 text-[#8A8BA0] absolute left-3 top-3 pointer-events-none" />
            </div>
            {errors.username && (
              <p className="text-[11px] font-semibold text-[#C53030] dark:text-rose-400 mt-1">
                {errors.username.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#1F2050] dark:text-[#F0F1F9]">
              Mật khẩu
            </label>
            <div className="relative">
              <Input
                type="password"
                {...register('password')}
                placeholder="Nhập mật khẩu"
                className="pl-9 dark:bg-[#1E2038] dark:border-[#2A2C49] dark:text-white"
                aria-invalid={errors.password ? 'true' : 'false'}
              />
              <Lock className="w-4 h-4 text-[#8A8BA0] absolute left-3 top-3 pointer-events-none" />
            </div>
            {errors.password && (
              <p className="text-[11px] font-semibold text-[#C53030] dark:text-rose-400 mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isSubmitting}
            className="w-full mt-2 font-semibold"
          >
            {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>
        </form>
      </div>
    </div>
  )
}
