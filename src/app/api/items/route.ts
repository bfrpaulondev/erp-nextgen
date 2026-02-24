/**
 * Items API - List and Create
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

const itemSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  type: z.enum(['PRODUCT', 'SERVICE']),
  unit: z.string().default('UN'),
  price: z.number().min(0, 'Preço deve ser maior ou igual a zero'),
  cost: z.number().optional(),
  stock: z.number().optional(),
  minStock: z.number().optional(),
  taxRateId: z.string().optional(),
})

// GET - List items
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const search = searchParams.get('search')
    const activeOnly = searchParams.get('active') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      companyId: session.user.companyId,
    }

    if (type && ['PRODUCT', 'SERVICE'].includes(type)) {
      where.type = type
    }

    if (activeOnly) {
      where.isActive = true
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { description: { contains: search } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          taxRate: true,
        },
      }),
      prisma.item.count({ where }),
    ])

    return NextResponse.json({
      data: items,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error listing items:', error)
    return NextResponse.json(
      { error: 'Erro ao listar itens' },
      { status: 500 }
    )
  }
}

// POST - Create item
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = itemSchema.parse(body)

    // Check if code already exists
    const existing = await prisma.item.findFirst({
      where: {
        code: validatedData.code,
        companyId: session.user.companyId,
      },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'Já existe um item com este código' },
        { status: 400 }
      )
    }

    const item = await prisma.item.create({
      data: {
        ...validatedData,
        companyId: session.user.companyId,
      },
      include: {
        taxRate: true,
      },
    })

    return NextResponse.json({ data: item }, { status: 201 })
  } catch (error) {
    console.error('Error creating item:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro ao criar item' },
      { status: 500 }
    )
  }
}
