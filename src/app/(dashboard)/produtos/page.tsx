'use client'

/**
 * Items List Page
 * Manage products and services
 */

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  Plus,
  Search,
  Package,
  Wrench,
  AlertTriangle,
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
import { formatCurrency } from '@/lib/formatters'

interface Item {
  id: string
  code: string
  name: string
  type: string
  unit: string
  price: number
  stock: number | null
  minStock: number | null
  isActive: boolean
  taxRate: {
    name: string
    rate: number
  } | null
}

export default function ProdutosPage() {
  const { data: session } = useSession()
  const currency = session?.user?.company?.currency || 'EUR'
  
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState('')

  const fetchItems = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (typeFilter) params.append('type', typeFilter)

      const response = await fetch(`/api/items?${params}`)
      const data = await response.json()

      if (response.ok) {
        setItems(data.data)
      } else {
        toast.error(data.error || 'Erro ao carregar itens')
      }
    } catch {
      toast.error('Erro ao carregar itens')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [typeFilter])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== undefined) fetchItems()
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const handleDelete = async () => {
    if (!deleteId) return

    try {
      const response = await fetch(`/api/items/${deleteId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message || 'Item eliminado com sucesso')
        fetchItems()
      } else {
        toast.error(data.error || 'Erro ao eliminar item')
      }
    } catch {
      toast.error('Erro ao eliminar item')
    } finally {
      setDeleteId(null)
      setDeleteName('')
    }
  }

  const lowStockItems = items.filter(
    (item) => item.type === 'PRODUCT' && item.stock !== null && item.minStock !== null && item.stock < item.minStock
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Produtos e Serviços</h1>
          <p className="text-muted-foreground">
            Gerir catálogo de produtos e serviços
          </p>
        </div>
        <Button asChild>
          <Link href="/produtos/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo Item
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Itens</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {items.filter((i) => i.type === 'PRODUCT').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Serviços</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {items.filter((i) => i.type === 'SERVICE').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Baixo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{lowStockItems.length}</div>
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
                placeholder="Pesquisar por código ou nome..."
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
                variant={typeFilter === 'PRODUCT' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('PRODUCT')}
              >
                Produtos
              </Button>
              <Button
                variant={typeFilter === 'SERVICE' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('SERVICE')}
              >
                Serviços
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <h3 className="mt-4 text-lg font-semibold">Nenhum item encontrado</h3>
              <p className="text-muted-foreground mt-2">
                Comece por adicionar um produto ou serviço.
              </p>
              <Button asChild className="mt-4">
                <Link href="/produtos/novo">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Item
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Imposto</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const isLowStock = item.type === 'PRODUCT' && 
                    item.stock !== null && 
                    item.minStock !== null && 
                    item.stock < item.minStock
                  
                  return (
                    <TableRow key={item.id} className={!item.isActive ? 'opacity-50' : ''}>
                      <TableCell className="font-mono">{item.code}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge variant={item.type === 'PRODUCT' ? 'default' : 'secondary'}>
                          {item.type === 'PRODUCT' ? 'Produto' : 'Serviço'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(item.price, currency)}</TableCell>
                      <TableCell>
                        {item.type === 'PRODUCT' ? (
                          <span className={isLowStock ? 'text-destructive font-semibold' : ''}>
                            {item.stock ?? '-'} {item.unit}
                            {isLowStock && (
                              <AlertTriangle className="inline ml-1 h-4 w-4" />
                            )}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {item.taxRate ? `${item.taxRate.name}` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/produtos/${item.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Ver detalhes
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/produtos/${item.id}?edit=true`}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                setDeleteId(item.id)
                                setDeleteName(item.name)
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {item.isActive ? 'Eliminar' : 'Eliminar Definitivamente'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar item?</AlertDialogTitle>
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
