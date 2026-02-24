'use client'

/**
 * Invoice View Page
 * View invoice details
 */

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft, 
  Edit, 
  Download, 
  Send, 
  XCircle,
  Loader2,
  FileText,
  Calendar,
  User,
  Building,
  CreditCard,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate, DOCUMENT_TYPE_CONFIG, canEditInvoice, canCancelInvoice } from '@/lib/invoice-utils'
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceStatusBadge'
import { InvoiceItemList } from '@/components/invoices/InvoiceItemList'
import { InvoiceTotals } from '@/components/invoices/InvoiceTotals'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

// ===========================================
// Types
// ===========================================

interface Invoice {
  id: string
  number: string
  series: string
  type: string
  status: string
  date: string
  dueDate?: string
  notes?: string
  internalNotes?: string
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  paidAmount: number
  customerName: string
  customerFiscalId?: string
  customerAddress?: string
  customerId?: string
  createdAt: string
  updatedAt: string
  customer?: {
    id: string
    name: string
    fiscalId?: string
    email?: string
    phone?: string
    address?: string
    city?: string
    postalCode?: string
  }
  seriesRel?: {
    id: string
    prefix: string
    name: string
  }
  lines: Array<{
    id: string
    description: string
    quantity: number
    unitPrice: number
    discount: number
    taxRate: number
    taxAmount: number
    total: number
    itemId?: string
    item?: {
      id: string
      code: string
      name: string
      type: string
      unit: string
    }
    taxRateRel?: {
      id: string
      name: string
      rate: number
    }
  }>
  payments: Array<{
    id: string
    number: string
    date: string
    amount: number
    method: string
    reference?: string
    notes?: string
  }>
  createdBy?: {
    id: string
    name?: string
    email: string
  }
}

// ===========================================
// Component
// ===========================================

export default function FaturaViewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { data: session } = useSession()
  
  const [loading, setLoading] = useState(true)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  
  // Cancel dialog
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [createCreditNote, setCreateCreditNote] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  
  // Finalize
  const [finalizing, setFinalizing] = useState(false)

  // ===========================================
  // Data Fetching
  // ===========================================

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

      setInvoice(data.data)
    } catch (error) {
      console.error('Error fetching invoice:', error)
      toast.error('Erro ao carregar documento')
      router.push('/faturacao')
    } finally {
      setLoading(false)
    }
  }

  // ===========================================
  // Actions
  // ===========================================

  async function handleFinalize() {
    if (!invoice) return
    
    setFinalizing(true)
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/finalize`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao finalizar documento')
      }

      toast.success('Documento finalizado com sucesso')
      fetchInvoice()
    } catch (error) {
      console.error('Error finalizing invoice:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao finalizar documento')
    } finally {
      setFinalizing(false)
    }
  }

  async function handleCancel() {
    if (!invoice) return
    
    setCancelling(true)
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: cancelReason,
          createCreditNote,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao anular documento')
      }

      toast.success(
        createCreditNote 
          ? 'Documento anulado e nota de crédito criada'
          : 'Documento anulado com sucesso'
      )
      setCancelDialogOpen(false)
      fetchInvoice()
    } catch (error) {
      console.error('Error cancelling invoice:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao anular documento')
    } finally {
      setCancelling(false)
    }
  }

  async function handleDownloadPdf() {
    if (!invoice) return
    
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/pdf`)
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao gerar PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = window.document.createElement('a')
      a.href = url
      a.download = `${invoice.number.replace(/\s+/g, '_')}.pdf`
      window.document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast.error('Erro ao gerar PDF')
    }
  }

  // ===========================================
  // Render
  // ===========================================

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
        <FileText className="w-12 h-12 mb-4 text-muted-foreground opacity-50" />
        <p className="text-lg font-medium">Documento não encontrado</p>
        <Button className="mt-4" onClick={() => router.push('/faturacao')}>
          Voltar à lista
        </Button>
      </div>
    )
  }

  const docConfig = DOCUMENT_TYPE_CONFIG[invoice.type as keyof typeof DOCUMENT_TYPE_CONFIG]
  const isDraft = invoice.status === 'DRAFT'
  const canEdit = canEditInvoice(invoice.status as any)
  const canCancel = canCancelInvoice(invoice.status as any)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/faturacao')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{invoice.number}</h1>
              <Badge variant="outline" className="font-mono">
                {docConfig?.prefix || invoice.type}
              </Badge>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <p className="text-muted-foreground">
              {docConfig?.namePt || 'Documento'} • Criado em {formatDate(invoice.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleDownloadPdf}>
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
          
          {canEdit && (
            <Button variant="outline" onClick={() => router.push(`/faturacao/${invoice.id}/editar`)}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
          )}
          
          {isDraft && (
            <Button onClick={handleFinalize} disabled={finalizing}>
              {finalizing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Finalizar
            </Button>
          )}
          
          {canCancel && (
            <Button 
              variant="destructive" 
              onClick={() => setCancelDialogOpen(true)}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Anular
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-4 h-4" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{invoice.customerName}</p>
                </div>
                {invoice.customerFiscalId && (
                  <div>
                    <p className="text-sm text-muted-foreground">NIF</p>
                    <p className="font-medium">{invoice.customerFiscalId}</p>
                  </div>
                )}
                {invoice.customerAddress && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">Morada</p>
                    <p className="font-medium">{invoice.customerAddress}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Datas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Data do Documento</p>
                  <p className="font-medium">{formatDate(invoice.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data de Vencimento</p>
                  <p className="font-medium">{invoice.dueDate ? formatDate(invoice.dueDate) : '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Itens</CardTitle>
            </CardHeader>
            <CardContent>
              <InvoiceItemList 
                lines={invoice.lines} 
                currency={session?.user?.company?.currency as 'EUR' | 'AOA'} 
              />
            </CardContent>
          </Card>

          {/* Notes */}
          {(invoice.notes || invoice.internalNotes) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {invoice.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Observações</p>
                    <p className="whitespace-pre-wrap">{invoice.notes}</p>
                  </div>
                )}
                {invoice.internalNotes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Notas Internas</p>
                    <p className="whitespace-pre-wrap text-muted-foreground">{invoice.internalNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payments */}
          {invoice.payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Pagamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invoice.payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">{payment.number}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(payment.date)} • {payment.method}
                        </p>
                      </div>
                      <p className="font-medium text-green-600">
                        {formatCurrency(payment.amount, session?.user?.company?.currency as 'EUR' | 'AOA')}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Totals */}
        <div className="space-y-6">
          <InvoiceTotals
            subtotal={invoice.subtotal}
            taxAmount={invoice.taxAmount}
            discountAmount={invoice.discountAmount}
            totalAmount={invoice.totalAmount}
            paidAmount={invoice.paidAmount}
            currency={session?.user?.company?.currency as 'EUR' | 'AOA'}
            showPaid={invoice.paidAmount > 0}
          />

          {/* Series Info */}
          {invoice.seriesRel && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Série</p>
                    <p className="font-medium">{invoice.seriesRel.name}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Created By */}
          {invoice.createdBy && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Criado por</p>
                    <p className="font-medium">{invoice.createdBy.name || invoice.createdBy.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Cancel Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anular documento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja anular o documento <strong>{invoice.number}</strong>?
              {createCreditNote && (
                <span className="block mt-2">
                  Será criada uma nota de crédito no valor do documento.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Motivo da anulação</Label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Indique o motivo da anulação..."
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="createCreditNote"
                checked={createCreditNote}
                onChange={(e) => setCreateCreditNote(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="createCreditNote" className="text-sm font-normal">
                Criar nota de crédito
              </Label>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Anular Documento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
