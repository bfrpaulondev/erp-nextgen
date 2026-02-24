'use client'

/**
 * Invoice Item List Component
 * Displays invoice line items in a table
 */

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/lib/invoice-utils'
import type { InvoiceLineItemDTO } from '@/types'

interface InvoiceItemListProps {
  lines: InvoiceLineItemDTO[]
  currency?: 'EUR' | 'AOA'
}

export function InvoiceItemList({ lines, currency = 'EUR' }: InvoiceItemListProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-center">#</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="text-right w-20">Qtd</TableHead>
            <TableHead className="text-right w-28">Preço</TableHead>
            <TableHead className="text-right w-20">Desc%</TableHead>
            <TableHead className="text-right w-20">IVA%</TableHead>
            <TableHead className="text-right w-28">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                Nenhum item adicionado
              </TableCell>
            </TableRow>
          ) : (
            lines.map((line, index) => (
              <TableRow key={line.id || index}>
                <TableCell className="text-center">{index + 1}</TableCell>
                <TableCell className="font-medium">{line.description}</TableCell>
                <TableCell className="text-right">{line.quantity.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(line.unitPrice, currency)}
                </TableCell>
                <TableCell className="text-right">{line.discount.toFixed(1)}%</TableCell>
                <TableCell className="text-right">{line.taxRate.toFixed(1)}%</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(line.total, currency)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
