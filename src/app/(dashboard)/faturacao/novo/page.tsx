'use client'

/**
 * New Invoice Page
 * Create a new invoice/document
 */

import { useRouter } from 'next/navigation'
import { InvoiceForm } from '@/components/invoices/InvoiceForm'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function NovaFaturaPage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/faturacao')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Novo Documento</h1>
          <p className="text-muted-foreground">
            Criar novo documento de faturação
          </p>
        </div>
      </div>

      {/* Form */}
      <InvoiceForm mode="create" />
    </div>
  )
}
