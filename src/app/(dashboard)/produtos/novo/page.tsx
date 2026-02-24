'use client'

/**
 * New Item Page
 * Create a new product or service
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/formatters'

const itemSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  type: z.enum(['PRODUCT', 'SERVICE'], {
    required_error: 'Selecione o tipo',
  }),
  unit: z.string().default('UN'),
  price: z.coerce.number().min(0, 'Preço inválido'),
  cost: z.coerce.number().optional(),
  stock: z.coerce.number().optional(),
  minStock: z.coerce.number().optional(),
  taxRateId: z.string().optional(),
})

type ItemFormData = z.infer<typeof itemSchema>

interface TaxRate {
  id: string
  name: string
  code: string
  rate: number
}

const UNITS = [
  { value: 'UN', label: 'Unidade' },
  { value: 'KG', label: 'Quilograma' },
  { value: 'L', label: 'Litro' },
  { value: 'M', label: 'Metro' },
  { value: 'M2', label: 'Metro Quadrado' },
  { value: 'M3', label: 'Metro Cúbico' },
  { value: 'H', label: 'Hora' },
  { value: 'DZ', label: 'Dúzia' },
  { value: 'CX', label: 'Caixa' },
  { value: 'RL', label: 'Rolo' },
]

export default function NovoProdutoPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const currency = session?.user?.company?.currency || 'EUR'
  
  const [loading, setLoading] = useState(false)
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      type: 'PRODUCT',
      unit: 'UN',
      price: 0,
    },
  })

  const itemType = watch('type')
  const price = watch('price')

  useEffect(() => {
    const fetchTaxRates = async () => {
      try {
        const response = await fetch('/api/tax-rates')
        const data = await response.json()
        if (response.ok) {
          setTaxRates(data.data)
        }
      } catch {
        // Ignore error for now
      }
    }
    fetchTaxRates()
  }, [])

  const onSubmit = async (data: ItemFormData) => {
    setLoading(true)
    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('Item criado com sucesso')
        router.push('/produtos')
      } else {
        toast.error(result.error || 'Erro ao criar item')
      }
    } catch {
      toast.error('Erro ao criar item')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/produtos">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Novo Item</h1>
          <p className="text-muted-foreground">
            Adicionar um novo produto ou serviço
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Info */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Informação Principal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="code">Código *</Label>
                  <Input
                    id="code"
                    placeholder="P001"
                    {...register('code')}
                  />
                  {errors.code && (
                    <p className="text-sm text-red-500">{errors.code.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    placeholder="Nome do produto ou serviço"
                    {...register('name')}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descrição detalhada..."
                  className="min-h-[80px]"
                  {...register('description')}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo *</Label>
                  <Controller
                    name="type"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PRODUCT">Produto</SelectItem>
                          <SelectItem value="SERVICE">Serviço</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">Unidade</Label>
                  <Controller
                    name="unit"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNITS.map((unit) => (
                            <SelectItem key={unit.value} value={unit.value}>
                              {unit.value} - {unit.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Preços</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="price">Preço de Venda *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register('price')}
                />
                {price > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(price, currency)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost">Preço de Custo</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register('cost')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxRateId">Taxa de Imposto</Label>
                <Controller
                  name="taxRateId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {taxRates.map((tax) => (
                          <SelectItem key={tax.id} value={tax.id}>
                            {tax.name} ({tax.rate}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Stock - Only for Products */}
          {itemType === 'PRODUCT' && (
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>Stock</CardTitle>
                <CardDescription>
                  Gestão de inventário (apenas para produtos)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="stock">Stock Inicial</Label>
                    <Input
                      id="stock"
                      type="number"
                      step="0.001"
                      placeholder="0"
                      {...register('stock')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minStock">Stock Mínimo (Alerta)</Label>
                    <Input
                      id="minStock"
                      type="number"
                      step="0.001"
                      placeholder="0"
                      {...register('minStock')}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 mt-6">
          <Button variant="outline" asChild>
            <Link href="/produtos">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A guardar...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
