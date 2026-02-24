'use client'

/**
 * Dashboard Page
 * Main dashboard for ERP Next-Gen with real data
 */

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  DollarSign,
  Euro,
  Users,
  FileText,
  Package,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, getCurrencySymbol, formatDate } from '@/lib/formatters'
import { toast } from 'sonner'

// ===========================================
// Types
// ===========================================

interface DashboardData {
  summary: {
    totalInvoices: number
    totalCustomers: number
    totalSuppliers: number
    totalItems: number
    pendingAmount: number
    overdueAmount: number
    monthlyRevenue: number
    monthlyExpenses: number
  }
  pendingInvoices: Array<{
    id: string
    number: string
    customerName: string
    totalAmount: number
    paidAmount: number
    dueAmount: number
    dueDate: string | null
  }>
  alerts: {
    overdueInvoices: Array<{
      id: string
      number: string
      customerName: string
      totalAmount: number
    }>
    lowStockItems: Array<{
      id: string
      code: string
      name: string
      stock: number | null
      minStock: number | null
    }>
    draftInvoices: number
  }
}

// ===========================================
// Component
// ===========================================

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)

  const user = session?.user
  const company = user?.company
  const currency = (company?.currency || 'EUR') as 'EUR' | 'AOA'

  // ===========================================
  // Data Fetching
  // ===========================================

  const fetchDashboardData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/dashboard')
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao carregar dados')
      }

      setData(result.data)
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
      toast.error('Erro ao carregar dados do dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      fetchDashboardData()
    }
  }, [status])

  // ===========================================
  // Helpers
  // ===========================================

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      PAID: { variant: 'default', label: 'Pago' },
      PENDING: { variant: 'secondary', label: 'Pendente' },
      PARTIAL: { variant: 'outline', label: 'Parcial' },
      OVERDUE: { variant: 'destructive', label: 'Vencido' },
      CANCELLED: { variant: 'outline', label: 'Cancelado' },
      DRAFT: { variant: 'outline', label: 'Rascunho' },
      FINALIZED: { variant: 'default', label: 'Finalizado' },
    }
    const config = variants[status] || { variant: 'outline', label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  // ===========================================
  // Render
  // ===========================================

  if (status === 'loading' || (loading && !data)) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-5 w-64 mt-2" />
          </div>
          <div className="mt-4 md:mt-0 flex gap-2">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-32 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <Card className="lg:col-span-4">
            <CardHeader>
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="lg:col-span-3">
            <CardHeader>
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-4 w-36" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Erro ao carregar dados</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchDashboardData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Tentar novamente
        </Button>
      </div>
    )
  }

  const summary = data?.summary || {
    totalInvoices: 0,
    totalCustomers: 0,
    totalSuppliers: 0,
    totalItems: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 0,
  }

  const pendingInvoices = data?.pendingInvoices || []
  const alerts = data?.alerts || {
    overdueInvoices: [],
    lowStockItems: [],
    draftInvoices: 0,
  }

  const netCashFlow = summary.monthlyRevenue - summary.monthlyExpenses
  const totalAlerts = alerts.overdueInvoices.length + alerts.lowStockItems.length + alerts.draftInvoices

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Bem-vindo, {user?.name?.split(' ')[0] || 'Utilizador'}
          </h1>
          <p className="text-muted-foreground">
            {company?.name} • {company?.country === 'PT' ? 'Portugal' : 'Angola'}
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
          <Button onClick={() => router.push('/faturacao/novo')}>
            <FileText className="mr-2 h-4 w-4" />
            Nova Fatura
          </Button>
          <Button variant="outline" onClick={() => router.push('/entidades/novo')}>
            <Users className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            {currency === 'EUR' ? (
              <Euro className="h-4 w-4 text-muted-foreground" />
            ) : (
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.monthlyRevenue, currency)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {netCashFlow >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={netCashFlow >= 0 ? 'text-green-500' : 'text-red-500'}>
                {formatCurrency(Math.abs(netCashFlow), currency)}
              </span>
              <span className="ml-1">saldo líquido</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Pendente</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.pendingAmount, currency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingInvoices.length} faturas em aberto
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalCustomers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              +{summary.totalSuppliers} fornecedores
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {totalAlerts}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {alerts.overdueInvoices.length} vencidas • {alerts.lowStockItems.length} stock baixo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Pending Invoices */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Faturas Pendentes</CardTitle>
            <CardDescription>
              Faturas aguardando pagamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <FileText className="h-10 w-10 mb-3 opacity-50" />
                <p>Nenhuma fatura pendente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingInvoices.slice(0, 5).map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/faturacao/${invoice.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{invoice.number}</p>
                        <p className="text-sm text-muted-foreground">{invoice.customerName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(invoice.dueAmount, currency)}
                      </p>
                      {invoice.dueDate && (
                        <p className="text-xs text-muted-foreground">
                          Vence: {formatDate(invoice.dueDate)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {pendingInvoices.length > 5 && (
                  <Button 
                    variant="ghost" 
                    className="w-full"
                    onClick={() => router.push('/faturacao?status=PENDING')}
                  >
                    Ver todas ({pendingInvoices.length})
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Alertas</CardTitle>
            <CardDescription>
              Itens que requerem atenção
            </CardDescription>
          </CardHeader>
          <CardContent>
            {totalAlerts === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <TrendingUp className="h-10 w-10 mb-3 opacity-50" />
                <p>Tudo em ordem!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.overdueInvoices.slice(0, 3).map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-red-50 border border-red-100 cursor-pointer hover:bg-red-100 transition-colors"
                    onClick={() => router.push(`/faturacao/${invoice.id}`)}
                  >
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{invoice.number}</p>
                      <p className="text-xs text-muted-foreground">Vencida</p>
                    </div>
                    <p className="text-sm font-medium text-red-600">
                      {formatCurrency(invoice.totalAmount, currency)}
                    </p>
                  </div>
                ))}
                
                {alerts.lowStockItems.slice(0, 2).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-amber-50 border border-amber-100 cursor-pointer hover:bg-amber-100 transition-colors"
                    onClick={() => router.push(`/produtos/${item.id}`)}
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                      <Package className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Stock baixo</p>
                    </div>
                    <p className="text-sm font-medium text-amber-600">
                      {item.stock ?? 0} un
                    </p>
                  </div>
                ))}

                {alerts.draftInvoices > 0 && (
                  <div
                    className="flex items-center gap-3 p-2 rounded-lg bg-blue-50 border border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => router.push('/faturacao?status=DRAFT')}
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{alerts.draftInvoices} rascunhos</p>
                      <p className="text-xs text-muted-foreground">Aguardando finalização</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>
            Tarefas comuns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <Button variant="outline" className="justify-start" onClick={() => router.push('/faturacao/novo')}>
              <FileText className="mr-2 h-4 w-4" />
              Nova Fatura
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => router.push('/entidades/novo')}>
              <Users className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => router.push('/produtos/novo')}>
              <Package className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => router.push('/tesouraria/relatorios')}>
              <TrendingUp className="mr-2 h-4 w-4" />
              Ver Relatórios
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
