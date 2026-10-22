import path from 'path'
import dotenv from 'dotenv'
import { defineConfig } from 'prisma/config'

// Nạp các biến môi trường: ưu tiên .env -> .env.local -> .env.production
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
}
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.production') })
}

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL

if (!databaseUrl) {
  console.warn(
    '\n⚠️  [Prisma Config] Không tìm thấy biến môi trường DATABASE_URL trong file .env, .env.local hoặc .env.production!' +
      '\nVui lòng đảm bảo bạn đã tạo file .env tại thư mục gốc với nội dung: DATABASE_URL="postgresql://user:pass@host:5432/dbname?schema=public"\n'
  )
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts'
  },
  datasource: {
    url: databaseUrl
  }
})
