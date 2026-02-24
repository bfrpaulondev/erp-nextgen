'use client'

/**
 * Treasury Reports Page
 * Generate and export treasury reports
 */

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  FileText,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface ReportData {
  summary: {
    totalReceipts: number
    totalPayments: number
    netFlow: number
    openingBalance: number
    closingBalance: number
  }
  byMethod: Array<{
    method: string
    type: string
    total: number
    count: number
  }>
  byMonth: Array<{
    month: string
    receipts: number
    payments: number
    netFlow: number
  }>
  transactions: Array<{
    id: string
    number: string
    type: 'RECEIPT' | 'PAYMENT'
    date: string
    amount: number
    method: string
    customer: { name: string } | null
  }>
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

export default function RelatoriosTesourariaPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  
  // Filters
  const [reportType, setReportType] = useState('cash-flow')
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })

  const currency = session?.user?.company?.currency as 'EUR' | 'AOA'

  const generateReport = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('fromDate', fromDate)
      params.set('toDate', toDate)
      
      const response = await fetch(`/api/cash-flow?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setReportData({
          summary: {
            totalReceipts: data.data.totalReceipts || 0,
            totalPayments: data.data.totalPayments || 0,
            netFlow: (data.data.totalReceipts || 0) - (data.data.totalPayments || 0),
            openingBalance: 0,
            closingBalance: data.data.currentBalance || 0,
          },
          byMethod: data.data.byMethod || [],
          byMonth: data.data.historical || [],
          transactions: [],
        })
      } else {
        toast.error(data.error || 'Erro ao gerar relatório')
      }
    } catch (error) {
      console.error('Error generating report:', error)
      toast.error('Erro ao gerar relatório')
    } finally {
      setLoading(false)
    }
  }

  const exportToPDF = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      params.set('fromDate', fromDate)
      params.set('toDate', toDate)
      params.set('format', 'pdf')
      
      const response = await fetch(`/api/cash-flow/report?${params}`)
      
      if (!response.ok) {
        throw new Error('Erro ao exportar relatório')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = window.document.createElement('a')
      a.href = url
      a.download = `relatorio_tesouraria_${fromDate}_${toDate}.pdf`
      window.document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
      
      toast.success('Relatório exportado com sucesso')
    } catch (error) {
      console.error('Error exporting report:', error)
      toast.error('Erro ao exportar relatório')
    } finally {
      setExporting(false)
    }
  }

  const exportToCSV = () => {
    if (!reportData) return
    
    const separator = ';'
    const rows = [
      ['RELATÓRIO DE TESOURARIA'],
      [''],
      ['Empresa', session?.user?.company?.name || ''],
      ['Período', `${fromDate} a ${toDate}`],
      ['Moeda', currency],
      ['Gerado em', new Date().toLocaleString('pt-PT')],
      [''],
      [''],
      ['═══════════════════════════════════════════════════════════════'],
      ['RESUMO'],
      ['═══════════════════════════════════════════════════════════════'],
      [''],
      ['Total Recebimentos', formatCurrency(reportData.summary.totalReceipts, currency)],
      ['Total Pagamentos', formatCurrency(reportData.summary.totalPayments, currency)],
      ['Fluxo Líquido', formatCurrency(reportData.summary.netFlow, currency)],
      ['Saldo Atual', formatCurrency(reportData.summary.closingBalance, currency)],
      [''],
      [''],
      ['═══════════════════════════════════════════════════════════════'],
      ['DETALHAMENTO POR MÉTODO DE PAGAMENTO'],
      ['═══════════════════════════════════════════════════════════════'],
      [''],
      ['Método', 'Tipo', 'Transações', 'Total'],
      ['─'.repeat(20), '─'.repeat(15), '─'.repeat(12), '─'.repeat(20)],
      ...reportData.byMethod.map(item => [
        methodLabels[item.method] || item.method,
        item.type === 'RECEIPT' ? 'Recebimento' : 'Pagamento',
        item.count.toString(),
        formatCurrency(item.total, currency),
      ]),
      [''],
      [''],
      ['═══════════════════════════════════════════════════════════════'],
      ['EVOLUÇÃO MENSAL'],
      ['═══════════════════════════════════════════════════════════════'],
      [''],
      ['Mês', 'Recebimentos', 'Pagamentos', 'Fluxo Líquido'],
      ['─'.repeat(15), '─'.repeat(18), '─'.repeat(15), '─'.repeat(18)],
      ...reportData.byMonth.map(item => [
        item.month,
        formatCurrency(item.receipts, currency),
        formatCurrency(item.payments, currency),
        formatCurrency(item.netFlow, currency),
      ]),
      [''],
      [''],
      ['═══════════════════════════════════════════════════════════════'],
      ['FIM DO RELATÓRIO'],
      ['═══════════════════════════════════════════════════════════════'],
    ]
    
    const csvContent = rows.map(row => row.join(separator)).join('\n')
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = window.document.createElement('a')
    a.href = url
    a.download = `relatorio_tesouraria_${fromDate}_${toDate}.csv`
    window.document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    a.remove()
    
    toast.success('Relatório exportado para CSV')
  }

  useEffect(() => {
    generateReport()
  }, [fromDate, toDate])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios de Tesouraria</h1>
          <p className="text-muted-foreground">
            Análise e exportação de dados financeiros
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV} disabled={!reportData || exporting}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <Button onClick={exportToPDF} disabled={!reportData || exporting}>
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configurar Relatório</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Tipo de Relatório</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash-flow">Fluxo de Caixa</SelectItem>
                  <SelectItem value="payments">Pagamentos</SelectItem>
                  <SelectItem value="receipts">Recebimentos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Final</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button onClick={generateReport} disabled={loading} className="w-full">
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <BarChart3 className="mr-2 h-4 w-4" />
                )}
                Gerar Relatório
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : reportData ? (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Recebimentos</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(reportData.summary.totalReceipts, currency)}
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
                  {formatCurrency(reportData.summary.totalPayments, currency)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fluxo Líquido</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "text-2xl font-bold",
                  reportData.summary.netFlow >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {formatCurrency(reportData.summary.netFlow, currency)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={cn(
                  "text-2xl font-bold",
                  reportData.summary.closingBalance >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {formatCurrency(reportData.summary.closingBalance, currency)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* By Method */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Por Método de Pagamento
                </CardTitle>
                <CardDescription>Distribuição por método</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reportData.byMethod.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum dado disponível para o período
                    </p>
                  ) : (
                    reportData.byMethod.map((item, idx) => (
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
                              {item.type === 'RECEIPT' ? 'Recebimento' : 'Pagamento'} • {item.count} transações
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
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Monthly Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Evolução Mensal
                </CardTitle>
                <CardDescription>Fluxo de caixa por mês</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reportData.byMonth.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum dado disponível para o período
                    </p>
                  ) : (
                    reportData.byMonth.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="font-medium">{item.month}</p>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-right">
                            <p className="text-green-600 font-medium">
                              +{formatCurrency(item.receipts, currency)}
                            </p>
                            <p className="text-xs text-muted-foreground">Recebimentos</p>
                          </div>
                          <div className="text-right">
                            <p className="text-red-600 font-medium">
                              -{formatCurrency(item.payments, currency)}
                            </p>
                            <p className="text-xs text-muted-foreground">Pagamentos</p>
                          </div>
                          <div className="text-right min-w-[80px]">
                            <p className={cn(
                              "font-medium",
                              item.netFlow >= 0 ? "text-green-600" : "text-red-600"
                            )}>
                              {formatCurrency(item.netFlow, currency)}
                            </p>
                            <p className="text-xs text-muted-foreground">Líquido</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  )
}
