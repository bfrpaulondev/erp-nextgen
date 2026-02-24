'use client'

/**
 * Invoice Status Badge Component
 * Displays invoice status with appropriate styling
 */

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { DOCUMENT_STATUS_CONFIG } from '@/lib/invoice-utils'
import type { DocumentStatus } from '@/lib/invoice-utils'

interface InvoiceStatusBadgeProps {
  status: DocumentStatus | string
  className?: string
}

export function InvoiceStatusBadge({ status, className }: InvoiceStatusBadgeProps) {
  const config = DOCUMENT_STATUS_CONFIG[status as DocumentStatus]

  if (!config) {
    return (
      <Badge variant="outline" className={className}>
        {status}
      </Badge>
    )
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium border-0',
        config.bgColor,
        config.color,
        className
      )}
    >
      {config.namePt}
    </Badge>
  )
}
