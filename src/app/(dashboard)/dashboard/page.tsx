'use client'

/**
 * Dashboard Page
 * Main dashboard for ERP Next-Gen
 */

import { useSession } from 'next-auth/react'
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
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, getCurrencySymbol } from '@/lib/formatters'
import { formatDateShort, formatRelativeTime } from '@/lib/date-utils'

// Mock data for demonstration
const mockStats = {
  totalRevenue: 125450.75,
  pendingInvoices: 8,
  overdueInvoices: 3,
  totalCustomers: 124,
  totalSuppliers: 45,
  lowStockItems: 5,
  monthlyGrowth: 12.5,
}

const mockRecentInvoices = [
  { id: '1', number: 'FT 2024/001', customer: 'Empresa ABC Lda', total: 1250.00, status: 'PENDING', date: new Date('2024-01-15') },
  { id: '2', number: 'FT 2024/002', customer: 'Comércio XYZ', total: 890.50, status: 'PAID', date: new Date('2024-01-14') },
  { id: '3', number: 'FT 2024/003', customer: 'Serviços RST', total: 2100.00, status: 'PARTIAL', date: new Date('2024-01-13') },
  { id: '4', number: 'FT 2024/004', customer: 'Indústria DEF', total: 3500.00, status: 'PENDING', date: new Date('2024-01-12') },
]

const mockTopProducts = [
  { name: 'Produto A', sold: 156, revenue: 15600.00 },
  { name: 'Serviço B', sold: 89, revenue: 8900.00 },
  { name: 'Produto C', sold: 67, revenue: 6700.00 },
  { name: 'Produto D', sold: 45, revenue: 4500.00 },
]

export default function DashboardPage() {
  const { data: session } = useSession()
  const user = session?.user
  const company = user?.company

  const currency = company?.currency || 'EUR'
  const currencySymbol = getCurrencySymbol(currency)

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      PAID: { variant: 'default', label: 'Pago' },
      PENDING: { variant: 'secondary', label: 'Pendente' },
      PARTIAL: { variant: 'outline', label: 'Parcial' },
      OVERDUE: { variant: 'destructive', label: 'Vencido' },
      CANCELLED: { variant: 'outline', label: 'Cancelado' },
    }
    const config = variants[status] || { variant: 'outline', label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

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
          <Button>Nova Fatura</Button>
          <Button variant="outline">Novo Cliente</Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            {currency === 'EUR' ? (
              <Euro className="h-4 w-4 text-muted-foreground" />
            ) : (
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(mockStats.totalRevenue, currency)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {mockStats.monthlyGrowth >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
              )}
              <span className={mockStats.monthlyGrowth >= 0 ? 'text-green-500' : 'text-red-500'}>
                {mockStats.monthlyGrowth}%
              </span>
              <span className="ml-1">vs. mês anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturas Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.pendingInvoices}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Aguardando pagamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              +{mockStats.totalSuppliers} fornecedores
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
              {mockStats.overdueInvoices + mockStats.lowStockItems}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {mockStats.overdueInvoices} vencidas • {mockStats.lowStockItems} stock baixo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Invoices */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Faturas Recentes</CardTitle>
            <CardDescription>
              Últimas faturas emitidas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockRecentInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{invoice.number}</p>
                      <p className="text-sm text-muted-foreground">{invoice.customer}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrency(invoice.total, currency)}
                    </p>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      {getStatusBadge(invoice.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Produtos mais vendidos</CardTitle>
            <CardDescription>
              Top produtos deste mês
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockTopProducts.map((product, index) => (
                <div key={product.name} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {product.sold} vendidos
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrency(product.revenue, currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
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
            <Button variant="outline" className="justify-start">
              <FileText className="mr-2 h-4 w-4" />
              Nova Fatura
            </Button>
            <Button variant="outline" className="justify-start">
              <Users className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
            <Button variant="outline" className="justify-start">
              <Package className="mr-2 h-4 w-4" />
              Novo Produto
            </Button>
            <Button variant="outline" className="justify-start">
              <TrendingUp className="mr-2 h-4 w-4" />
              Ver Relatórios
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
