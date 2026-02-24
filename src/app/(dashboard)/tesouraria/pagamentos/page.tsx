'use client'

/**
 * Payments List Page
 * Manage receipts and payments
 */

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Plus,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Eye,
  Trash2,
  Filter,
  Calendar,
  Download,
  RefreshCw,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface Payment {
  id: string
  number: string
  type: 'RECEIPT' | 'PAYMENT'
  date: string
  amount: number
  method: string
  reference: string | null
  notes: string | null
  customer: {
    id: string
    name: string
    fiscalId: string | null
  } | null
  invoice: {
    id: string
    number: string
    type: string
  } | null
  createdBy: string | null
}

const methodLabels: Record<string, { label: string; color: string }> = {
  CASH: { label: 'Dinheiro', color: 'bg-green-100 text-green-800' },
  BANK_TRANSFER: { label: 'Transferência', color: 'bg-blue-100 text-blue-800' },
  CARD: { label: 'Cartão', color: 'bg-purple-100 text-purple-800' },
  CHECK: { label: 'Cheque', color: 'bg-amber-100 text-amber-800' },
  DIRECT_DEBIT: { label: 'Débito Direto', color: 'bg-cyan-100 text-cyan-800' },
  MBWAY: { label: 'MB WAY', color: 'bg-pink-100 text-pink-800' },
  OTHER: { label: 'Outro', color: 'bg-gray-100 text-gray-800' },
}

