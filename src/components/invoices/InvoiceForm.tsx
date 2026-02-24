'use client'

/**
 * Invoice Form Component
 * Form for creating and editing invoices
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { 
  Plus, 
  Trash2, 
  Save, 
  Send, 
  Search,
  Loader2,
  X,
  Calculator
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, DOCUMENT_TYPE_CONFIG, type DocumentType } from '@/lib/invoice-utils'
import { cn } from '@/lib/utils'

// ===========================================
// Types
// ===========================================

interface LineItem {
  id?: string
  itemId?: string
  description: string
  quantity: number
  unitPrice: number
  discount: number
  taxRateId?: string
  taxRate: number
  taxAmount: number
  total: number
}

interface InvoiceFormData {
  type: DocumentType
  seriesId?: string
  customerId?: string
  customerName: string
  customerFiscalId?: string
  customerAddress?: string
  date: string
  dueDate?: string
  notes?: string
  internalNotes?: string
  lines: LineItem[]
}

interface Customer {
  id: string
  name: string
  fiscalId?: string | null
  address?: string | null
  city?: string | null
  postalCode?: string | null
}

interface Item {
  id: string
  code: string
  name: string
  type: string
  unit: string
  price: number
  taxRateId?: string
  taxRate?: {
    id: string
    name: string
    rate: number
  }
}

interface TaxRate {
  id: string
  name: string
  code: string
  rate: number
}

interface DocumentSeries {
  id: string
  type: string
  prefix: string
  name: string
  year: number
  currentNumber: number
  isActive: boolean
}

interface InvoiceFormProps {
  invoiceId?: string
  initialData?: Partial<InvoiceFormData>
  mode?: 'create' | 'edit'
}

// ===========================================
// Component
// ===========================================

export function InvoiceForm({ invoiceId, initialData, mode = 'create' }: InvoiceFormProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  
  // Data
  const [customers, setCustomers] = useState<Customer[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])
  const [series, setSeries] = useState<DocumentSeries[]>([])
  
  // Search
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)
  const [itemSearch, setItemSearch] = useState('')
  const [showItemSearch, setShowItemSearch] = useState(false)
  const [currentLineIndex, setCurrentLineIndex] = useState<number | null>(null)
  
  // Form
  const [formData, setFormData] = useState<InvoiceFormData>({
    type: 'INVOICE',
    customerName: '',
    date: new Date().toISOString().split('T')[0],
    lines: [],
    ...initialData,
  })

  // Totals
  const [totals, setTotals] = useState({
    subtotal: 0,
    taxAmount: 0,
    discountAmount: 0,
    totalAmount: 0,
  })

  // ===========================================
  // Effects
  // ===========================================

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    calculateTotals()
  }, [formData.lines])

  // ===========================================
  // Data Loading
  // ===========================================

  async function loadInitialData() {
    setLoading(true)
    try {
      const [customersRes, itemsRes, taxRatesRes, seriesRes] = await Promise.all([
        fetch('/api/parties?type=CUSTOMER'),
        fetch('/api/items?isActive=true'),
        fetch('/api/tax-rates?isActive=true'),
        fetch('/api/document-series?isActive=true'),
      ])

      if (customersRes.ok) {
        const data = await customersRes.json()
        setCustomers(data.data || [])
      }

      if (itemsRes.ok) {
        const data = await itemsRes.json()
        setItems(data.data || [])
      }

      if (taxRatesRes.ok) {
        const data = await taxRatesRes.json()
        setTaxRates(data.data || [])
      }

      if (seriesRes.ok) {
        const data = await seriesRes.json()
        setSeries(data.data || [])
      }
    } catch (error) {
      console.error('Error loading initial data:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  // ===========================================
  // Calculations
  // ===========================================

  function calculateTotals() {
    let subtotal = 0
    let taxAmount = 0
    let discountAmount = 0

    formData.lines.forEach(line => {
      const lineSubtotal = line.quantity * line.unitPrice
      const lineDiscount = lineSubtotal * (line.discount / 100)
      const taxableAmount = lineSubtotal - lineDiscount
      const lineTax = taxableAmount * (line.taxRate / 100)
      
      subtotal += lineSubtotal
      discountAmount += lineDiscount
      taxAmount += lineTax
    })

    setTotals({
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      totalAmount: Math.round((subtotal - discountAmount + taxAmount) * 100) / 100,
    })
  }

  function calculateLineTotal(line: LineItem): number {
    const subtotal = line.quantity * line.unitPrice
    const discount = subtotal * (line.discount / 100)
    const taxableAmount = subtotal - discount
    const tax = taxableAmount * (line.taxRate / 100)
    return Math.round((taxableAmount + tax) * 100) / 100
  }

  // ===========================================
  // Form Handlers
  // ===========================================

  function updateFormData(updates: Partial<InvoiceFormData>) {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  function selectCustomer(customer: Customer) {
    const address = [customer.address, customer.postalCode, customer.city]
      .filter(Boolean)
      .join(', ') || undefined

    updateFormData({
      customerId: customer.id,
      customerName: customer.name,
      customerFiscalId: customer.fiscalId || undefined,
      customerAddress: address,
    })
    setCustomerSearch('')
    setShowCustomerSearch(false)
  }

  function clearCustomer() {
    updateFormData({
      customerId: undefined,
      customerName: '',
      customerFiscalId: undefined,
      customerAddress: undefined,
    })
  }

  // ===========================================
  // Line Management
  // ===========================================

  function addLine() {
    const newLine: LineItem = {
      description: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      taxRateId: taxRates[0]?.id,
      taxRate: taxRates[0]?.rate || 0,
      taxAmount: 0,
      total: 0,
    }
    updateFormData({ lines: [...formData.lines, newLine] })
  }

  function removeLine(index: number) {
    const newLines = formData.lines.filter((_, i) => i !== index)
    updateFormData({ lines: newLines })
  }

  function updateLine(index: number, updates: Partial<LineItem>) {
    const newLines = [...formData.lines]
    newLines[index] = { ...newLines[index], ...updates }
    
    // Recalculate line total
    newLines[index].total = calculateLineTotal(newLines[index])
    
    // Recalculate tax amount
    const subtotal = newLines[index].quantity * newLines[index].unitPrice
    const discount = subtotal * (newLines[index].discount / 100)
    const taxableAmount = subtotal - discount
    newLines[index].taxAmount = Math.round(taxableAmount * (newLines[index].taxRate / 100) * 100) / 100
    
    updateFormData({ lines: newLines })
  }

  function selectItem(item: Item, index: number) {
    updateLine(index, {
      itemId: item.id,
      description: item.name,
      unitPrice: item.price,
      taxRateId: item.taxRateId,
      taxRate: item.taxRate?.rate || 0,
    })
    setItemSearch('')
    setShowItemSearch(false)
    setCurrentLineIndex(null)
  }

  // ===========================================
  // Form Submission
  // ===========================================

  async function handleSaveAsDraft() {
    if (!validateForm()) return

    setSaving(true)
    try {
      const url = invoiceId 
        ? `/api/invoices/${invoiceId}`
        : '/api/invoices'
      
      const method = invoiceId ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao guardar documento')
      }

      toast.success('Rascunho guardado com sucesso')
      
      if (!invoiceId && data.data?.id) {
        router.push(`/faturacao/${data.data.id}`)
      }
    } catch (error) {
      console.error('Error saving invoice:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao guardar documento')
    } finally {
      setSaving(false)
    }
  }

  async function handleFinalize() {
    if (!validateForm()) return

    setFinalizing(true)
    try {
      // First save
      const url = invoiceId 
        ? `/api/invoices/${invoiceId}`
        : '/api/invoices'
      
      const method = invoiceId ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao guardar documento')
      }

      const savedId = invoiceId || data.data?.id

      // Then finalize
      const finalizeResponse = await fetch(`/api/invoices/${savedId}/finalize`, {
        method: 'POST',
      })

      const finalizeData = await finalizeResponse.json()

      if (!finalizeResponse.ok) {
        throw new Error(finalizeData.error || 'Erro ao finalizar documento')
      }

      toast.success('Documento finalizado com sucesso')
      router.push(`/faturacao/${savedId}`)
    } catch (error) {
      console.error('Error finalizing invoice:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao finalizar documento')
    } finally {
      setFinalizing(false)
    }
  }

  function validateForm(): boolean {
    if (!formData.customerName) {
      toast.error('Cliente é obrigatório')
      return false
    }

    if (formData.lines.length === 0) {
      toast.error('Documento deve ter pelo menos uma linha')
      return false
    }

    for (let i = 0; i < formData.lines.length; i++) {
      const line = formData.lines[i]
      
      if (!line.description) {
        toast.error(`Linha ${i + 1}: Descrição é obrigatória`)
        return false
      }
      
      if (line.quantity <= 0) {
        toast.error(`Linha ${i + 1}: Quantidade deve ser maior que zero`)
        return false
      }
      
      if (line.unitPrice < 0) {
        toast.error(`Linha ${i + 1}: Preço unitário não pode ser negativo`)
        return false
      }
    }

    return true
  }

  // ===========================================
  // Filtered Data
  // ===========================================

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.fiscalId?.toLowerCase().includes(customerSearch.toLowerCase())
  )

  const filteredItems = items.filter(i =>
    i.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
    i.code.toLowerCase().includes(itemSearch.toLowerCase())
  )

  const filteredSeries = series.filter(s => s.type === formData.type)

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

  return (
    <div className="space-y-6">
      {/* Document Type & Series */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tipo de Documento</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={formData.type}
              onValueChange={(value: DocumentType) => updateFormData({ type: value, seriesId: undefined })}
              disabled={mode === 'edit'}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DOCUMENT_TYPE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.prefix} - {config.namePt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Série</Label>
            <Select
              value={formData.seriesId || ''}
              onValueChange={(value) => updateFormData({ seriesId: value })}
              disabled={mode === 'edit'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar série" />
              </SelectTrigger>
              <SelectContent>
                {filteredSeries.length === 0 ? (
                  <SelectItem value="auto" disabled>
                    Será criada automaticamente
                  </SelectItem>
                ) : (
                  filteredSeries.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.prefix} - {s.name} ({s.currentNumber + 1})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.customerId ? (
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
              <div>
                <div className="font-medium">{formData.customerName}</div>
                {formData.customerFiscalId && (
                  <div className="text-sm text-muted-foreground">
                    NIF: {formData.customerFiscalId}
                  </div>
                )}
                {formData.customerAddress && (
                  <div className="text-sm text-muted-foreground">
                    {formData.customerAddress}
                  </div>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={clearCustomer}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar cliente..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value)
                    setShowCustomerSearch(true)
                  }}
                  onFocus={() => setShowCustomerSearch(true)}
                  className="pl-9"
                />
              </div>

              {showCustomerSearch && customerSearch && (
                <div className="absolute z-10 w-full mt-1 bg-card border rounded-lg shadow-lg max-h-60 overflow-auto">
                  {filteredCustomers.length === 0 ? (
                    <div className="p-3 text-center text-muted-foreground">
                      Nenhum cliente encontrado
                    </div>
                  ) : (
                    filteredCustomers.map(customer => (
                      <button
                        key={customer.id}
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-muted flex items-center justify-between"
                        onClick={() => selectCustomer(customer)}
                      >
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          {customer.fiscalId && (
                            <div className="text-sm text-muted-foreground">
                              NIF: {customer.fiscalId}
                            </div>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {!formData.customerId && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={formData.customerName}
                  onChange={(e) => updateFormData({ customerName: e.target.value })}
                  placeholder="Nome do cliente"
                />
              </div>
              <div className="space-y-2">
                <Label>NIF</Label>
                <Input
                  value={formData.customerFiscalId || ''}
                  onChange={(e) => updateFormData({ customerFiscalId: e.target.value })}
                  placeholder="NIF do cliente"
                />
              </div>
              <div className="space-y-2">
                <Label>Morada</Label>
                <Input
                  value={formData.customerAddress || ''}
                  onChange={(e) => updateFormData({ customerAddress: e.target.value })}
                  placeholder="Morada do cliente"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Datas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Data do Documento</Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => updateFormData({ date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Data de Vencimento</Label>
            <Input
              type="date"
              value={formData.dueDate || ''}
              onChange={(e) => updateFormData({ dueDate: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Lines */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Itens</CardTitle>
          <Button type="button" size="sm" onClick={addLine}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Linha
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead className="min-w-[200px]">Descrição</TableHead>
                  <TableHead className="w-20">Qtd</TableHead>
                  <TableHead className="w-28">Preço</TableHead>
                  <TableHead className="w-20">Desc%</TableHead>
                  <TableHead className="w-28">IVA</TableHead>
                  <TableHead className="w-28">Total</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formData.lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Clique em "Adicionar Linha" para começar
                    </TableCell>
                  </TableRow>
                ) : (
                  formData.lines.map((line, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <div className="relative">
                          <Input
                            value={line.description}
                            onChange={(e) => updateLine(index, { description: e.target.value })}
                            onFocus={() => {
                              setCurrentLineIndex(index)
                              setShowItemSearch(true)
                            }}
                            placeholder="Descrição"
                          />
                          {showItemSearch && currentLineIndex === index && (
                            <div className="absolute z-10 w-full mt-1 bg-card border rounded-lg shadow-lg max-h-40 overflow-auto">
                              <Input
                                placeholder="Pesquisar produto..."
                                value={itemSearch}
                                onChange={(e) => setItemSearch(e.target.value)}
                                className="border-0 rounded-none focus-visible:ring-0"
                              />
                              {itemSearch && (
                                <>
                                  {filteredItems.slice(0, 5).map(item => (
                                    <button
                                      key={item.id}
                                      type="button"
                                      className="w-full px-3 py-2 text-left hover:bg-muted"
                                      onClick={() => selectItem(item, index)}
                                    >
                                      <div className="font-medium">{item.name}</div>
                                      <div className="text-sm text-muted-foreground">
                                        {item.code} • {formatCurrency(item.price, session?.user?.company?.currency as 'EUR' | 'AOA')}
                                      </div>
                                    </button>
                                  ))}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.quantity}
                          onChange={(e) => updateLine(index, { quantity: parseFloat(e.target.value) || 0 })}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.unitPrice}
                          onChange={(e) => updateLine(index, { unitPrice: parseFloat(e.target.value) || 0 })}
                          className="w-28"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={line.discount}
                          onChange={(e) => updateLine(index, { discount: parseFloat(e.target.value) || 0 })}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={line.taxRateId || ''}
                          onValueChange={(value) => {
                            const taxRate = taxRates.find(t => t.id === value)
                            updateLine(index, {
                              taxRateId: value,
                              taxRate: taxRate?.rate || 0,
                            })
                          }}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue placeholder="IVA" />
                          </SelectTrigger>
                          <SelectContent>
                            {taxRates.map(tr => (
                              <SelectItem key={tr.id} value={tr.id}>
                                {tr.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(line.total, session?.user?.company?.currency as 'EUR' | 'AOA')}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLine(index)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(totals.subtotal, session?.user?.company?.currency as 'EUR' | 'AOA')}</span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Desconto</span>
                  <span className="text-red-600">
                    -{formatCurrency(totals.discountAmount, session?.user?.company?.currency as 'EUR' | 'AOA')}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA</span>
                <span>{formatCurrency(totals.taxAmount, session?.user?.company?.currency as 'EUR' | 'AOA')}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>{formatCurrency(totals.totalAmount, session?.user?.company?.currency as 'EUR' | 'AOA')}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.notes || ''}
              onChange={(e) => updateFormData({ notes: e.target.value })}
              placeholder="Observações visíveis no documento"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Notas Internas</Label>
            <Textarea
              value={formData.internalNotes || ''}
              onChange={(e) => updateFormData({ internalNotes: e.target.value })}
              placeholder="Notas internas (não visíveis no documento)"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/faturacao')}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleSaveAsDraft}
          disabled={saving || finalizing}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Guardar Rascunho
        </Button>
        <Button
          type="button"
          onClick={handleFinalize}
          disabled={saving || finalizing}
        >
          {finalizing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          Finalizar
        </Button>
      </div>
    </div>
  )
}
