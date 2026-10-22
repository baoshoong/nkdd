import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

// Kết nối database PostgreSQL qua connection string từ env
const connectionString = process.env.DATABASE_URL || 'postgresql://nkdd:nkdd123@localhost:5439/nkdd?schema=public'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const adapter = new PrismaPg(connectionString)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
