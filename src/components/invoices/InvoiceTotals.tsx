'use client'

/**
 * Invoice Totals Component
 * Displays invoice totals with calculations
 */

import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/invoice-utils'

interface InvoiceTotalsProps {
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  paidAmount?: number
  currency?: 'EUR' | 'AOA'
  showPaid?: boolean
}

export function InvoiceTotals({
  subtotal,
  taxAmount,
  discountAmount,
  totalAmount,
  paidAmount = 0,
  currency = 'EUR',
  showPaid = false,
}: InvoiceTotalsProps) {
  const outstanding = totalAmount - paidAmount

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(subtotal, currency)}</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Desconto</span>
              <span className="text-red-600">
                -{formatCurrency(discountAmount, currency)}
              </span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">IVA</span>
            <span>{formatCurrency(taxAmount, currency)}</span>
          </div>

          <Separator className="my-2" />

          <div className="flex justify-between font-semibold text-lg">
            <span>Total</span>
            <span>{formatCurrency(totalAmount, currency)}</span>
          </div>

          {showPaid && paidAmount > 0 && (
            <>
              <Separator className="my-2" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pago</span>
                <span className="text-green-600">
                  {formatCurrency(paidAmount, currency)}
                </span>
              </div>
              {outstanding > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Em dívida</span>
                  <span className="text-orange-600">
                    {formatCurrency(outstanding, currency)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
