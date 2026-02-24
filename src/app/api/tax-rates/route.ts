/**
 * Tax Rates API - List
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import prisma from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

// GET - List tax rates
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const taxRates = await prisma.taxRate.findMany({
      where: {
        companyId: session.user.companyId,
        isActive: true,
      },
      orderBy: { rate: 'desc' },
    })

    return NextResponse.json({ data: taxRates })
  } catch (error) {
    console.error('Error listing tax rates:', error)
    return NextResponse.json(
      { error: 'Erro ao listar taxas de imposto' },
      { status: 500 }
    )
  }
}
