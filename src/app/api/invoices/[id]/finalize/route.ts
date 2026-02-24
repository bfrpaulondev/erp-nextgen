/**
 * Finalize Invoice API
 * Finalizes a draft document
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { canFinalizeInvoice, DOCUMENT_TYPE_CONFIG } from '@/lib/invoice-utils'

// ===========================================
// POST - Finalize invoice
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
      },
    })

    if (!existingInvoice) {
      return NextResponse.json(
        { success: false, error: 'Documento não encontrado' },
        { status: 404 }
      )
    }

    // Check if can finalize
    if (!canFinalizeInvoice(existingInvoice.status as 'DRAFT' | 'FINALIZED' | 'PENDING' | 'PAID' | 'PARTIAL' | 'CANCELLED')) {
      return NextResponse.json(
        { success: false, error: 'Documento não pode ser finalizado' },
        { status: 400 }
      )
    }

    // Get document configuration
    const docConfig = DOCUMENT_TYPE_CONFIG[existingInvoice.type as keyof typeof DOCUMENT_TYPE_CONFIG]

    // Check stock for products
    if (docConfig?.affectsStock && docConfig.stockDirection === 'OUT') {
      for (const line of existingInvoice.lines) {
        if (line.item && line.item.type === 'PRODUCT') {
          const currentStock = Number(line.item.stock) || 0
          const requiredQuantity = Number(line.quantity)
          
          if (currentStock < requiredQuantity) {
            return NextResponse.json(
              { 
                success: false, 
                error: `Stock insuficiente para "${line.item.name}". Disponível: ${currentStock}, Necessário: ${requiredQuantity}` 
              },
              { status: 400 }
            )
          }
        }
      }
    }

    // Finalize in transaction
    await prisma.$transaction(async (tx) => {
      // Update status
      const newStatus = docConfig?.requiresPayment ? 'PENDING' : 'FINALIZED'
      
      await tx.invoice.update({
        where: { id },
        data: {
          status: newStatus,
        },
      })

      // Update stock if needed
      if (docConfig?.affectsStock && docConfig.stockDirection) {
        for (const line of existingInvoice.lines) {
          if (line.item && line.item.type === 'PRODUCT') {
            const quantity = Number(line.quantity)
            
            // Create stock movement
            await tx.stockMovement.create({
              data: {
                type: docConfig.stockDirection,
                quantity: docConfig.stockDirection === 'OUT' ? -quantity : quantity,
                reference: existingInvoice.number,
                notes: `${docConfig.stockDirection === 'OUT' ? 'Saída' : 'Entrada'} - ${existingInvoice.number}`,
                itemId: line.item.id,
                sourceType: 'INVOICE',
                sourceId: id,
                companyId: session.user.companyId,
              },
            })

            // Update item stock
            const currentStock = Number(line.item.stock) || 0
            const newStock = docConfig.stockDirection === 'OUT' 
              ? currentStock - quantity 
              : currentStock + quantity

            await tx.item.update({
              where: { id: line.item.id },
              data: { stock: newStock },
            })
          }
        }
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: 'UPDATE',
          entityType: 'Invoice',
          entityId: id,
          newValue: { status: newStatus, action: 'finalize' },
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
      },
      message: 'Documento finalizado com sucesso',
    })
  } catch (error) {
    console.error('Error finalizing invoice:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao finalizar documento' },
      { status: 500 }
    )
  }
}
