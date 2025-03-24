import { PrismaClient } from '@prisma/client'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient }

// Create a mock implementation for when Prisma client fails to initialize
const mockPrisma = {
  user: {
    findUnique: async () => null,
    findMany: async () => [],
  },
  template: {
    findUnique: async () => null,
    findMany: async () => [],
    create: async (data: any) => ({ 
      id: `mock-template-${Date.now()}`, 
      createdAt: new Date(),
      updatedAt: new Date(),
      isDefault: data.data.isDefault || false,
      ...data.data 
    }),
    delete: async () => ({}),
  },
  package: {
    findUnique: async () => null,
    findMany: async () => [],
  },
}

let prismaInstance: any

try {
  prismaInstance = globalForPrisma.prisma || 
    new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })

  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaInstance

} catch (error) {
  console.warn('Failed to initialize Prisma client, using mock implementation', error)
  prismaInstance = mockPrisma
}

export const prisma = prismaInstance
export default prisma 