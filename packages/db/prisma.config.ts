import { defineConfig } from "prisma"

export default defineConfig({
  // Prisma 7 configuration for migrations and CLI operations
  // The 'url' is moved here from schema.prisma
  migration: {
    url: process.env.DATABASE_URL
  }
})
