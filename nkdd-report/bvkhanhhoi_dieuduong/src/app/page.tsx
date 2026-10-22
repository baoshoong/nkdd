import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

// Chuyển hướng trang chủ về Menu phân hệ ứng dụng
export default async function HomePage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  redirect('/menu')
}
