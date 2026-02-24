'use client'

/**
 * Party Detail Page
 * View and edit party details
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
  Mail,
  Phone,
  MapPin,
  Building2,
  FileText,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/formatters'
import { formatDateShort } from '@/lib/date-utils'

const partySchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  fiscalId: z.string().optional(),
  type: z.enum(['CUSTOMER', 'SUPPLIER', 'BOTH']),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
})

type PartyFormData = z.infer<typeof partySchema>

interface PartyDetail {
  id: string
  name: string
  fiscalId: string | null
  type: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  postalCode: string | null
  country: string | null
  notes: string | null
  createdAt: string
  invoices: Array<{
    id: string
    number: string
    date: string
    totalAmount: number
    status: string
  }>
}

const typeLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  CUSTOMER: { label: 'Cliente', variant: 'default' },
  SUPPLIER: { label: 'Fornecedor', variant: 'secondary' },
  BOTH: { label: 'Ambos', variant: 'outline' },
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  PAID: { label: 'Pago', variant: 'default' },
  PENDING: { label: 'Pendente', variant: 'secondary' },
  PARTIAL: { label: 'Parcial', variant: 'outline' },
  OVERDUE: { label: 'Vencido', variant: 'destructive' },
  CANCELLED: { label: 'Cancelado', variant: 'outline' },
}

export default function EntidadeDetalhePage({
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
  const [party, setParty] = useState<PartyDetail | null>(null)
  const [editMode, setEditMode] = useState(isEditing)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PartyFormData>({
    resolver: zodResolver(partySchema),
  })

  useEffect(() => {
    const fetchParty = async () => {
      try {
        const response = await fetch(`/api/parties/${id}`)
        const data = await response.json()

        if (response.ok) {
          setParty(data.data)
          reset(data.data)
        } else {
          toast.error(data.error || 'Erro ao carregar entidade')
          router.push('/entidades')
        }
      } catch {
        toast.error('Erro ao carregar entidade')
        router.push('/entidades')
      } finally {
        setLoading(false)
      }
    }

    fetchParty()
  }, [id, reset, router])

  const onSubmit = async (data: PartyFormData) => {
    setSaving(true)
    try {
      const response = await fetch(`/api/parties/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('Entidade atualizada com sucesso')
        setParty(result.data)
        setEditMode(false)
      } else {
        toast.error(result.error || 'Erro ao atualizar entidade')
      }
    } catch {
      toast.error('Erro ao atualizar entidade')
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

  if (!party) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/entidades">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{party.name}</h1>
              <Badge variant={typeLabels[party.type]?.variant || 'outline'}>
                {typeLabels[party.type]?.label || party.type}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {party.fiscalId ? `NIF: ${party.fiscalId}` : 'Sem NIF registado'}
            </p>
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
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      {...register('name')}
                      className={errors.name ? 'border-red-500' : ''}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fiscalId">NIF / B.I</Label>
                    <Input id="fiscalId" {...register('fiscalId')} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Tipo *</Label>
                  <Select
                    value={watch('type')}
                    onValueChange={(value) => setValue('type', value as PartyFormData['type'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CUSTOMER">Cliente</SelectItem>
                      <SelectItem value="SUPPLIER">Fornecedor</SelectItem>
                      <SelectItem value="BOTH">Ambos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register('email')}
                      className={errors.email ? 'border-red-500' : ''}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" {...register('phone')} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Morada</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input id="address" {...register('address')} />
                </div>

                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input id="city" {...register('city')} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Código Postal</Label>
                    <Input id="postalCode" {...register('postalCode')} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">País</Label>
                  <Select
                    value={watch('country')}
                    onValueChange={(value) => setValue('country', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PT">🇵🇹 Portugal</SelectItem>
                      <SelectItem value="AO">🇦🇴 Angola</SelectItem>
                      <SelectItem value="ES">🇪🇸 Espanha</SelectItem>
                      <SelectItem value="OTHER">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  className="min-h-[100px]"
                  {...register('notes')}
                />
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditMode(false)
                reset(party)
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
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p>{party.email || '-'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p>{party.phone || '-'}</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Morada</p>
                  <p>
                    {[party.address, party.postalCode, party.city]
                      .filter(Boolean)
                      .join(', ') || '-'}
                  </p>
                  {party.country && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {party.country === 'PT' ? 'Portugal' : party.country === 'AO' ? 'Angola' : party.country}
                    </p>
                  )}
                </div>
              </div>

              {party.notes && (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Notas</p>
                      <p className="whitespace-pre-wrap">{party.notes}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Faturas</span>
                <span className="font-semibold">{party.invoices?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Criado em</span>
                <span className="font-semibold">
                  {formatDateShort(party.createdAt)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Recent Invoices */}
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Faturas Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(party.invoices?.length || 0) === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhuma fatura registada
                </p>
              ) : (
                <div className="space-y-2">
                  {(party.invoices || []).map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium">{invoice.number}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDateShort(invoice.date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {formatCurrency(invoice.totalAmount, currency)}
                        </p>
                        <Badge
                          variant={statusLabels[invoice.status]?.variant || 'outline'}
                        >
                          {statusLabels[invoice.status]?.label || invoice.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
