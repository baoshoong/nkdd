import type { DefaultSession } from 'next-auth'
import type { Role } from '@/generated/prisma/enums'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: Role
      departmentId: number | null
      departmentCode: string | null
    } & DefaultSession['user']
  }

  interface User {
    id?: string
    role?: Role
    departmentId?: number | null
    departmentCode?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: Role
    departmentId?: number | null
    departmentCode?: string | null
  }
}
