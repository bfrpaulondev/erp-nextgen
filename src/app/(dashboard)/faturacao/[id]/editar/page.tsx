'use client'

/**
 * Edit Invoice Page
 * Edit an existing draft invoice
 */

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { InvoiceForm } from '@/components/invoices/InvoiceForm'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Invoice {
  id: string
  type: string
  seriesId?: string
  customerId?: string
  customerName: string
  customerFiscalId?: string
  customerAddress?: string
  date: string
  dueDate?: string
  notes?: string
  internalNotes?: string
  status: string
  lines: Array<{
    id: string
    itemId?: string
    description: string
    quantity: number
    unitPrice: number
    discount: number
    taxRateId?: string
    taxRate: number
    taxAmount: number
    total: number
  }>
}

export default function EditarFaturaPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [invoice, setInvoice] = useState<Invoice | null>(null)

  useEffect(() => {
    fetchInvoice()
  }, [resolvedParams.id])

  async function fetchInvoice() {
    setLoading(true)
    try {
      const response = await fetch(`/api/invoices/${resolvedParams.id}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar documento')
      }

      // Check if can edit
      if (data.data.status !== 'DRAFT') {
        toast.error('Apenas rascunhos podem ser editados')
        router.push(`/faturacao/${resolvedParams.id}`)
        return
      }

      setInvoice(data.data)
    } catch (error) {
      console.error('Error fetching invoice:', error)
      toast.error('Erro ao carregar documento')
      router.push('/faturacao')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-lg font-medium">Documento não encontrado</p>
        <Button className="mt-4" onClick={() => router.push('/faturacao')}>
          Voltar à lista
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/faturacao/${resolvedParams.id}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Editar Documento</h1>
          <p className="text-muted-foreground">
            Editar rascunho de documento
          </p>
        </div>
      </div>

      {/* Form */}
      <InvoiceForm 
        invoiceId={invoice.id}
        initialData={{
          type: invoice.type as any,
          seriesId: invoice.seriesId,
          customerId: invoice.customerId,
          customerName: invoice.customerName,
          customerFiscalId: invoice.customerFiscalId,
          customerAddress: invoice.customerAddress,
          date: invoice.date.split('T')[0],
          dueDate: invoice.dueDate?.split('T')[0],
          notes: invoice.notes,
          internalNotes: invoice.internalNotes,
          lines: invoice.lines.map(line => ({
            id: line.id,
            itemId: line.itemId,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discount: line.discount,
            taxRateId: line.taxRateId,
            taxRate: line.taxRate,
            taxAmount: line.taxAmount,
            total: line.total,
          })),
        }}
        mode="edit"
      />
    </div>
  )
}
