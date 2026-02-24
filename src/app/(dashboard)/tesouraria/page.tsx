'use client'

/**
 * Treasury Dashboard Page
 * Main treasury management view
 */

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  CreditCard,
  Building2,
  AlertTriangle,
  Clock,
  Plus,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface CashFlowData {
  currentBalance: number
  totalReceivables: number
  totalPayables: number
  netPosition: number
  historical: Array<{
    month: string
    receipts: number
    payments: number
    netFlow: number
  }>
  receivables: Array<{
    id: string
    number: string
    customer: string
    dueAmount: number
    dueDate: string | null
    daysOverdue: number
  }>
  byMethod: Array<{
    method: string
    type: string
    total: number
    count: number
  }>
  stats: {
    overdueReceivables: number
    overdueAmount: number
  }
}

const methodLabels: Record<string, string> = {
  CASH: 'Dinheiro',
  BANK_TRANSFER: 'Transferência',
  CARD: 'Cartão',
  CHECK: 'Cheque',
  DIRECT_DEBIT: 'Débito Direto',
  MBWAY: 'MB WAY',
  OTHER: 'Outro',
}

export default function TesourariaPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<CashFlowData | null>(null)

  const fetchCashFlow = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/cash-flow')
      const result = await response.json()
      if (result.success) {
        setData(result.data)
      }
    } catch (error) {
      console.error('Error fetching cash flow:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCashFlow()
  }, [])

  const currency = session?.user?.company?.currency as 'EUR' | 'AOA'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tesouraria</h1>
          <p className="text-muted-foreground">
            Gestão de fluxo de caixa e pagamentos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchCashFlow}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button asChild>
            <Link href="/tesouraria/pagamentos/novo">
              <Plus className="mr-2 h-4 w-4" />
              Novo Lançamento
            </Link>
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className={cn(
                  "text-2xl font-bold",
                  (data?.currentBalance || 0) >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {formatCurrency(data?.currentBalance || 0, currency)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Receitas - Despesas
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Receber</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(data?.totalReceivables || 0, currency)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data?.receivables.length || 0} faturas pendentes
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Pagar</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(data?.totalPayables || 0, currency)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Fornecedores
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posição Líquida</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className={cn(
                  "text-2xl font-bold",
                  (data?.netPosition || 0) >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {formatCurrency(data?.netPosition || 0, currency)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Saldo + A receber - A pagar
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alert for overdue */}
      {data?.stats && data.stats.overdueReceivables > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-4 pt-6">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <div className="flex-1">
              <p className="font-medium text-amber-800">
                {data.stats.overdueReceivables} fatura(s) vencida(s)
              </p>
              <p className="text-sm text-amber-600">
                Total em atraso: {formatCurrency(data.stats.overdueAmount, currency)}
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/tesouraria/pagamentos?overdue=true">
                Ver Detalhes
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Charts and Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cash Flow Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Fluxo de Caixa</CardTitle>
            <CardDescription>Receitas vs Despesas por mês</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data?.historical || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="shortMonth" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value, currency)}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="receipts" 
                    stackId="1"
                    stroke="#22c55e" 
                    fill="#22c55e" 
                    fillOpacity={0.6}
                    name="Receitas"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="payments" 
                    stackId="2"
                    stroke="#ef4444" 
                    fill="#ef4444" 
                    fillOpacity={0.6}
                    name="Despesas"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Net Flow Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Fluxo Líquido</CardTitle>
            <CardDescription>Resultado mensal</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data?.historical || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="shortMonth" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value, currency)}
                  />
                  <Bar 
                    dataKey="netFlow" 
                    name="Fluxo Líquido"
                    fill="#3b82f6"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Receivables List and Payment Methods */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Receivables */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>A Receber</CardTitle>
              <CardDescription>Faturas pendentes de pagamento</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/tesouraria/pagamentos?type=RECEIPT">
                Ver todos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (data?.receivables?.length || 0) === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma fatura pendente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data?.receivables.slice(0, 5).map((item) => (
                  <Link
                    key={item.id}
                    href={`/faturacao/${item.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-full",
                        item.daysOverdue > 0 ? "bg-red-100" : "bg-green-100"
                      )}>
                        {item.daysOverdue > 0 ? (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{item.number}</p>
                        <p className="text-sm text-muted-foreground">{item.customer}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(item.dueAmount, currency)}</p>
                      {item.dueDate && (
                        <p className="text-xs text-muted-foreground">
                          {item.daysOverdue > 0 
                            ? `${item.daysOverdue} dias em atraso`
                            : `Vence ${formatDate(item.dueDate)}`
                          }
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Por Método de Pagamento</CardTitle>
            <CardDescription>Distribuição por método</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {data?.byMethod.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-full",
                        item.type === 'RECEIPT' ? "bg-green-100" : "bg-red-100"
                      )}>
                        {item.type === 'RECEIPT' ? (
                          <ArrowUpRight className="h-4 w-4 text-green-500" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{methodLabels[item.method] || item.method}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.count} transações
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "font-medium",
                        item.type === 'RECEIPT' ? "text-green-600" : "text-red-600"
                      )}>
                        {formatCurrency(item.total, currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Button variant="outline" className="h-20 flex-col" asChild>
              <Link href="/tesouraria/pagamentos/novo?type=RECEIPT">
                <ArrowUpRight className="h-6 w-6 mb-2 text-green-500" />
                Registar Recebimento
              </Link>
            </Button>
            <Button variant="outline" className="h-20 flex-col" asChild>
              <Link href="/tesouraria/pagamentos/novo?type=PAYMENT">
                <ArrowDownRight className="h-6 w-6 mb-2 text-red-500" />
                Registar Pagamento
              </Link>
            </Button>
            <Button variant="outline" className="h-20 flex-col" asChild>
              <Link href="/tesouraria/fluxo-caixa">
                <TrendingUp className="h-6 w-6 mb-2 text-blue-500" />
                Fluxo de Caixa
              </Link>
            </Button>
            <Button variant="outline" className="h-20 flex-col" asChild>
              <Link href="/tesouraria/relatorios">
                <Building2 className="h-6 w-6 mb-2 text-purple-500" />
                Relatórios
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
