/**
 * Item API - Get, Update, Delete by ID
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

const itemUpdateSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório').optional(),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional(),
  description: z.string().optional(),
  type: z.enum(['PRODUCT', 'SERVICE']).optional(),
  unit: z.string().optional(),
  price: z.number().min(0, 'Preço deve ser maior ou igual a zero').optional(),
  cost: z.number().optional(),
  stock: z.number().optional(),
  minStock: z.number().optional(),
  isActive: z.boolean().optional(),
  taxRateId: z.string().optional(),
})

// GET - Get item by ID
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

    const item = await prisma.item.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
      include: {
        taxRate: true,
        stockMovements: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!item) {
      return NextResponse.json(
        { error: 'Item não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: item })
  } catch (error) {
    console.error('Error getting item:', error)
    return NextResponse.json(
      { error: 'Erro ao obter item' },
      { status: 500 }
    )
  }
}

// PUT - Update item
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
    const validatedData = itemUpdateSchema.parse(body)

    // Check if item exists and belongs to company
    const existingItem = await prisma.item.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
    })

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Item não encontrado' },
        { status: 404 }
      )
    }

    // Check if code is being changed and already exists
    if (validatedData.code && validatedData.code !== existingItem.code) {
      const duplicateCode = await prisma.item.findFirst({
        where: {
          code: validatedData.code,
          companyId: session.user.companyId,
          NOT: { id },
        },
      })
      if (duplicateCode) {
        return NextResponse.json(
          { error: 'Já existe um item com este código' },
          { status: 400 }
        )
      }
    }

    const item = await prisma.item.update({
      where: { id },
      data: validatedData,
      include: {
        taxRate: true,
      },
    })

    return NextResponse.json({ data: item })
  } catch (error) {
    console.error('Error updating item:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro ao atualizar item' },
      { status: 500 }
    )
  }
}

// DELETE - Delete item
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

    // Check if item exists and belongs to company
    const existingItem = await prisma.item.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
      include: {
        _count: {
          select: { invoiceLines: true },
        },
      },
    })

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Item não encontrado' },
        { status: 404 }
      )
    }

    // Check if item has invoice lines
    if (existingItem._count.invoiceLines > 0) {
      // Soft delete - just mark as inactive
      await prisma.item.update({
        where: { id },
        data: { isActive: false },
      })
      return NextResponse.json({
        success: true,
        message: 'Item desativado (tem faturas associadas)'
      })
    }

    await prisma.item.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting item:', error)
    return NextResponse.json(
      { error: 'Erro ao eliminar item' },
      { status: 500 }
    )
  }
}
