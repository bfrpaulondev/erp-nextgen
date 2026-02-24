/**
 * Party API - Get, Update, Delete by ID
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

const partyUpdateSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional(),
  fiscalId: z.string().optional(),
  type: z.enum(['CUSTOMER', 'SUPPLIER', 'BOTH']).optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
})

// GET - Get party by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params

    const party = await prisma.party.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
      include: {
        invoices: {
          take: 10,
          orderBy: { date: 'desc' },
        },
        payments: {
          take: 10,
          orderBy: { date: 'desc' },
        },
      },
    })

    if (!party) {
      return NextResponse.json(
        { error: 'Entidade não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: party })
  } catch (error) {
    console.error('Error getting party:', error)
    return NextResponse.json(
      { error: 'Erro ao obter entidade' },
      { status: 500 }
    )
  }
}

// PUT - Update party
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = partyUpdateSchema.parse(body)

    // Check if party exists and belongs to company
    const existingParty = await prisma.party.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
    })

    if (!existingParty) {
      return NextResponse.json(
        { error: 'Entidade não encontrada' },
        { status: 404 }
      )
    }

    // Check if fiscalId is being changed and already exists
    if (validatedData.fiscalId && validatedData.fiscalId !== existingParty.fiscalId) {
      const duplicateFiscal = await prisma.party.findFirst({
        where: {
          fiscalId: validatedData.fiscalId,
          companyId: session.user.companyId,
          NOT: { id },
        },
      })
      if (duplicateFiscal) {
        return NextResponse.json(
          { error: 'Já existe uma entidade com este NIF' },
          { status: 400 }
        )
      }
    }

    const party = await prisma.party.update({
      where: { id },
      data: {
        ...validatedData,
        email: validatedData.email || null,
        fiscalId: validatedData.fiscalId || null,
      },
    })

    return NextResponse.json({ data: party })
  } catch (error) {
    console.error('Error updating party:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro ao atualizar entidade' },
      { status: 500 }
    )
  }
}

// DELETE - Delete party
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params

    // Check if party exists and belongs to company
    const existingParty = await prisma.party.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
      include: {
        _count: {
          select: { invoices: true },
        },
      },
    })

    if (!existingParty) {
      return NextResponse.json(
        { error: 'Entidade não encontrada' },
        { status: 404 }
      )
    }

    // Check if party has invoices
    if (existingParty._count.invoices > 0) {
      return NextResponse.json(
        { error: 'Não é possível eliminar uma entidade com faturas associadas' },
        { status: 400 }
      )
    }

    await prisma.party.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting party:', error)
    return NextResponse.json(
      { error: 'Erro ao eliminar entidade' },
      { status: 500 }
    )
  }
}
