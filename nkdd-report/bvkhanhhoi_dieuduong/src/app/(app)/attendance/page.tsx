import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { AttendanceClient } from './AttendanceClient'
import { AttendanceComingSoon } from '@/components/attendance/AttendanceComingSoon'
import { ATTENDANCE_MODULE_ENABLED } from '@/config/modules.config'

export const metadata = {
  title: 'Chấm Công & Phân Ca Điều Dưỡng | Bệnh viện Đa khoa Khánh Hội',
  description: 'Bảng chấm công cán bộ, theo dõi vắng/phép và phân ca trực khoa phòng'
}

export default async function AttendancePage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  // Nếu phân hệ chấm công đang tạm khóa (sắp ra mắt)
  if (!ATTENDANCE_MODULE_ENABLED) {
    return <AttendanceComingSoon userRole={session.user.role} />
  }

  return (
    <AttendanceClient
      initialUser={{
        id: session.user.id,
        name: session.user.name,
        role: session.user.role,
        departmentId: session.user.departmentId
      }}
    />
  )
}
