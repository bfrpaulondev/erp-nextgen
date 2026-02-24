'use client'

/**
 * New Party Page
 * Create a new customer or supplier
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
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
import { toast } from 'sonner'

const partySchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  fiscalId: z.string().optional(),
  type: z.enum(['CUSTOMER', 'SUPPLIER', 'BOTH'], {
    required_error: 'Selecione o tipo de entidade',
  }),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
})

type PartyFormData = z.infer<typeof partySchema>

export default function NovaEntidadePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PartyFormData>({
    resolver: zodResolver(partySchema),
    defaultValues: {
      type: 'CUSTOMER',
      country: 'PT',
    },
  })

  const onSubmit = async (data: PartyFormData) => {
    setLoading(true)
    try {
      const response = await fetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('Entidade criada com sucesso')
        router.push('/entidades')
      } else {
        toast.error(result.error || 'Erro ao criar entidade')
      }
    } catch {
      toast.error('Erro ao criar entidade')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/entidades">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nova Entidade</h1>
          <p className="text-muted-foreground">
            Adicionar um novo cliente ou fornecedor
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
              <CardDescription>
                Dados básicos da entidade
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    placeholder="Nome da empresa ou pessoa"
                    {...register('name')}
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fiscalId">NIF / B.I</Label>
                  <Input
                    id="fiscalId"
                    placeholder="501234567"
                    {...register('fiscalId')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo *</Label>
                <Select
                  value={watch('type')}
                  onValueChange={(value) => setValue('type', value as PartyFormData['type'])}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CUSTOMER">Cliente</SelectItem>
                    <SelectItem value="SUPPLIER">Fornecedor</SelectItem>
                    <SelectItem value="BOTH">Ambos</SelectItem>
                  </SelectContent>
                </Select>
                {errors.type && (
                  <p className="text-sm text-red-500">{errors.type.message}</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@empresa.com"
                    {...register('email')}
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    placeholder="+351 912 345 678"
                    {...register('phone')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle>Morada</CardTitle>
              <CardDescription>
                Endereço da entidade
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  placeholder="Rua, número, andar"
                  {...register('address')}
                />
              </div>

              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    placeholder="Lisboa"
                    {...register('city')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="postalCode">Código Postal</Label>
                  <Input
                    id="postalCode"
                    placeholder="1000-001"
                    {...register('postalCode')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <Select
                  value={watch('country')}
                  onValueChange={(value) => setValue('country', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o país" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PT">🇵🇹 Portugal</SelectItem>
                    <SelectItem value="AO">🇦🇴 Angola</SelectItem>
                    <SelectItem value="ES">🇪🇸 Espanha</SelectItem>
                    <SelectItem value="FR">🇫🇷 França</SelectItem>
                    <SelectItem value="OTHER">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>Notas</CardTitle>
              <CardDescription>
                Informações adicionais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Notas internas sobre esta entidade..."
                className="min-h-[100px]"
                {...register('notes')}
              />
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 mt-6">
          <Button variant="outline" asChild>
            <Link href="/entidades">Cancelar</Link>
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
