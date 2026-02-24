/**
 * Single Payment API
 * Operations for a specific payment (GET, PUT, DELETE)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// ===========================================
// GET - Get single payment details
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

    const payment = await prisma.payment.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            fiscalId: true,
            type: true,
            email: true,
            phone: true,
          }
        },
        invoice: {
          select: {
            id: true,
            number: true,
            type: true,
            totalAmount: true,
            paidAmount: true,
            status: true,
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          }
        }
      },
    })

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Pagamento não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...payment,
        amount: Number(payment.amount),
        invoice: payment.invoice ? {
          ...payment.invoice,
          totalAmount: Number(payment.invoice.totalAmount),
          paidAmount: Number(payment.invoice.paidAmount),
        } : null,
      },
    })
  } catch (error) {
    console.error('Error fetching payment:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao carregar pagamento' },
      { status: 500 }
    )
  }
}

// ===========================================
// DELETE - Delete payment
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

    // Get existing payment
    const existingPayment = await prisma.payment.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
    })

    if (!existingPayment) {
      return NextResponse.json(
        { success: false, error: 'Pagamento não encontrado' },
        { status: 404 }
      )
    }

    // Delete payment in transaction (to update invoice if needed)
    await prisma.$transaction(async (tx) => {
      // If linked to invoice, update invoice paid amount
      if (existingPayment.invoiceId) {
        const invoice = await tx.invoice.findUnique({
          where: { id: existingPayment.invoiceId },
          include: {
            payments: {
              where: { id: { not: id } }
            }
          }
        })

        if (invoice) {
          const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0)
          const totalAmount = Number(invoice.totalAmount)
          
          let newStatus = invoice.status
          if (totalPaid === 0) {
            newStatus = 'PENDING'
          } else if (totalPaid < totalAmount) {
            newStatus = 'PARTIAL'
          }

          await tx.invoice.update({
            where: { id: existingPayment.invoiceId },
            data: {
              paidAmount: totalPaid,
              status: newStatus,
            }
          })
        }
      }

      // Delete payment
      await tx.payment.delete({
        where: { id },
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Pagamento eliminado com sucesso',
    })
  } catch (error) {
    console.error('Error deleting payment:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao eliminar pagamento' },
      { status: 500 }
    )
  }
}
