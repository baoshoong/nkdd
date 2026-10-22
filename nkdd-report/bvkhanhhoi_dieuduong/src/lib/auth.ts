import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/generated/prisma/enums'

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: 'jwt'
  },
  trustHost: true,
  pages: {
    signIn: '/login'
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        username: { label: 'Tài khoản', type: 'text' },
        password: { label: 'Mật khẩu', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        const username = String(credentials.username).trim()
        const password = String(credentials.password)

        // Tìm user theo username
        const user = await prisma.user.findUnique({
          where: { username },
          include: { department: true }
        })

        if (!user || !user.password) {
          return null
        }

        // So khớp mật khẩu đã hash
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
          return null
        }

        return {
          id: String(user.id),
          name: user.name,
          role: user.role,
          departmentId: user.departmentId,
          departmentCode: user.department?.code ?? null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.departmentId = user.departmentId
        token.departmentCode = user.departmentCode
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || session.user.id
        session.user.role = token.role as Role
        session.user.departmentId = (token.departmentId as number | null) ?? null
        session.user.departmentCode = (token.departmentCode as string | null) ?? null
      }
      return session
    }
  }
})
