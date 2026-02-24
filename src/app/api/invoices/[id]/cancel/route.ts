/**
 * Cancel Invoice API
 * Cancels a finalized document
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { canCancelInvoice, DOCUMENT_TYPE_CONFIG } from '@/lib/invoice-utils'
import { generateDocumentNumber, getOrCreateDefaultSeries } from '@/lib/invoice-server'

// ===========================================
// POST - Cancel invoice
// ===========================================

export async function POST(
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
    const body = await request.json().catch(() => ({}))
    const { createCreditNote = false, reason = '' } = body

    // Get existing invoice
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
      include: {
        lines: {
          include: {
            item: true,
          },
        },
        payments: true,
      },
    })

    if (!existingInvoice) {
      return NextResponse.json(
        { success: false, error: 'Documento não encontrado' },
        { status: 404 }
      )
    }

    // Check if can cancel
    if (!canCancelInvoice(existingInvoice.status as 'DRAFT' | 'FINALIZED' | 'PENDING' | 'PAID' | 'PARTIAL' | 'CANCELLED')) {
      return NextResponse.json(
        { success: false, error: 'Documento não pode ser anulado' },
        { status: 400 }
      )
    }

    // Get document configuration
    const docConfig = DOCUMENT_TYPE_CONFIG[existingInvoice.type as keyof typeof DOCUMENT_TYPE_CONFIG]

    // Check for payments
    const totalPaid = existingInvoice.payments.reduce((sum, p) => sum + Number(p.amount), 0)
    if (totalPaid > 0) {
      return NextResponse.json(
        { success: false, error: 'Documento tem pagamentos associados. Remova os pagamentos primeiro.' },
        { status: 400 }
      )
    }

    let creditNoteId: string | null = null

    // Cancel in transaction
    await prisma.$transaction(async (tx) => {
      // Update status to cancelled
      await tx.invoice.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          internalNotes: existingInvoice.internalNotes 
            ? `${existingInvoice.internalNotes}\n\nAnulado: ${reason}`
            : `Anulado: ${reason}`,
        },
      })

      // Revert stock if needed
      if (docConfig?.affectsStock && docConfig.stockDirection) {
        for (const line of existingInvoice.lines) {
          if (line.item && line.item.type === 'PRODUCT') {
            const quantity = Number(line.quantity)
            const revertDirection = docConfig.stockDirection === 'OUT' ? 'IN' : 'OUT'
            
            // Create stock movement for revert
            await tx.stockMovement.create({
              data: {
                type: revertDirection,
                quantity: revertDirection === 'IN' ? quantity : -quantity,
                reference: existingInvoice.number,
                notes: `Reversão - Anulação ${existingInvoice.number}`,
                itemId: line.item.id,
                sourceType: 'INVOICE',
                sourceId: id,
                companyId: session.user.companyId,
              },
            })

            // Update item stock
            const currentStock = Number(line.item.stock) || 0
            const newStock = revertDirection === 'IN' 
              ? currentStock + quantity 
              : currentStock - quantity

            await tx.item.update({
              where: { id: line.item.id },
              data: { stock: newStock },
            })
          }
        }
      }

      // Create credit note if requested
      if (createCreditNote && existingInvoice.type !== 'CREDIT_NOTE') {
        // Determine credit note type
        const creditNoteType = 'CREDIT_NOTE'
        
        // Get or create series for credit notes
        const seriesId = await getOrCreateDefaultSeries(
          creditNoteType,
          session.user.companyId
        )

        // Generate document number
        const { number, series } = await generateDocumentNumber(
          seriesId,
          session.user.companyId
        )

        // Create credit note
        const creditNote = await tx.invoice.create({
          data: {
            number,
            series,
            type: creditNoteType,
            status: 'FINALIZED',
            date: new Date(),
            notes: `Nota de crédito relativa a ${existingInvoice.number}\nMotivo: ${reason}`,
            subtotal: existingInvoice.subtotal,
            taxAmount: existingInvoice.taxAmount,
            discountAmount: existingInvoice.discountAmount,
            totalAmount: existingInvoice.totalAmount,
            paidAmount: 0,
            customerName: existingInvoice.customerName,
            customerFiscalId: existingInvoice.customerFiscalId,
            customerAddress: existingInvoice.customerAddress,
            customerId: existingInvoice.customerId,
            seriesId,
            companyId: session.user.companyId,
            createdById: session.user.id,
          },
        })

        creditNoteId = creditNote.id

        // Create credit note lines
        for (const line of existingInvoice.lines) {
          await tx.invoiceLineItem.create({
            data: {
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              discount: line.discount,
              taxRate: line.taxRate,
              taxAmount: line.taxAmount,
              total: line.total,
              invoiceId: creditNote.id,
              itemId: line.itemId,
              taxRateId: line.taxRateId,
            },
          })
        }

        // Update series current number
        await tx.documentSeries.update({
          where: { id: seriesId },
          data: { currentNumber: { increment: 1 } },
        })

        // Create stock movement for credit note
        const creditNoteConfig = DOCUMENT_TYPE_CONFIG['CREDIT_NOTE']
        if (creditNoteConfig?.affectsStock) {
          for (const line of existingInvoice.lines) {
            if (line.item && line.item.type === 'PRODUCT') {
              const quantity = Number(line.quantity)
              
              await tx.stockMovement.create({
                data: {
                  type: 'IN',
                  quantity: quantity,
                  reference: creditNote.number,
                  notes: `Entrada - Nota de crédito ${creditNote.number}`,
                  itemId: line.item.id,
                  sourceType: 'INVOICE',
                  sourceId: creditNote.id,
                  companyId: session.user.companyId,
                },
              })

              // Stock was already reverted above, so we don't update again
            }
          }
        }
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: 'UPDATE',
          entityType: 'Invoice',
          entityId: id,
          newValue: { 
            status: 'CANCELLED', 
            action: 'cancel',
            reason,
            creditNoteId,
          },
          userId: session.user.id,
        },
      })
    })

    // Fetch updated invoice
    const updatedInvoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        lines: true,
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
        creditNoteId,
      },
      message: createCreditNote 
        ? 'Documento anulado e nota de crédito criada com sucesso'
        : 'Documento anulado com sucesso',
    })
  } catch (error) {
    console.error('Error cancelling invoice:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao anular documento' },
      { status: 500 }
    )
  }
}
