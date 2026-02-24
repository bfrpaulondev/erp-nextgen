/**
 * Prisma Client Singleton
 * Prevents multiple instances in development (hot reload)
 * SERVER-ONLY: This module can only be imported in server-side code
 */

import 'server-only'
import { PrismaClient } from '@prisma/client'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// Function to load .env file
function loadEnvFile(envPath: string): boolean {
  if (!existsSync(envPath)) return false
  
  try {
    const envContent = readFileSync(envPath, 'utf-8')
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return
      
      const equalIndex = trimmed.indexOf('=')
      if (equalIndex > 0) {
        const key = trimmed.substring(0, equalIndex).trim()
        let value = trimmed.substring(equalIndex + 1).trim()
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        process.env[key] = value
      }
    })
    return true
  } catch {
    return false
  }
}

// Try to load .env from multiple possible locations
// Priority: current directory -> parent directories
const cwd = process.cwd()
if (!loadEnvFile(resolve(cwd, '.env'))) {
  if (!loadEnvFile(resolve(cwd, '../.env'))) {
    loadEnvFile(resolve(cwd, '../../.env'))
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured. Please check your .env file.')
  }
  
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn']
      : ['error'],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
