/**
 * Document Series API
 * CRUD operations for document series
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

// ===========================================
// Validation Schemas
// ===========================================

const createSeriesSchema = z.object({
  type: z.enum(['INVOICE', 'INVOICE_RECEIPT', 'DEBIT_NOTE', 'CREDIT_NOTE', 'RECEIPT', 'QUOTE']),
  prefix: z.string().min(1).max(10).toUpperCase(),
  name: z.string().min(1).max(100),
  year: z.number().int().min(2020).max(2100),
  isActive: z.boolean().optional(),
})

const updateSeriesSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
})

// ===========================================
// GET - List all series
// ===========================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const year = searchParams.get('year')
    const isActive = searchParams.get('isActive')

    const where: Record<string, unknown> = {
      companyId: session.user.companyId,
    }

    if (type) {
      where.type = type
    }

    if (year) {
      where.year = parseInt(year)
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true'
    }

    const series = await prisma.documentSeries.findMany({
      where,
      include: {
        _count: {
          select: { invoices: true },
        },
      },
      orderBy: [
        { year: 'desc' },
        { prefix: 'asc' },
      ],
    })

    return NextResponse.json({
      success: true,
      data: series.map(s => ({
        ...s,
        currentNumber: s.currentNumber,
        documentCount: s._count.invoices,
      })),
    })
  } catch (error) {
    console.error('Error fetching document series:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao carregar séries documentais' },
      { status: 500 }
    )
  }
}

// ===========================================
// POST - Create new series
// ===========================================

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = createSeriesSchema.parse(body)

    // Check if prefix+year already exists for this company
    const existingSeries = await prisma.documentSeries.findFirst({
      where: {
        prefix: validatedData.prefix,
        year: validatedData.year,
        companyId: session.user.companyId,
      },
    })

    if (existingSeries) {
      return NextResponse.json(
        { success: false, error: 'Já existe uma série com este prefixo e ano' },
        { status: 400 }
      )
    }

    const series = await prisma.documentSeries.create({
      data: {
        type: validatedData.type,
        prefix: validatedData.prefix,
        name: validatedData.name,
        year: validatedData.year,
        isActive: validatedData.isActive ?? true,
        currentNumber: 0,
        companyId: session.user.companyId,
      },
    })

    return NextResponse.json({
      success: true,
      data: series,
      message: 'Série documental criada com sucesso',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating document series:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao criar série documental' },
      { status: 500 }
    )
  }
}

// ===========================================
// PUT - Update series
// ===========================================

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID da série é obrigatório' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = updateSeriesSchema.parse(body)

    // Verify ownership
    const existingSeries = await prisma.documentSeries.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
    })

    if (!existingSeries) {
      return NextResponse.json(
        { success: false, error: 'Série não encontrada' },
        { status: 404 }
      )
    }

    const series = await prisma.documentSeries.update({
      where: { id },
      data: validatedData,
    })

    return NextResponse.json({
      success: true,
      data: series,
      message: 'Série documental atualizada com sucesso',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error updating document series:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar série documental' },
      { status: 500 }
    )
  }
}

// ===========================================
// DELETE - Delete series (only if no documents)
// ===========================================

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID da série é obrigatório' },
        { status: 400 }
      )
    }

    // Verify ownership and check for documents
    const existingSeries = await prisma.documentSeries.findFirst({
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

    if (!existingSeries) {
      return NextResponse.json(
        { success: false, error: 'Série não encontrada' },
        { status: 404 }
      )
    }

    if (existingSeries._count.invoices > 0) {
      return NextResponse.json(
        { success: false, error: 'Não é possível eliminar uma série com documentos associados' },
        { status: 400 }
      )
    }

    await prisma.documentSeries.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Série documental eliminada com sucesso',
    })
  } catch (error) {
    console.error('Error deleting document series:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao eliminar série documental' },
      { status: 500 }
    )
  }
}
