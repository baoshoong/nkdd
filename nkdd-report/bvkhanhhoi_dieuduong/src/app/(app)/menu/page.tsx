import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { MenuPortalClient } from './MenuPortalClient'

export const metadata = {
  title: 'Menu Phân Hệ | Bệnh viện Đa khoa Khánh Hội',
  description: 'Cổng điều hướng ứng dụng và phân hệ bệnh viện'
}

export default async function MenuPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <MenuPortalClient
      user={{
        name: session.user.name,
        role: session.user.role,
        departmentCode: session.user.departmentCode
      }}
    />
  )
}
