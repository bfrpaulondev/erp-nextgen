/**
 * Invoice Utilities
 * Functions for invoice calculations, numbering, and validations
 * CLIENT-SAFE: Can be imported in client components
 */

import { Decimal } from '@prisma/client/runtime/library'

// ===========================================
// Types
// ===========================================

export interface InvoiceLineInput {
  itemId?: string
  description: string
  quantity: number
  unitPrice: number
  discount?: number // Percentage (0-100)
  taxRateId?: string
}

export interface InvoiceLineCalculation {
  description: string
  quantity: number
  unitPrice: number
  discount: number
  taxRateId: string | null
  taxRate: number
  taxAmount: number
  subtotal: number
  total: number
}

export interface InvoiceTotals {
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  lines: InvoiceLineCalculation[]
}

export type DocumentType = 
  | 'INVOICE'
  | 'INVOICE_RECEIPT'
  | 'DEBIT_NOTE'
  | 'CREDIT_NOTE'
  | 'RECEIPT'
  | 'QUOTE'

export type DocumentStatus = 
  | 'DRAFT'
  | 'FINALIZED'
  | 'PENDING'
  | 'PAID'
  | 'PARTIAL'
  | 'CANCELLED'

// ===========================================
// Document Type Configuration
// ===========================================

export const DOCUMENT_TYPE_CONFIG: Record<DocumentType, {
  prefix: string
  name: string
  namePt: string
  affectsStock: boolean
  stockDirection: 'IN' | 'OUT' | null
  requiresPayment: boolean
}> = {
  INVOICE: {
    prefix: 'FT',
    name: 'Invoice',
    namePt: 'Fatura',
    affectsStock: true,
    stockDirection: 'OUT',
    requiresPayment: false,
  },
  INVOICE_RECEIPT: {
    prefix: 'FR',
    name: 'Invoice Receipt',
    namePt: 'Fatura-Recibo',
    affectsStock: true,
    stockDirection: 'OUT',
    requiresPayment: true,
  },
  DEBIT_NOTE: {
    prefix: 'ND',
    name: 'Debit Note',
    namePt: 'Nota de Débito',
    affectsStock: false,
    stockDirection: null,
    requiresPayment: false,
  },
  CREDIT_NOTE: {
    prefix: 'NC',
    name: 'Credit Note',
    namePt: 'Nota de Crédito',
    affectsStock: true,
    stockDirection: 'IN',
    requiresPayment: false,
  },
  RECEIPT: {
    prefix: 'RC',
    name: 'Receipt',
    namePt: 'Recibo',
    affectsStock: false,
    stockDirection: null,
    requiresPayment: true,
  },
  QUOTE: {
    prefix: 'OR',
    name: 'Quote',
    namePt: 'Orçamento',
    affectsStock: false,
    stockDirection: null,
    requiresPayment: false,
  },
}

