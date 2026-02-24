'use client'

/**
 * New Payment Page
 * Create new receipt or payment
 */

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowUpRight, ArrowDownRight, Save, X, Trash2, Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/formatters'
import { cn } from '@/lib/utils'

interface Customer {
  id: string
  name: string
  fiscalId: string | null
  type: string
}

interface Invoice {
  id: string
  number: string
  type: string
  customerName: string
  totalAmount: number
  paidAmount: number
  dueDate: string | null
  status: string
}

const methodOptions = [
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'BANK_TRANSFER', label: 'Transferência Bancária' },
  { value: 'CARD', label: 'Cartão' },
  { value: 'CHECK', label: 'Cheque' },
  { value: 'DIRECT_DEBIT', label: 'Débito Direto' },
  { value: 'MBWAY', label: 'MB WAY' },
  { value: 'OTHER', label: 'Outro' },
]

export default function NovoPagamentoPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [customerOpen, setCustomerOpen] = useState(false)
  const [invoiceOpen, setInvoiceOpen] = useState(false)
  
  // Form state
  const [type, setType] = useState<'RECEIPT' | 'PAYMENT'>(
    (searchParams.get('type') as 'RECEIPT' | 'PAYMENT') || 'RECEIPT'
  )
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [invoiceId, setInvoiceId] = useState('')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  const currency = session?.user?.company?.currency as 'EUR' | 'AOA'

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch('/api/parties')
        const data = await response.json()
        if (data.data) {
          setCustomers(data.data)
        }
      } catch (error) {
        console.error('Error fetching customers:', error)
      }
    }
    fetchCustomers()
  }, [])

  // Fetch pending invoices when customer changes
  useEffect(() => {
    const fetchInvoices = async () => {
      if (!customerId) {
        setInvoices([])
        return
      }
      try {
        const response = await fetch(`/api/invoices?customerId=${customerId}&status=PENDING,PARTIAL`)
        const data = await response.json()
        if (data.data) {
          setInvoices(data.data)
        }
      } catch (error) {
        console.error('Error fetching invoices:', error)
      }
    }
    fetchInvoices()
  }, [customerId])

  // Auto-fill amount when invoice is selected
  useEffect(() => {
    if (selectedInvoice) {
      const dueAmount = selectedInvoice.totalAmount - selectedInvoice.paidAmount
      setAmount(dueAmount.toFixed(2))
    }
  }, [selectedInvoice])

  const selectedCustomer = customers.find(c => c.id === customerId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Valor deve ser maior que zero')
      return
    }
    
    if (!method) {
      toast.error('Selecione um método de pagamento')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          date,
          amount: parseFloat(amount),
          method,
          reference: reference || null,
          notes: notes || null,
          customerId: customerId || null,
          invoiceId: invoiceId || null,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        router.push('/tesouraria/pagamentos')
      } else {
        toast.error(data.error || 'Erro ao criar pagamento')
      }
    } catch {
      toast.error('Erro ao criar pagamento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {type === 'RECEIPT' ? 'Novo Recebimento' : 'Novo Pagamento'}
          </h1>
          <p className="text-muted-foreground">
            {type === 'RECEIPT' 
              ? 'Registar um recebimento de cliente' 
              : 'Registar um pagamento a fornecedor'}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/tesouraria/pagamentos">
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Link>
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Tipo de Lançamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    variant={type === 'RECEIPT' ? 'default' : 'outline'}
                    className={cn(
                      "h-20 flex-col",
                      type === 'RECEIPT' && "bg-green-600 hover:bg-green-700"
                    )}
                    onClick={() => setType('RECEIPT')}
                  >
                    <ArrowUpRight className="h-6 w-6 mb-2" />
                    Recebimento
                  </Button>
                  <Button
                    type="button"
                    variant={type === 'PAYMENT' ? 'default' : 'outline'}
                    className={cn(
                      "h-20 flex-col",
                      type === 'PAYMENT' && "bg-red-600 hover:bg-red-700"
                    )}
                    onClick={() => setType('PAYMENT')}
                  >
                    <ArrowDownRight className="h-6 w-6 mb-2" />
                    Pagamento
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Customer/Supplier Selection */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {type === 'RECEIPT' ? 'Cliente' : 'Fornecedor'}
                </CardTitle>
                <CardDescription>
                  Selecione a entidade relacionada
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Entidade</Label>
                  <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {selectedCustomer 
                          ? `${selectedCustomer.name} ${selectedCustomer.fiscalId ? `(${selectedCustomer.fiscalId})` : ''}`
                          : `Selecionar ${type === 'RECEIPT' ? 'cliente' : 'fornecedor'}...`
                        }
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Pesquisar entidade..." />
                        <CommandList>
                          <CommandEmpty>Nenhuma entidade encontrada</CommandEmpty>
                          <CommandGroup>
                            {customers
                              .filter(c => type === 'RECEIPT' 
                                ? c.type === 'CUSTOMER' || c.type === 'BOTH'
                                : c.type === 'SUPPLIER' || c.type === 'BOTH'
                              )
                              .map((customer) => (
                                <CommandItem
                                  key={customer.id}
                                  value={customer.name}
                                  onSelect={() => {
                                    setCustomerId(customer.id)
                                    setCustomerOpen(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      customerId === customer.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div>
                                    <p>{customer.name}</p>
                                    {customer.fiscalId && (
                                      <p className="text-xs text-muted-foreground">
                                        NIF: {customer.fiscalId}
                                      </p>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Invoice Selection */}
                {customerId && invoices.length > 0 && (
                  <div className="space-y-2">
                    <Label>Fatura (Opcional)</Label>
                    <Popover open={invoiceOpen} onOpenChange={setInvoiceOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                        >
                          {selectedInvoice 
                            ? `${selectedInvoice.number} - ${formatCurrency(selectedInvoice.totalAmount - selectedInvoice.paidAmount, currency)} em dívida`
                            : 'Associar a fatura pendente...'
                          }
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0">
                        <Command>
                          <CommandInput placeholder="Pesquisar fatura..." />
                          <CommandList>
                            <CommandEmpty>Nenhuma fatura pendente</CommandEmpty>
                            <CommandGroup>
                              {invoices.map((invoice) => (
                                <CommandItem
                                  key={invoice.id}
                                  value={invoice.number}
                                  onSelect={() => {
                                    setInvoiceId(invoice.id)
                                    setSelectedInvoice(invoice)
                                    setInvoiceOpen(false)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      invoiceId === invoice.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex justify-between w-full">
                                    <div>
                                      <p>{invoice.number}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {formatCurrency(invoice.totalAmount - invoice.paidAmount, currency)} em dívida
                                      </p>
                                    </div>
                                    <Badge variant="outline">
                                      {invoice.status}
                                    </Badge>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    
                    {selectedInvoice && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setInvoiceId('')
                          setSelectedInvoice(null)
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remover associação
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Details */}
            <Card>
              <CardHeader>
                <CardTitle>Detalhes do Pagamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Data *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      required
                    />
                    {selectedInvoice && (
                      <p className="text-xs text-muted-foreground">
                        Em dívida: {formatCurrency(
                          selectedInvoice.totalAmount - selectedInvoice.paidAmount,
                          currency
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="method">Método de Pagamento *</Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar método..." />
                    </SelectTrigger>
                    <SelectContent>
                      {methodOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference">Referência</Label>
                  <Input
                    id="reference"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Ex: Nº documento bancário, referência MB WAY..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Observações adicionais..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Summary */}
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Tipo</span>
                  <Badge className={type === 'RECEIPT' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {type === 'RECEIPT' ? 'Recebimento' : 'Pagamento'}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Entidade</span>
                  <span className="font-medium">
                    {selectedCustomer?.name || '-'}
                  </span>
                </div>

                {selectedInvoice && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Fatura</span>
                    <span className="font-medium">{selectedInvoice.number}</span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Data</span>
                  <span className="font-medium">
                    {new Date(date).toLocaleDateString('pt-PT')}
                  </span>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Valor</span>
                    <span className={cn(
                      "text-2xl font-bold",
                      type === 'RECEIPT' ? "text-green-600" : "text-red-600"
                    )}>
                      {formatCurrency(parseFloat(amount) || 0, currency)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={loading || !amount || !method}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {loading ? 'A guardar...' : 'Guardar'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => router.back()}
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Help */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Ajuda</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>Recebimento:</strong> Registar quando um cliente paga uma fatura ou efetua um adiantamento.
                </p>
                <p>
                  <strong>Pagamento:</strong> Registar pagamentos a fornecedores ou despesas.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
