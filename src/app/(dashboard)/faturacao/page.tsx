'use client'

/**
 * Invoices List Page
 * Displays all invoices and documents
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Plus, 
  Search, 
  FileText, 
  Eye, 
  Edit, 
  Download, 
  Trash2,
  MoreHorizontal,
  Loader2,
  Calendar,
  Filter,
  RefreshCw,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { toast } from 'sonner'
import { formatCurrency, formatDate, DOCUMENT_TYPE_CONFIG, type DocumentType, type DocumentStatus } from '@/lib/invoice-utils'
import { InvoiceStatusBadge } from '@/components/invoices/InvoiceStatusBadge'
import { cn } from '@/lib/utils'

// ===========================================
// Types
// ===========================================

interface Invoice {
  id: string
  number: string
  series: string
  type: DocumentType
  status: DocumentStatus
  date: string
  dueDate?: string
  customerName: string
  customerFiscalId?: string
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  paidAmount: number
  lines: Array<{
    id: string
    description: string
    quantity: number
    unitPrice: number
    total: number
  }>
  customer?: {
    id: string
    name: string
    fiscalId?: string
  }
  seriesRel?: {
    id: string
    prefix: string
    name: string
  }
  paymentCount: number
  createdAt: string
}

// ===========================================
// Component
// ===========================================

export default function FaturacaoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  
  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '')
  const [fromDate, setFromDate] = useState(searchParams.get('fromDate') || '')
  const [toDate, setToDate] = useState(searchParams.get('toDate') || '')
  
  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ===========================================
  // Data Fetching
  // ===========================================

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('pageSize', pageSize.toString())
      
      if (search) params.set('search', search)
      if (typeFilter) params.set('type', typeFilter)
      if (statusFilter) params.set('status', statusFilter)
      if (fromDate) params.set('fromDate', fromDate)
      if (toDate) params.set('toDate', toDate)

      const response = await fetch(`/api/invoices?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar documentos')
      }

      setInvoices(data.data || [])
      setTotal(data.pagination?.total || 0)
    } catch (error) {
      console.error('Error fetching invoices:', error)
      toast.error('Erro ao carregar documentos')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, typeFilter, statusFilter, fromDate, toDate])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  // ===========================================
  // Actions
  // ===========================================

  async function handleDelete() {
    if (!invoiceToDelete) return
    
    setDeleting(true)
    try {
      const response = await fetch(`/api/invoices/${invoiceToDelete.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao eliminar documento')
      }

      toast.success('Documento eliminado com sucesso')
      setDeleteDialogOpen(false)
      setInvoiceToDelete(null)
      fetchInvoices()
    } catch (error) {
      console.error('Error deleting invoice:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao eliminar documento')
    } finally {
      setDeleting(false)
    }
  }

  async function handleDownloadPdf(invoice: Invoice) {
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

  function clearFilters() {
    setSearch('')
    setTypeFilter('')
    setStatusFilter('')
    setFromDate('')
    setToDate('')
  }

  // ===========================================
  // Render
  // ===========================================

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Faturação</h1>
          <p className="text-muted-foreground">
            Gestão de faturas e documentos
          </p>
        </div>
        <Button onClick={() => router.push('/faturacao/novo')}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Documento
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por número ou cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {Object.entries(DOCUMENT_TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.prefix} - {config.namePt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="DRAFT">Rascunho</SelectItem>
                <SelectItem value="FINALIZED">Finalizado</SelectItem>
                <SelectItem value="PENDING">Pendente</SelectItem>
                <SelectItem value="PARTIAL">Parcial</SelectItem>
                <SelectItem value="PAID">Pago</SelectItem>
                <SelectItem value="CANCELLED">Anulado</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full md:w-[150px]"
              placeholder="De"
            />

            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full md:w-[150px]"
              placeholder="Até"
            />

            <Button variant="outline" onClick={clearFilters}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <FileText className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum documento encontrado</p>
              <p className="text-sm">Crie um novo documento para começar</p>
              <Button className="mt-4" onClick={() => router.push('/faturacao/novo')}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Documento
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id} className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/faturacao/${invoice.id}`)}>
                      <TableCell className="font-medium">
                        {invoice.number}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {DOCUMENT_TYPE_CONFIG[invoice.type as keyof typeof DOCUMENT_TYPE_CONFIG]?.prefix || invoice.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{invoice.customerName}</div>
                          {invoice.customerFiscalId && (
                            <div className="text-xs text-muted-foreground">
                              NIF: {invoice.customerFiscalId}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(invoice.date)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(invoice.totalAmount, session?.user?.company?.currency as 'EUR' | 'AOA')}
                      </TableCell>
                      <TableCell>
                        <InvoiceStatusBadge status={invoice.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/faturacao/${invoice.id}`)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Ver
                            </DropdownMenuItem>
                            {invoice.status === 'DRAFT' && (
                              <DropdownMenuItem onClick={() => router.push(`/faturacao/${invoice.id}/editar`)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDownloadPdf(invoice)}>
                              <Download className="w-4 h-4 mr-2" />
                              Download PDF
                            </DropdownMenuItem>
                            {invoice.status === 'DRAFT' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setInvoiceToDelete(invoice)
                                    setDeleteDialogOpen(true)
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, total)} de {total} documentos
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar documento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja eliminar o documento <strong>{invoiceToDelete?.number}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