export const DOCUMENT_STATUS_CONFIG: Record<DocumentStatus, {
  name: string
  namePt: string
  color: string
  bgColor: string
}> = {
  DRAFT: {
    name: 'Draft',
    namePt: 'Rascunho',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  FINALIZED: {
    name: 'Finalized',
    namePt: 'Finalizado',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  PENDING: {
    name: 'Pending',
    namePt: 'Pendente',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
  PARTIAL: {
    name: 'Partial',
    namePt: 'Parcial',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  PAID: {
    name: 'Paid',
    namePt: 'Pago',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  CANCELLED: {
    name: 'Cancelled',
    namePt: 'Anulado',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
}

// ===========================================
// Calculation Functions
// ===========================================

/**
 * Calculate line totals
 */
export function calculateLineTotal(
  quantity: number,
  unitPrice: number,
  discountPercent: number = 0,
  taxRatePercent: number = 0
): { subtotal: number; discountAmount: number; taxAmount: number; total: number } {
  const subtotal = quantity * unitPrice
  const discountAmount = subtotal * (discountPercent / 100)
  const taxableAmount = subtotal - discountAmount
  const taxAmount = taxableAmount * (taxRatePercent / 100)
  const total = taxableAmount + taxAmount

  return {
    subtotal: roundToTwo(subtotal),
    discountAmount: roundToTwo(discountAmount),
    taxAmount: roundToTwo(taxAmount),
    total: roundToTwo(total),
  }
}

/**
 * Round to two decimal places
 */
export function roundToTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100
}

// ===========================================
// Validation Functions
// ===========================================

/**
 * Validate invoice data
 */
export function validateInvoiceData(data: {
  type: DocumentType
  customerId?: string
  customerName?: string
  lines: InvoiceLineInput[]
}): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Validate customer
  if (!data.customerId && !data.customerName) {
    errors.push('Cliente é obrigatório')
  }

  // Validate lines
  if (!data.lines || data.lines.length === 0) {
    errors.push('Documento deve ter pelo menos uma linha')
  }

  for (let i = 0; i < data.lines.length; i++) {
    const line = data.lines[i]
    
    if (!line.description || line.description.trim() === '') {
      errors.push(`Linha ${i + 1}: Descrição é obrigatória`)
    }
    
    if (line.quantity <= 0) {
      errors.push(`Linha ${i + 1}: Quantidade deve ser maior que zero`)
    }
    
    if (line.unitPrice < 0) {
      errors.push(`Linha ${i + 1}: Preço unitário não pode ser negativo`)
    }
    
    if (line.discount && (line.discount < 0 || line.discount > 100)) {
      errors.push(`Linha ${i + 1}: Desconto deve estar entre 0 e 100%`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Check if invoice can be edited
 */
export function canEditInvoice(status: DocumentStatus): boolean {
  return status === 'DRAFT'
}

/**
 * Check if invoice can be finalized
 */
export function canFinalizeInvoice(status: DocumentStatus): boolean {
  return status === 'DRAFT'
}

/**
 * Check if invoice can be cancelled
 */
export function canCancelInvoice(status: DocumentStatus): boolean {
  return status !== 'CANCELLED' && status !== 'DRAFT'
}

/**
 * Check if invoice can be paid
 */
export function canPayInvoice(status: DocumentStatus): boolean {
  return status === 'FINALIZED' || status === 'PENDING' || status === 'PARTIAL'
}

// ===========================================
// Format Functions
// ===========================================

/**
 * Format currency based on company country
 */
export function formatCurrency(
  amount: number | Decimal,
  currency: 'EUR' | 'AOA' = 'EUR'
): string {
  const numAmount = typeof amount === 'object' ? Number(amount) : amount
  
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: currency,
  }).format(numAmount)
}

/**
 * Format document type for display
 */
export function formatDocumentType(type: DocumentType): string {
  return DOCUMENT_TYPE_CONFIG[type]?.namePt || type
}

/**
 * Format document status for display
 */
export function formatDocumentStatus(status: DocumentStatus): string {
  return DOCUMENT_STATUS_CONFIG[status]?.namePt || status
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

/**
 * Format date time for display
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

// ===========================================
// Payment Functions
// ===========================================

/**
 * Calculate payment status for an invoice
 */
export function calculatePaymentStatus(
  totalAmount: number,
  paidAmount: number
): DocumentStatus {
  if (paidAmount === 0) {
    return 'PENDING'
  } else if (paidAmount < totalAmount) {
    return 'PARTIAL'
  } else {
    return 'PAID'
  }
}

/**
 * Get payment method display name
 */
export function formatPaymentMethod(method: string): string {
  const methods: Record<string, string> = {
    CASH: 'Dinheiro',
    BANK_TRANSFER: 'Transferência Bancária',
    CARD: 'Cartão',
    CHECK: 'Cheque',
    OTHER: 'Outro',
  }
  return methods[method] || method
}
