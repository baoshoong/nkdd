import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ReportPageClient } from './ReportPageClient'

export default async function ReportPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const role = session.user.role
  const canExport = role === 'ADMIN' || role === 'BGD'

  return <ReportPageClient canExport={canExport} />
}
