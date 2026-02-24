/**
 * Invoices API
 * CRUD operations for invoices and other documents
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import {
  calculateInvoiceTotals,
  generateDocumentNumber,
  getOrCreateDefaultSeries,
} from '@/lib/invoice-server'
import {
  validateInvoiceData,
  DocumentType,
  roundToTwo,
} from '@/lib/invoice-utils'

// ===========================================
// Validation Schemas
// ===========================================

const invoiceLineSchema = z.object({
  itemId: z.string().optional(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).max(100).optional().default(0),
  taxRateId: z.string().optional(),
})

const createInvoiceSchema = z.object({
  type: z.enum(['INVOICE', 'INVOICE_RECEIPT', 'DEBIT_NOTE', 'CREDIT_NOTE', 'RECEIPT', 'QUOTE']),
  seriesId: z.string().optional(),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  customerFiscalId: z.string().optional(),
  customerAddress: z.string().optional(),
  date: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  lines: z.array(invoiceLineSchema).min(1),
})

// ===========================================
// Helper Functions
// ===========================================

async function getCustomerSnapshot(customerId: string) {
  const customer = await prisma.party.findUnique({
    where: { id: customerId },
  })

  if (!customer) {
    throw new Error('Cliente não encontrado')
  }

  return {
    name: customer.name,
    fiscalId: customer.fiscalId,
    address: [customer.address, customer.postalCode, customer.city]
      .filter(Boolean)
      .join(', ') || null,
  }
}

// ===========================================
// GET - List invoices
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
    const status = searchParams.get('status')
    const customerId = searchParams.get('customerId')
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

    if (status) {
      where.status = status
    }

    if (customerId) {
      where.customerId = customerId
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
        { number: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Get total count
    const total = await prisma.invoice.count({ where })

    // Get invoices
    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            fiscalId: true,
          },
        },
        seriesRel: {
          select: {
            id: true,
            prefix: true,
            name: true,
          },
        },
        lines: {
          select: {
            id: true,
            description: true,
            quantity: true,
            unitPrice: true,
            total: true,
          },
        },
        _count: {
          select: { payments: true },
        },
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    return NextResponse.json({
      success: true,
      data: invoices.map(inv => ({
        ...inv,
        subtotal: Number(inv.subtotal),
        taxAmount: Number(inv.taxAmount),
        discountAmount: Number(inv.discountAmount),
        totalAmount: Number(inv.totalAmount),
        paidAmount: Number(inv.paidAmount),
        lines: inv.lines.map(line => ({
          ...line,
          quantity: Number(line.quantity),
          unitPrice: Number(line.unitPrice),
          total: Number(line.total),
        })),
        paymentCount: inv._count.payments,
      })),
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao carregar documentos' },
      { status: 500 }
    )
  }
}

// ===========================================
// POST - Create new invoice
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
    const validatedData = createInvoiceSchema.parse(body)

    // Validate invoice data
    const validation = validateInvoiceData({
      type: validatedData.type as DocumentType,
      customerId: validatedData.customerId,
      customerName: validatedData.customerName,
      lines: validatedData.lines,
    })

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.errors.join(', ') },
        { status: 400 }
      )
    }

    // Get customer snapshot
    let customerName = validatedData.customerName || ''
    let customerFiscalId = validatedData.customerFiscalId || null
    let customerAddress = validatedData.customerAddress || null

    if (validatedData.customerId) {
      const snapshot = await getCustomerSnapshot(validatedData.customerId)
      customerName = snapshot.name
      customerFiscalId = snapshot.fiscalId
      customerAddress = snapshot.address
    }

    // Get or create series
    const seriesId = validatedData.seriesId || 
      await getOrCreateDefaultSeries(validatedData.type as DocumentType, session.user.companyId)

    // Generate document number
    const { number, series } = await generateDocumentNumber(seriesId, session.user.companyId)

    // Calculate totals
    const totals = await calculateInvoiceTotals(
      validatedData.lines,
      session.user.companyId
    )

    // Create invoice with lines in a transaction
    const invoice = await prisma.$transaction(async (tx) => {
      // Create invoice
      const newInvoice = await tx.invoice.create({
        data: {
          number,
          series,
          type: validatedData.type,
          status: 'DRAFT',
          date: validatedData.date ? new Date(validatedData.date) : new Date(),
          dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
          notes: validatedData.notes,
          internalNotes: validatedData.internalNotes,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          discountAmount: totals.discountAmount,
          totalAmount: totals.totalAmount,
          paidAmount: 0,
          customerName,
          customerFiscalId,
          customerAddress,
          customerId: validatedData.customerId || null,
          seriesId,
          companyId: session.user.companyId,
          createdById: session.user.id,
        },
      })

      // Create invoice lines
      for (const line of totals.lines) {
        await tx.invoiceLineItem.create({
          data: {
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discount: line.discount,
            taxRate: line.taxRate,
            taxAmount: line.taxAmount,
            total: line.total,
            invoiceId: newInvoice.id,
            itemId: line.taxRateId ? undefined : validatedData.lines.find(l => l.description === line.description)?.itemId,
            taxRateId: line.taxRateId,
          },
        })
      }

      // Update series current number
      await tx.documentSeries.update({
        where: { id: seriesId },
        data: { currentNumber: { increment: 1 } },
      })

      return newInvoice
    })

    // Fetch complete invoice with lines
    const completeInvoice = await prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: {
        lines: true,
        customer: true,
        seriesRel: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...completeInvoice,
        subtotal: Number(completeInvoice?.subtotal),
        taxAmount: Number(completeInvoice?.taxAmount),
        discountAmount: Number(completeInvoice?.discountAmount),
        totalAmount: Number(completeInvoice?.totalAmount),
        paidAmount: Number(completeInvoice?.paidAmount),
        lines: completeInvoice?.lines.map(line => ({
          ...line,
          quantity: Number(line.quantity),
          unitPrice: Number(line.unitPrice),
          discount: Number(line.discount),
          taxRate: Number(line.taxRate),
          taxAmount: Number(line.taxAmount),
          total: Number(line.total),
        })),
      },
      message: 'Documento criado com sucesso',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating invoice:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao criar documento' },
      { status: 500 }
    )
  }
}
