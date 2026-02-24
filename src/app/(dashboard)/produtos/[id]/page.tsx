'use client'

/**
 * Item Detail Page
 * View and edit item details
 */

import { useState, useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  ArrowLeft,
  Save,
  Loader2,
  Pencil,
  Package,
  DollarSign,
  AlertTriangle,
} from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/formatters'

const itemSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  type: z.enum(['PRODUCT', 'SERVICE']),
  unit: z.string(),
  price: z.coerce.number().min(0, 'Preço inválido'),
  cost: z.coerce.number().optional(),
  stock: z.coerce.number().optional(),
  minStock: z.coerce.number().optional(),
  isActive: z.boolean(),
  taxRateId: z.string().optional(),
})

type ItemFormData = z.infer<typeof itemSchema>

interface ItemDetail extends ItemFormData {
  id: string
  taxRate: {
    id: string
    name: string
    rate: number
  } | null
  createdAt: string
  stockMovements: Array<{
    id: string
    type: string
    quantity: number
    createdAt: string
  }>
}

const UNITS = [
  { value: 'UN', label: 'Unidade' },
  { value: 'KG', label: 'Quilograma' },
  { value: 'L', label: 'Litro' },
  { value: 'M', label: 'Metro' },
  { value: 'H', label: 'Hora' },
]

export default function ProdutoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const isEditing = searchParams.get('edit') === 'true'
  const { data: session } = useSession()
  const currency = session?.user?.company?.currency || 'EUR'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [item, setItem] = useState<ItemDetail | null>(null)
  const [editMode, setEditMode] = useState(isEditing)

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
  })

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const response = await fetch(`/api/items/${id}`)
        const data = await response.json()

        if (response.ok) {
          setItem(data.data)
          reset(data.data)
        } else {
          toast.error(data.error || 'Erro ao carregar item')
          router.push('/produtos')
        }
      } catch {
        toast.error('Erro ao carregar item')
        router.push('/produtos')
      } finally {
        setLoading(false)
      }
    }

    fetchItem()
  }, [id, reset, router])

  const onSubmit = async (data: ItemFormData) => {
    setSaving(true)
    try {
      const response = await fetch(`/api/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('Item atualizado com sucesso')
        setItem(result.data)
        setEditMode(false)
      } else {
        toast.error(result.error || 'Erro ao atualizar item')
      }
    } catch {
      toast.error('Erro ao atualizar item')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="md:col-span-2 h-96" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (!item) return null

  const isLowStock = item.type === 'PRODUCT' && 
    item.stock !== null && 
    item.minStock !== null && 
    item.stock < item.minStock

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/produtos">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{item.name}</h1>
              <Badge variant={item.type === 'PRODUCT' ? 'default' : 'secondary'}>
                {item.type === 'PRODUCT' ? 'Produto' : 'Serviço'}
              </Badge>
              {!item.isActive && (
                <Badge variant="outline">Inativo</Badge>
              )}
            </div>
            <p className="text-muted-foreground">Código: {item.code}</p>
          </div>
        </div>
        {!editMode && (
          <Button onClick={() => setEditMode(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </Button>
        )}
      </div>

      {editMode ? (
        /* Edit Form */
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Informação Principal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="code">Código *</Label>
                    <Input id="code" {...register('code')} />
                    {errors.code && (
                      <p className="text-sm text-red-500">{errors.code.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input id="name" {...register('name')} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    className="min-h-[80px]"
                    {...register('description')}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo</Label>
                    <Controller
                      name="type"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
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
                        <Select value={field.value} onValueChange={field.onChange}>
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

            <Card>
              <CardHeader>
                <CardTitle>Preços</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Preço de Venda *</Label>
                  <Input id="price" type="number" step="0.01" {...register('price')} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost">Preço de Custo</Label>
                  <Input id="cost" type="number" step="0.01" {...register('cost')} />
                </div>

                <div className="flex items-center space-x-2">
                  <Controller
                    name="isActive"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="toggle"
                      />
                    )}
                  />
                  <Label>Item ativo</Label>
                </div>
              </CardContent>
            </Card>

            {watch('type') === 'PRODUCT' && (
              <Card className="md:col-span-3">
                <CardHeader>
                  <CardTitle>Stock</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="stock">Stock Atual</Label>
                      <Input id="stock" type="number" step="0.001" {...register('stock')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minStock">Stock Mínimo</Label>
                      <Input id="minStock" type="number" step="0.001" {...register('minStock')} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditMode(false)
                reset(item)
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
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
      ) : (
        /* View Mode */
        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Info */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Informação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Descrição</p>
                <p>{item.description || 'Sem descrição'}</p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Unidade</p>
                  <p>{item.unit}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Imposto</p>
                  <p>{item.taxRate ? item.taxRate.name : 'Sem taxa'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Preços
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Preço de Venda</span>
                <span className="font-semibold">{formatCurrency(item.price, currency)}</span>
              </div>
              {item.cost && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Preço de Custo</span>
                  <span>{formatCurrency(item.cost, currency)}</span>
                </div>
              )}
              {item.cost && item.price > 0 && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Margem</span>
                    <span className="font-semibold text-green-600">
                      {(((item.price - item.cost) / item.price) * 100).toFixed(1)}%
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Stock - Only for Products */}
          {item.type === 'PRODUCT' && (
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Stock
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className={`p-4 rounded-lg border ${isLowStock ? 'border-red-500 bg-red-50' : ''}`}>
                    <p className="text-sm text-muted-foreground">Stock Atual</p>
                    <p className={`text-2xl font-bold ${isLowStock ? 'text-red-600' : ''}`}>
                      {item.stock ?? 0} {item.unit}
                      {isLowStock && <AlertTriangle className="inline ml-2 h-5 w-5" />}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Stock Mínimo</p>
                    <p className="text-2xl font-bold">{item.minStock ?? 0} {item.unit}</p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Estado</p>
                    <Badge variant={isLowStock ? 'destructive' : 'default'}>
                      {isLowStock ? 'Stock Baixo' : 'Normal'}
                    </Badge>
                  </div>
                </div>

                {item.stockMovements && item.stockMovements.length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <h4 className="font-semibold mb-2">Movimentos Recentes</h4>
                    <div className="space-y-2">
                      {item.stockMovements.slice(0, 5).map((movement) => (
                        <div key={movement.id} className="flex justify-between items-center text-sm">
                          <Badge variant={movement.type === 'IN' ? 'default' : 'secondary'}>
                            {movement.type === 'IN' ? 'Entrada' : 'Saída'}
                          </Badge>
                          <span>{movement.quantity} {item.unit}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
