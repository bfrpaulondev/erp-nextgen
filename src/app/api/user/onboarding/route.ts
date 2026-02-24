/**
 * User Onboarding API
 * Mark user's onboarding as complete
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { completed } = body

    // Update company settings with onboarding status
    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: { settings: true },
    })

    await prisma.company.update({
      where: { id: session.user.companyId },
      data: {
        settings: {
          ...(company?.settings as object || {}),
          onboardingCompleted: completed,
          onboardingCompletedAt: completed ? new Date().toISOString() : null,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Onboarding] Error:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar onboarding' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: { settings: true },
    })

    const onboardingCompleted = (company?.settings as Record<string, any>)?.onboardingCompleted || false

    return NextResponse.json({ completed: onboardingCompleted })
  } catch (error) {
    console.error('[Onboarding] Error:', error)
    return NextResponse.json(
      { error: 'Erro ao verificar onboarding' },
      { status: 500 }
    )
  }
}
