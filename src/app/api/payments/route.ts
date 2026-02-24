/**
 * Payments API
 * Manage payments and receipts
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

// ===========================================
// Validation Schemas
// ===========================================

const paymentSchema = z.object({
  type: z.enum(['RECEIPT', 'PAYMENT']), // RECEIPT = recebimento, PAYMENT = pagamento
  date: z.string(),
  amount: z.number().positive('Valor deve ser positivo'),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'CARD', 'CHECK', 'DIRECT_DEBIT', 'MBWAY', 'OTHER']),
  reference: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  invoiceId: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
  supplierId: z.string().nullable().optional(),
})

// ===========================================
// GET - List payments
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
    const method = searchParams.get('method')
    const customerId = searchParams.get('customerId')
    const invoiceId = searchParams.get('invoiceId')
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    const where: Record<string, unknown> = {
      companyId: session.user.companyId,
    }

    if (type) {
      where.type = type
    }

    if (method) {
      where.method = method
    }

    if (customerId) {
      where.customerId = customerId
    }

    if (invoiceId) {
      where.invoiceId = invoiceId
    }

    if (fromDate || toDate) {
      where.date = {}
      if (fromDate) {
        (where.date as Record<string, unknown>).gte = new Date(fromDate)
      }
      if (toDate) {
        (where.date as Record<string, unknown>).lte = new Date(toDate)
      }
    }

    if (search) {
      where.OR = [
        { number: { contains: search } },
        { reference: { contains: search } },
      ]
    }

    const [payments, total, totalsByType] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              fiscalId: true,
              type: true,
            }
          },
          invoice: {
            select: {
              id: true,
              number: true,
              type: true,
              totalAmount: true,
            }
          },
          createdBy: {
            select: {
              id: true,
              name: true,
            }
          }
        },
        orderBy: [
          { date: 'desc' },
          { createdAt: 'desc' }
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.payment.count({ where }),
      prisma.payment.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
      })
    ])

    // Get totals by method
    const byMethod = await prisma.payment.groupBy({
      by: ['method', 'type'],
      where: { companyId: session.user.companyId },
      _sum: { amount: true },
      _count: true,
    })

    return NextResponse.json({
      success: true,
      data: payments.map(p => ({
        id: p.id,
        number: p.number,
        type: p.type,
        date: p.date,
        amount: Number(p.amount),
        method: p.method,
        reference: p.reference,
        notes: p.notes,
        createdAt: p.createdAt,
        customer: p.customer ? {
          id: p.customer.id,
          name: p.customer.name,
          fiscalId: p.customer.fiscalId,
        } : null,
        invoice: p.invoice ? {
          id: p.invoice.id,
          number: p.invoice.number,
          type: p.invoice.type,
          totalAmount: Number(p.invoice.totalAmount),
        } : null,
        createdBy: p.createdBy?.name,
      })),
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      summary: {
        totalAmount: Number(totalsByType._sum.amount) || 0,
        count: totalsByType._count,
        byMethod: byMethod.map(m => ({
          method: m.method,
          type: m.type,
          total: Number(m._sum.amount) || 0,
          count: m._count,
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching payments:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return NextResponse.json(
      { success: false, error: `Erro ao carregar pagamentos: ${errorMessage}` },
      { status: 500 }
    )
  }
}

// ===========================================
// POST - Create payment
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
    const validatedData = paymentSchema.parse(body)

    // Generate payment number
    const year = new Date().getFullYear()
    const prefix = validatedData.type === 'RECEIPT' ? 'REC' : 'PAG'
    
    const lastPayment = await prisma.payment.findFirst({
      where: {
        companyId: session.user.companyId,
        number: { startsWith: `${prefix}${year}` },
      },
      orderBy: { number: 'desc' }
    })

    let nextNumber = 1
    if (lastPayment) {
      const lastNum = parseInt(lastPayment.number.replace(`${prefix}${year}`, ''))
      if (!isNaN(lastNum)) {
        nextNumber = lastNum + 1
      }
    }

    const number = `${prefix}${year}${nextNumber.toString().padStart(5, '0')}`

    // Create payment in transaction
    const payment = await prisma.$transaction(async (tx) => {
      // Create payment
      const newPayment = await tx.payment.create({
        data: {
          number,
          type: validatedData.type,
          date: new Date(validatedData.date),
          amount: validatedData.amount,
          method: validatedData.method,
          reference: validatedData.reference || null,
          notes: validatedData.notes || null,
          invoiceId: validatedData.invoiceId || null,
          customerId: validatedData.customerId || validatedData.supplierId || null,
          companyId: session.user.companyId,
          createdById: session.user.id,
        },
        include: {
          customer: true,
          invoice: true,
        }
      })

      // If linked to invoice, update invoice paid amount
      if (validatedData.invoiceId) {
        const invoice = await tx.invoice.findUnique({
          where: { id: validatedData.invoiceId },
          include: {
            payments: true,
          }
        })

        if (invoice) {
          const totalPaid = invoice.payments
            .filter(p => p.id !== newPayment.id)
            .reduce((sum, p) => sum + Number(p.amount), 0) + validatedData.amount

          const totalAmount = Number(invoice.totalAmount)
          let newStatus = invoice.status

          if (totalPaid >= totalAmount) {
            newStatus = 'PAID'
          } else if (totalPaid > 0) {
            newStatus = 'PARTIAL'
          }

          await tx.invoice.update({
            where: { id: validatedData.invoiceId },
            data: {
              paidAmount: totalPaid,
              status: newStatus,
            }
          })
        }
      }

      return newPayment
    })

    return NextResponse.json({
      success: true,
      data: {
        ...payment,
        amount: Number(payment.amount),
      },
      message: validatedData.type === 'RECEIPT' 
        ? 'Recebimento registado com sucesso' 
        : 'Pagamento registado com sucesso',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return NextResponse.json(
        { success: false, error: `Dados inválidos: ${errorMessages}` },
        { status: 400 }
      )
    }
    
    console.error('Error creating payment:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return NextResponse.json(
      { success: false, error: `Erro ao criar pagamento: ${errorMessage}` },
      { status: 500 }
    )
  }
}
