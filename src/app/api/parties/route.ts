/**
 * Parties API - List and Create
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

const partySchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  fiscalId: z.string().optional(),
  type: z.enum(['CUSTOMER', 'SUPPLIER', 'BOTH']),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
})

// GET - List parties
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      companyId: session.user.companyId,
    }

    if (type && ['CUSTOMER', 'SUPPLIER', 'BOTH'].includes(type)) {
      where.type = type
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { fiscalId: { contains: search } },
        { email: { contains: search } },
      ]
    }

    const [parties, total] = await Promise.all([
      prisma.party.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.party.count({ where }),
    ])

    return NextResponse.json({
      data: parties,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error listing parties:', error)
    return NextResponse.json(
      { error: 'Erro ao listar entidades' },
      { status: 500 }
    )
  }
}

// POST - Create party
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = partySchema.parse(body)

    // Check if fiscalId already exists
    if (validatedData.fiscalId) {
      const existing = await prisma.party.findFirst({
        where: {
          fiscalId: validatedData.fiscalId,
          companyId: session.user.companyId,
        },
      })
      if (existing) {
        return NextResponse.json(
          { error: 'Já existe uma entidade com este NIF' },
          { status: 400 }
        )
      }
    }

    const party = await prisma.party.create({
      data: {
        ...validatedData,
        email: validatedData.email || null,
        fiscalId: validatedData.fiscalId || null,
        companyId: session.user.companyId,
      },
    })

    return NextResponse.json({ data: party }, { status: 201 })
  } catch (error) {
    console.error('Error creating party:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro ao criar entidade' },
      { status: 500 }
    )
  }
}
