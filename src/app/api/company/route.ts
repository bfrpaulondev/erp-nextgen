/**
 * Company API
 * Update company information
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { validatePhone, validatePostalCode } from '@/lib/validators'

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { address, city, postalCode, phone, website, logo, email } = body

    // Validate postal code if provided
    if (postalCode) {
      const country = session.user.company?.country || 'PT'
      const postalValidation = validatePostalCode(postalCode, country as 'PT' | 'AO')
      if (!postalValidation.valid) {
        return NextResponse.json({ error: postalValidation.error }, { status: 400 })
      }
    }

    // Validate phone if provided
    if (phone) {
      const country = session.user.company?.country || 'PT'
      const phoneValidation = validatePhone(phone, country as 'PT' | 'AO')
      if (!phoneValidation.valid) {
        return NextResponse.json({ error: phoneValidation.error }, { status: 400 })
      }
    }

    const updatedCompany = await prisma.company.update({
      where: { id: session.user.companyId },
      data: {
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(postalCode !== undefined && { postalCode: postalCode.replace(/\s/g, '') }),
        ...(phone !== undefined && { phone }),
        ...(website !== undefined && { website }),
        ...(logo !== undefined && { logo }),
        ...(email !== undefined && { email }),
      },
    })

    return NextResponse.json({ success: true, data: updatedCompany })
  } catch (error) {
    console.error('[Company] Error:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar empresa' },
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
    })

    return NextResponse.json({ data: company })
  } catch (error) {
    console.error('[Company] Error:', error)
    return NextResponse.json(
      { error: 'Erro ao obter dados da empresa' },
      { status: 500 }
    )
  }
}
