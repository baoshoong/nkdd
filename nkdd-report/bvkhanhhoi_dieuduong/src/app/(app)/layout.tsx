import { redirect } from 'next/navigation'
import { auth, signOut } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AppShell } from '@/components/layout/AppShell'

// Layout dùng chung cho các trang nghiệp vụ sau đăng nhập
export default async function AppLayout({
  children
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  // Lấy tiến độ báo cáo mới nhất cho Sidebar
  const [latestReport, totalDepts] = await Promise.all([
    prisma.report.findFirst({
      orderBy: { reportDate: 'desc' },
      include: {
        reportValues: {
          include: { department: true }
        }
      }
    }),
    prisma.department.count({
      where: { isActive: true, isTotal: false }
    })
  ])

  const submittedDeptIds = new Set<number>()
  if (latestReport) {
    for (const rv of latestReport.reportValues) {
      if (!rv.department.isTotal && rv.value > 0) {
        submittedDeptIds.add(rv.departmentId)
      }
    }
  }

  const initialProgress = {
    submitted: submittedDeptIds.size,
    total: totalDepts || 11
  }

  const handleSignOut = async () => {
    'use server'
    await signOut({ redirectTo: '/login' })
  }

  return (
    <AppShell
      user={{
        name: session.user.name,
        role: session.user.role,
        departmentCode: session.user.departmentCode
      }}
      initialProgress={initialProgress}
      onSignOut={handleSignOut}
    >
      {children}
    </AppShell>
  )
}