export default function PagamentosPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<Payment[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  
  // Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '')
  const [methodFilter, setMethodFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  
  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  
  // View details
  const [viewPayment, setViewPayment] = useState<Payment | null>(null)
  const [exporting, setExporting] = useState(false)

  const currency = session?.user?.company?.currency as 'EUR' | 'AOA'

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('pageSize', pageSize.toString())
      
      if (search) params.set('search', search)
      if (typeFilter) params.set('type', typeFilter)
      if (methodFilter) params.set('method', methodFilter)
      if (fromDate) params.set('fromDate', fromDate)
      if (toDate) params.set('toDate', toDate)

      const response = await fetch(`/api/payments?${params}`)
      const data = await response.json()

      if (data.success) {
        setPayments(data.data)
        setTotal(data.pagination.total)
      } else {
        toast.error(data.error || 'Erro ao carregar pagamentos')
      }
    } catch {
      toast.error('Erro ao carregar pagamentos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [page, typeFilter, methodFilter, fromDate, toDate])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== undefined) fetchPayments()
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const handleDelete = async () => {
    if (!deleteId) return
    
    setDeleting(true)
    try {
      const response = await fetch(`/api/payments/${deleteId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Pagamento eliminado com sucesso')
        fetchPayments()
      } else {
        toast.error(data.error || 'Erro ao eliminar pagamento')
      }
    } catch {
      toast.error('Erro ao eliminar pagamento')
    } finally {
      setDeleteId(null)
      setDeleting(false)
    }
  }

  const clearFilters = () => {
    setSearch('')
    setTypeFilter('')
    setMethodFilter('')
    setFromDate('')
    setToDate('')
  }
  
  const handleExport = async (payment: Payment) => {
    setExporting(true)
    try {
      const response = await fetch(`/api/payments/${payment.id}/receipt`)
      
      if (!response.ok) {
        throw new Error('Erro ao gerar recibo')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = window.document.createElement('a')
      a.href = url
      a.download = `${payment.number}.pdf`
      window.document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
      
      toast.success('Recibo exportado com sucesso')
    } catch (error) {
      console.error('Error exporting payment:', error)
      toast.error('Erro ao exportar recibo')
    } finally {
      setExporting(false)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pagamentos</h1>
          <p className="text-muted-foreground">
            Gestão de recebimentos e pagamentos
          </p>
        </div>
        <Button asChild>
          <Link href="/tesouraria/pagamentos/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo Lançamento
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recebimentos</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(
                payments.filter(p => p.type === 'RECEIPT').reduce((sum, p) => sum + p.amount, 0),
                currency
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pagamentos</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(
                payments.filter(p => p.type === 'PAYMENT').reduce((sum, p) => sum + p.amount, 0),
                currency
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Líquido</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                payments.filter(p => p.type === 'RECEIPT').reduce((sum, p) => sum + p.amount, 0) -
                payments.filter(p => p.type === 'PAYMENT').reduce((sum, p) => sum + p.amount, 0),
                currency
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por número ou referência..."
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
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="RECEIPT">Recebimentos</SelectItem>
                <SelectItem value="PAYMENT">Pagamentos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={methodFilter || "all"} onValueChange={(v) => setMethodFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os métodos</SelectItem>
                {Object.entries(methodLabels).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.label}
                  </SelectItem>
                ))}
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
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Calendar className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum pagamento encontrado</p>
              <p className="text-sm">Registe um novo pagamento para começar</p>
              <Button className="mt-4" asChild>
                <Link href="/tesouraria/pagamentos/novo">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Lançamento
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Fatura</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.number}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {payment.type === 'RECEIPT' ? (
                            <ArrowUpRight className="h-4 w-4 text-green-500" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-500" />
                          )}
                          {payment.type === 'RECEIPT' ? 'Recebimento' : 'Pagamento'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(payment.date)}
                      </TableCell>
                      <TableCell>
                        {payment.customer ? (
                          <div>
                            <p className="font-medium">{payment.customer.name}</p>
                            {payment.customer.fiscalId && (
                              <p className="text-xs text-muted-foreground">
                                NIF: {payment.customer.fiscalId}
                              </p>
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={methodLabels[payment.method]?.color || ''}>
                          {methodLabels[payment.method]?.label || payment.method}
                        </Badge>
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-medium",
                        payment.type === 'RECEIPT' ? "text-green-600" : "text-red-600"
                      )}>
                        {payment.type === 'RECEIPT' ? '+' : '-'}
                        {formatCurrency(payment.amount, currency)}
                      </TableCell>
                      <TableCell>
                        {payment.invoice ? (
                          <Link 
                            href={`/faturacao/${payment.invoice.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {payment.invoice.number}
                          </Link>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewPayment(payment)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleExport(payment)}
                              disabled={exporting}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Exportar PDF
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => setDeleteId(payment.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
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
            Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, total)} de {total} registos
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
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar pagamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O pagamento será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'A eliminar...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Details Dialog */}
      <Dialog open={!!viewPayment} onOpenChange={() => setViewPayment(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {viewPayment?.number}
            </DialogTitle>
            <DialogDescription>
              {viewPayment?.type === 'RECEIPT' ? 'Recebimento' : 'Pagamento'}
            </DialogDescription>
          </DialogHeader>
          {viewPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p className="font-medium">{formatDate(viewPayment.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor</p>
                  <p className={cn(
                    "font-medium text-lg",
                    viewPayment.type === 'RECEIPT' ? "text-green-600" : "text-red-600"
                  )}>
                    {formatCurrency(viewPayment.amount, currency)}
                  </p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Método</p>
                <Badge className={methodLabels[viewPayment.method]?.color || ''}>
                  {methodLabels[viewPayment.method]?.label || viewPayment.method}
                </Badge>
              </div>
              
              {viewPayment.customer && (
                <div>
                  <p className="text-sm text-muted-foreground">Entidade</p>
                  <p className="font-medium">{viewPayment.customer.name}</p>
                  {viewPayment.customer.fiscalId && (
                    <p className="text-sm text-muted-foreground">NIF: {viewPayment.customer.fiscalId}</p>
                  )}
                </div>
              )}
              
              {viewPayment.invoice && (
                <div>
                  <p className="text-sm text-muted-foreground">Fatura Relacionada</p>
                  <Link 
                    href={`/faturacao/${viewPayment.invoice.id}`}
                    className="text-blue-600 hover:underline"
                    onClick={() => setViewPayment(null)}
                  >
                    {viewPayment.invoice.number}
                  </Link>
                </div>
              )}
              
              {viewPayment.reference && (
                <div>
                  <p className="text-sm text-muted-foreground">Referência</p>
                  <p className="font-medium">{viewPayment.reference}</p>
                </div>
              )}
              
              {viewPayment.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notas</p>
                  <p className="font-medium">{viewPayment.notes}</p>
                </div>
              )}
              
              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => handleExport(viewPayment)}
                  disabled={exporting}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Exportar PDF
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1"
                  onClick={() => {
                    setViewPayment(null)
                    setDeleteId(viewPayment.id)
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
