/**
 * Single Invoice API
 * Operations for a specific invoice
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { calculateInvoiceTotals } from '@/lib/invoice-server'
import { canEditInvoice, roundToTwo } from '@/lib/invoice-utils'

// ===========================================
// Validation Schemas
// ===========================================

const invoiceLineSchema = z.object({
  id: z.string().optional(),
  itemId: z.string().optional(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).max(100).optional().default(0),
  taxRateId: z.string().optional(),
})

const updateInvoiceSchema = z.object({
  customerId: z.string().optional().nullable(),
  customerName: z.string().optional(),
  customerFiscalId: z.string().optional().nullable(),
  customerAddress: z.string().optional().nullable(),
  date: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
  lines: z.array(invoiceLineSchema).min(1).optional(),
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
// GET - Get single invoice
// ===========================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params

    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
      include: {
        customer: true,
        seriesRel: true,
        lines: {
          include: {
            item: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
                unit: true,
              },
            },
            taxRateRel: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        payments: {
          orderBy: { date: 'desc' },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Documento não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...invoice,
        subtotal: Number(invoice.subtotal),
        taxAmount: Number(invoice.taxAmount),
        discountAmount: Number(invoice.discountAmount),
        totalAmount: Number(invoice.totalAmount),
        paidAmount: Number(invoice.paidAmount),
        lines: invoice.lines.map(line => ({
          ...line,
          quantity: Number(line.quantity),
          unitPrice: Number(line.unitPrice),
          discount: Number(line.discount),
          taxRate: Number(line.taxRate),
          taxAmount: Number(line.taxAmount),
          total: Number(line.total),
        })),
        payments: invoice.payments.map(payment => ({
          ...payment,
          amount: Number(payment.amount),
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao carregar documento' },
      { status: 500 }
    )
  }
}

// ===========================================
// PUT - Update invoice (draft only)
// ===========================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = updateInvoiceSchema.parse(body)

    // Get existing invoice
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
    })

    if (!existingInvoice) {
      return NextResponse.json(
        { success: false, error: 'Documento não encontrado' },
        { status: 404 }
      )
    }

    // Check if can edit
    if (!canEditInvoice(existingInvoice.status as 'DRAFT' | 'FINALIZED' | 'PENDING' | 'PAID' | 'PARTIAL' | 'CANCELLED')) {
      return NextResponse.json(
        { success: false, error: 'Documento não pode ser editado' },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {}

    // Update customer info
    if (validatedData.customerId !== undefined) {
      if (validatedData.customerId) {
        const snapshot = await getCustomerSnapshot(validatedData.customerId)
        updateData.customerId = validatedData.customerId
        updateData.customerName = snapshot.name
        updateData.customerFiscalId = snapshot.fiscalId
        updateData.customerAddress = snapshot.address
      } else {
        updateData.customerId = null
        updateData.customerName = validatedData.customerName || existingInvoice.customerName
        updateData.customerFiscalId = validatedData.customerFiscalId
        updateData.customerAddress = validatedData.customerAddress
      }
    }

    // Update dates
    if (validatedData.date) {
      updateData.date = new Date(validatedData.date)
    }

    if (validatedData.dueDate !== undefined) {
      updateData.dueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null
    }

    // Update notes
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes
    }

    if (validatedData.internalNotes !== undefined) {
      updateData.internalNotes = validatedData.internalNotes
    }

    // Update lines and recalculate totals
    if (validatedData.lines) {
      const totals = await calculateInvoiceTotals(
        validatedData.lines,
        session.user.companyId
      )

      updateData.subtotal = totals.subtotal
      updateData.taxAmount = totals.taxAmount
      updateData.discountAmount = totals.discountAmount
      updateData.totalAmount = totals.totalAmount

      // Update in transaction
      await prisma.$transaction(async (tx) => {
        // Delete existing lines
        await tx.invoiceLineItem.deleteMany({
          where: { invoiceId: id },
        })

        // Create new lines
        for (const line of totals.lines) {
          const inputLine = validatedData.lines?.find(l => l.description === line.description)
          await tx.invoiceLineItem.create({
            data: {
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              discount: line.discount,
              taxRate: line.taxRate,
              taxAmount: line.taxAmount,
              total: line.total,
              invoiceId: id,
              itemId: inputLine?.itemId,
              taxRateId: line.taxRateId,
            },
          })
        }

        // Update invoice
        await tx.invoice.update({
          where: { id },
          data: updateData,
        })
      })
    } else {
      // Just update invoice without touching lines
      await prisma.invoice.update({
        where: { id },
        data: updateData,
      })
    }

    // Fetch updated invoice
    const updatedInvoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            item: true,
            taxRateRel: true,
          },
        },
        customer: true,
        seriesRel: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...updatedInvoice,
        subtotal: Number(updatedInvoice?.subtotal),
        taxAmount: Number(updatedInvoice?.taxAmount),
        discountAmount: Number(updatedInvoice?.discountAmount),
        totalAmount: Number(updatedInvoice?.totalAmount),
        paidAmount: Number(updatedInvoice?.paidAmount),
        lines: updatedInvoice?.lines.map(line => ({
          ...line,
          quantity: Number(line.quantity),
          unitPrice: Number(line.unitPrice),
          discount: Number(line.discount),
          taxRate: Number(line.taxRate),
          taxAmount: Number(line.taxAmount),
          total: Number(line.total),
        })),
      },
      message: 'Documento atualizado com sucesso',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Dados inválidos', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error updating invoice:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar documento' },
      { status: 500 }
    )
  }
}

// ===========================================
// DELETE - Delete invoice (draft only)
// ===========================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Get existing invoice
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
      include: {
        _count: {
          select: { payments: true },
        },
      },
    })

    if (!existingInvoice) {
      return NextResponse.json(
        { success: false, error: 'Documento não encontrado' },
        { status: 404 }
      )
    }

    // Check if can delete
    if (!canEditInvoice(existingInvoice.status as 'DRAFT' | 'FINALIZED' | 'PENDING' | 'PAID' | 'PARTIAL' | 'CANCELLED')) {
      return NextResponse.json(
        { success: false, error: 'Apenas rascunhos podem ser eliminados' },
        { status: 400 }
      )
    }

    // Check for payments
    if (existingInvoice._count.payments > 0) {
      return NextResponse.json(
        { success: false, error: 'Documento tem pagamentos associados' },
        { status: 400 }
      )
    }

    // Delete invoice (lines will be cascade deleted)
    await prisma.invoice.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Documento eliminado com sucesso',
    })
  } catch (error) {
    console.error('Error deleting invoice:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao eliminar documento' },
      { status: 500 }
    )
  }
}
