'use client'

/**
 * Parties List Page
 * Manage customers and suppliers
 */

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  Plus,
  Search,
  Users,
  UserPlus,
  Building2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

interface Party {
  id: string
  name: string
  fiscalId: string | null
  type: string
  email: string | null
  phone: string | null
  city: string | null
  createdAt: string
}

const typeLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  CUSTOMER: { label: 'Cliente', variant: 'default' },
  SUPPLIER: { label: 'Fornecedor', variant: 'secondary' },
  BOTH: { label: 'Ambos', variant: 'outline' },
}

export default function EntidadesPage() {
  const { data: session } = useSession()
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState<string>('')

  const fetchParties = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (typeFilter) params.append('type', typeFilter)

      const response = await fetch(`/api/parties?${params}`)
      const data = await response.json()

      if (response.ok) {
        setParties(data.data)
      } else {
        toast.error(data.error || 'Erro ao carregar entidades')
      }
    } catch {
      toast.error('Erro ao carregar entidades')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchParties()
  }, [typeFilter])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== undefined) fetchParties()
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const handleDelete = async () => {
    if (!deleteId) return

    try {
      const response = await fetch(`/api/parties/${deleteId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Entidade eliminada com sucesso')
        fetchParties()
      } else {
        toast.error(data.error || 'Erro ao eliminar entidade')
      }
    } catch {
      toast.error('Erro ao eliminar entidade')
    } finally {
      setDeleteId(null)
      setDeleteName('')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Entidades</h1>
          <p className="text-muted-foreground">
            Gerir clientes e fornecedores
          </p>
        </div>
        <Button asChild>
          <Link href="/entidades/novo">
            <Plus className="mr-2 h-4 w-4" />
            Nova Entidade
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entidades</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{parties.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {parties.filter((p) => p.type === 'CUSTOMER' || p.type === 'BOTH').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fornecedores</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {parties.filter((p) => p.type === 'SUPPLIER' || p.type === 'BOTH').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome, NIF ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={typeFilter === '' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('')}
              >
                Todos
              </Button>
              <Button
                variant={typeFilter === 'CUSTOMER' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('CUSTOMER')}
              >
                Clientes
              </Button>
              <Button
                variant={typeFilter === 'SUPPLIER' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('SUPPLIER')}
              >
                Fornecedores
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : parties.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <h3 className="mt-4 text-lg font-semibold">Nenhuma entidade encontrada</h3>
              <p className="text-muted-foreground mt-2">
                Comece por adicionar um cliente ou fornecedor.
              </p>
              <Button asChild className="mt-4">
                <Link href="/entidades/novo">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Entidade
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>NIF</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parties.map((party) => (
                  <TableRow key={party.id}>
                    <TableCell className="font-medium">{party.name}</TableCell>
                    <TableCell>{party.fiscalId || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={typeLabels[party.type]?.variant || 'outline'}>
                        {typeLabels[party.type]?.label || party.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{party.email || '-'}</TableCell>
                    <TableCell>{party.phone || '-'}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Ações</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/entidades/${party.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver detalhes
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/entidades/${party.id}?edit=true`}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => {
                              setDeleteId(party.id)
                              setDeleteName(party.name)
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar entidade?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que pretende eliminar <strong>{deleteName}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
