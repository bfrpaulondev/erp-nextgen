/**
 * Database Connection Test
 */

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1 as test`
    
    // Count tables
    const companies = await prisma.company.count()
    const users = await prisma.user.count()
    
    return NextResponse.json({
      status: 'connected',
      database: 'PostgreSQL',
      counts: {
        companies,
        users,
      },
    })
  } catch (error) {
    console.error('Database connection error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json({
      status: 'error',
      error: errorMessage,
    }, { status: 500 })
  }
}
