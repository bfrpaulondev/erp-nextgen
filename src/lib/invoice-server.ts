/**
 * Invoice Server Operations
 * Database operations for invoices - SERVER ONLY
 */

import 'server-only'
import prisma from './prisma'
import { 
  DocumentType, 
  DOCUMENT_TYPE_CONFIG,
  InvoiceLineInput,
  InvoiceLineCalculation,
  roundToTwo,
  calculateLineTotal,
} from './invoice-utils'

// ===========================================
// Database Operations
// ===========================================

/**
 * Calculate all invoice totals from line items
 */
export async function calculateInvoiceTotals(
  lines: InvoiceLineInput[],
  companyId: string
): Promise<{
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  lines: InvoiceLineCalculation[]
}> {
  const calculatedLines: InvoiceLineCalculation[] = []
  let subtotal = 0
  let discountAmount = 0
  let taxAmount = 0

  // Get all tax rates for the company
  const taxRates = await prisma.taxRate.findMany({
    where: { companyId },
  })
  const taxRateMap = new Map(taxRates.map(tr => [tr.id, tr]))

  for (const line of lines) {
    // Get tax rate
    let taxRatePercent = 0
    let taxRateRecord = null
    
    if (line.taxRateId) {
      taxRateRecord = taxRateMap.get(line.taxRateId)
      if (taxRateRecord) {
        taxRatePercent = Number(taxRateRecord.rate)
      }
    }

    // Calculate line totals
    const lineCalc = calculateLineTotal(
      line.quantity,
      line.unitPrice,
      line.discount || 0,
      taxRatePercent
    )

    const calculatedLine: InvoiceLineCalculation = {
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discount: line.discount || 0,
      taxRateId: line.taxRateId || null,
      taxRate: taxRatePercent,
      taxAmount: lineCalc.taxAmount,
      subtotal: lineCalc.subtotal,
      total: lineCalc.total,
    }

    calculatedLines.push(calculatedLine)
    subtotal += lineCalc.subtotal
    discountAmount += lineCalc.discountAmount
    taxAmount += lineCalc.taxAmount
  }

  return {
    subtotal: roundToTwo(subtotal),
    discountAmount: roundToTwo(discountAmount),
    taxAmount: roundToTwo(taxAmount),
    totalAmount: roundToTwo(subtotal - discountAmount + taxAmount),
    lines: calculatedLines,
  }
}

/**
 * Generate next document number for a series
 */
export async function generateDocumentNumber(
  seriesId: string,
  companyId: string
): Promise<{ number: string; series: string }> {
  const series = await prisma.documentSeries.findFirst({
    where: { id: seriesId, companyId },
  })

  if (!series) {
    throw new Error('Série não encontrada')
  }

  if (!series.isActive) {
    throw new Error('Série inativa')
  }

  // Increment the current number
  const nextNumber = series.currentNumber + 1
  
  // Generate document number: PREFIX YEAR/NNNNN (e.g., FT 2024/00001)
  const formattedNumber = `${series.prefix} ${series.year}/${String(nextNumber).padStart(5, '0')}`

  return {
    number: formattedNumber,
    series: series.prefix,
  }
}

/**
 * Get or create default series for a document type
 */
export async function getOrCreateDefaultSeries(
  type: DocumentType,
  companyId: string,
  year: number = new Date().getFullYear()
): Promise<string> {
  const config = DOCUMENT_TYPE_CONFIG[type]
  
  // Try to find existing active series
  let series = await prisma.documentSeries.findFirst({
    where: {
      type,
      year,
      companyId,
      isActive: true,
    },
  })

  if (!series) {
    // Create new series
    series = await prisma.documentSeries.create({
      data: {
        type,
        prefix: config.prefix,
        name: `${config.namePt} ${year}`,
        year,
        currentNumber: 0,
        isActive: true,
        companyId,
      },
    })
  }

  return series.id
}

/**
 * Update stock for invoice items
 */
export async function updateStockForInvoice(
  invoiceId: string,
  companyId: string,
  direction: 'IN' | 'OUT'
): Promise<void> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, companyId },
    include: {
      lines: {
        include: {
          item: true,
        },
      },
    },
  })

  if (!invoice) {
    throw new Error('Documento não encontrado')
  }

  for (const line of invoice.lines) {
    if (line.item && line.item.type === 'PRODUCT') {
      const quantity = Number(line.quantity)
      
      // Create stock movement
      await prisma.stockMovement.create({
        data: {
          type: direction,
          quantity: direction === 'OUT' ? -quantity : quantity,
          reference: invoice.number,
          notes: `${direction === 'OUT' ? 'Saída' : 'Entrada'} - ${invoice.number}`,
          itemId: line.item.id,
          sourceType: 'INVOICE',
          sourceId: invoiceId,
          companyId,
        },
      })

      // Update item stock
      const currentStock = Number(line.item.stock) || 0
      const newStock = direction === 'OUT' 
        ? currentStock - quantity 
        : currentStock + quantity

      await prisma.item.update({
        where: { id: line.item.id },
        data: { stock: newStock },
      })
    }
  }
}
