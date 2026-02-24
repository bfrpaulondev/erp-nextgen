'use client'

/**
 * Cash Flow Page
 * Detailed cash flow analysis and forecasting
 */

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Download,
  RefreshCw,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  LineChart,
  Line,
  Legend,
  ComposedChart,
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
    shortMonth: string
    year: number
    monthIndex: number
    receipts: number
    payments: number
    netFlow: number
    receiptCount: number
    paymentCount: number
  }>
  forecast: {
    receipts: Array<{
      month: string
      expectedAmount: number
      invoiceCount: number
    }>
    projectedBalance: number
    next30Days: {
      expectedReceipts: number
      expectedPayments: number
    }
  }
  receivables: Array<{
    id: string
    number: string
    customer: string
    dueAmount: number
    dueDate: string | null
    daysOverdue: number
    status: string
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

export default function FluxoCaixaPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<CashFlowData | null>(null)
  const [period, setPeriod] = useState('12')

  const fetchCashFlow = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/cash-flow?months=${period}`)
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
  }, [period])

  const currency = session?.user?.company?.currency as 'EUR' | 'AOA'

  // Calculate running balance for chart
  const chartData = data?.historical.map((item, index, arr) => {
    const runningBalance = arr.slice(0, index + 1).reduce((sum, i) => sum + i.netFlow, 0)
    return {
      ...item,
      runningBalance,
    }
  }) || []

  // Forecast chart data
  const forecastChartData = [
    ...(data?.historical.slice(-3).map(h => ({
      month: h.shortMonth,
      type: 'real',
      receipts: h.receipts,
      payments: h.payments,
      netFlow: h.netFlow,
    })) || []),
    ...(data?.forecast.receipts.map(f => ({
      month: f.month.split(' ')[0],
      type: 'forecast',
      receipts: f.expectedAmount,
      payments: 0,
      netFlow: f.expectedAmount,
    })) || []),
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fluxo de Caixa</h1>
          <p className="text-muted-foreground">
            Análise e previsão de fluxo de caixa
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Últimos 12 meses</SelectItem>
              <SelectItem value="24">Últimos 24 meses</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchCashFlow}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
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
                  Baseado em receitas - despesas
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Receber (30 dias)</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(data?.forecast.next30Days.expectedReceipts || 0, currency)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Previsto para os próximos 30 dias
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posição Projetada</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className={cn(
                  "text-2xl font-bold",
                  (data?.forecast.projectedBalance || 0) >= 0 ? "text-blue-600" : "text-red-600"
                )}>
                  {formatCurrency(data?.forecast.projectedBalance || 0, currency)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Após receber todas as pendências
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className={cn(
          (data?.stats.overdueReceivables || 0) > 0 && "border-amber-200 bg-amber-50"
        )}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Atraso</CardTitle>
            <AlertTriangle className={cn(
              "h-4 w-4",
              (data?.stats.overdueReceivables || 0) > 0 ? "text-amber-500" : "text-muted-foreground"
            )} />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold text-amber-600">
                  {formatCurrency(data?.stats.overdueAmount || 0, currency)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data?.stats.overdueReceivables || 0} fatura(s) vencida(s)
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="flow" className="space-y-4">
        <TabsList>
          <TabsTrigger value="flow">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="balance">Saldo Acumulado</TabsTrigger>
          <TabsTrigger value="forecast">Previsão</TabsTrigger>
        </TabsList>

        <TabsContent value="flow">
          <Card>
            <CardHeader>
              <CardTitle>Receitas vs Despesas</CardTitle>
              <CardDescription>Comparação mensal de entradas e saídas</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={data?.historical || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="shortMonth" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                    <Legend />
                    <Bar dataKey="receipts" name="Receitas" fill="#22c55e" />
                    <Bar dataKey="payments" name="Despesas" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balance">
          <Card>
            <CardHeader>
              <CardTitle>Saldo Acumulado</CardTitle>
              <CardDescription>Evolução do saldo ao longo do tempo</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="shortMonth" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                    <Area 
                      type="monotone" 
                      dataKey="runningBalance" 
                      name="Saldo Acumulado"
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast">
          <Card>
            <CardHeader>
              <CardTitle>Previsão de Fluxo de Caixa</CardTitle>
              <CardDescription>Projeção para os próximos 3 meses</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[400px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={forecastChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                    <Legend />
                    <Bar 
                      dataKey="receipts" 
                      name="Receitas" 
                      fill="#22c55e"
                      fillOpacity={0.8}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="netFlow" 
                      name="Fluxo Líquido"
                      stroke="#3b82f6" 
                      strokeWidth={2}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detailed Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Receivables */}
        <Card>
          <CardHeader>
            <CardTitle>Recebimentos Previstos</CardTitle>
            <CardDescription>Faturas pendentes de cobrança</CardDescription>
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
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum recebimento pendente</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {data?.receivables.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      item.daysOverdue > 0 && "bg-red-50 border-red-200"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-full",
                        item.daysOverdue > 0 ? "bg-red-100" : "bg-green-100"
                      )}>
                        {item.daysOverdue > 0 ? (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-green-500" />
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
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Resumo Mensal</CardTitle>
            <CardDescription>Detalhe por mês</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                <div className="grid grid-cols-4 gap-2 text-sm font-medium text-muted-foreground pb-2 border-b">
                  <span>Mês</span>
                  <span className="text-right">Receitas</span>
                  <span className="text-right">Despesas</span>
                  <span className="text-right">Líquido</span>
                </div>
                {data?.historical.map((item, idx) => (
                  <div 
                    key={idx}
                    className="grid grid-cols-4 gap-2 text-sm py-2 border-b"
                  >
                    <span>{item.shortMonth} {item.year}</span>
                    <span className="text-right text-green-600">
                      {formatCurrency(item.receipts, currency)}
                    </span>
                    <span className="text-right text-red-600">
                      {formatCurrency(item.payments, currency)}
                    </span>
                    <span className={cn(
                      "text-right font-medium",
                      item.netFlow >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {formatCurrency(item.netFlow, currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
