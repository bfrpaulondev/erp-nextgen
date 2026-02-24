'use client'

/**
 * Navbar Component
 * Top navigation bar for ERP Next-Gen
 */

import { useSession, signOut } from 'next-auth/react'
import {
  Bell,
  Search,
  Moon,
  Sun,
  User,
  LogOut,
  Settings,
  Building2,
  ChevronDown,
  CheckCircle,
  AlertTriangle,
  Clock,
  Box,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/formatters'

interface NavbarProps {
  collapsed?: boolean
}

interface SearchResult {
  id: string
  type: 'invoice' | 'customer' | 'item' | 'page'
  title: string
  subtitle?: string
  href: string
  icon: React.ReactNode
}

interface Notification {
  id: string
  type: 'overdue' | 'lowStock' | 'info' | 'success'
  title: string
  description: string
  href?: string
  createdAt?: string
}

export function Navbar({ collapsed = false }: NavbarProps) {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(true)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  const user = session?.user
  const company = user?.company

  // Only render on client to avoid hydration mismatch with Radix UI IDs
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch notifications
  useEffect(() => {
    if (!session) return
    
    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/dashboard')
        const data = await response.json()
        
        if (data.success) {
          const notifs: Notification[] = []
          
          // Overdue invoices
          if (data.data?.alerts?.overdueInvoices) {
            data.data.alerts.overdueInvoices.forEach((inv: { id: string; number: string; customerName: string; totalAmount: number }) => {
              notifs.push({
                id: `overdue-${inv.id}`,
                type: 'overdue',
                title: `Fatura vencida: ${inv.number}`,
                description: `${inv.customerName} - ${formatCurrency(inv.totalAmount, company?.currency as 'EUR' | 'AOA')}`,
                href: `/faturacao/${inv.id}`,
              })
            })
          }
          
          // Low stock items
          if (data.data?.alerts?.lowStockItems) {
            data.data.alerts.lowStockItems.forEach((item: { id: string; code: string; name: string; stock: number }) => {
              notifs.push({
                id: `stock-${item.id}`,
                type: 'lowStock',
                title: `Stock baixo: ${item.name}`,
                description: `Código: ${item.code} - Stock atual: ${item.stock}`,
                href: `/produtos/${item.id}`,
              })
            })
          }
          
          // Draft invoices info
          if (data.data?.alerts?.draftInvoices > 0) {
            notifs.push({
              id: 'draft-info',
              type: 'info',
              title: 'Documentos em rascunho',
              description: `${data.data.alerts.draftInvoices} documento(s) aguardando finalização`,
              href: '/faturacao',
            })
          }
          
          setNotifications(notifs)
        }
      } catch (error) {
        console.error('Error fetching notifications:', error)
      } finally {
        setNotificationsLoading(false)
      }
    }
    
    fetchNotifications()
  }, [session, company?.currency])

  // Search functionality
  useEffect(() => {
    const search = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([])
        return
      }
      
      setSearchLoading(true)
      try {
        const results: SearchResult[] = []
        const query = searchQuery.toLowerCase()
        
        // Add page suggestions
        const pages = [
          { name: 'Dashboard', href: '/dashboard', keywords: ['dashboard', 'painel', 'inicio'] },
          { name: 'Faturação', href: '/faturacao', keywords: ['fatura', 'faturacao', 'invoice', 'factura'] },
          { name: 'Entidades', href: '/entidades', keywords: ['entidade', 'cliente', 'fornecedor', 'customer'] },
          { name: 'Produtos', href: '/produtos', keywords: ['produto', 'artigo', 'item', 'servico'] },
          { name: 'Tesouraria', href: '/tesouraria', keywords: ['tesouraria', 'pagamento', 'recebimento', 'fluxo'] },
          { name: 'Contabilidade', href: '/contabilidade/diario', keywords: ['contabilidade', 'diario', 'conta'] },
          { name: 'Balancete', href: '/contabilidade/balancete', keywords: ['balancete', 'balanco'] },
          { name: 'Configurações', href: '/configuracoes/series', keywords: ['configuracao', 'definicoes', 'settings'] },
        ]
        
        pages.forEach(page => {
          if (page.keywords.some(kw => kw.includes(query) || query.includes(kw))) {
            results.push({
              id: page.name,
              type: 'page',
              title: page.name,
              href: page.href,
              icon: <Building2 className="w-4 h-4" />,
            })
          }
        })
        
        setSearchResults(results.slice(0, 10))
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setSearchLoading(false)
      }
    }
    
    const debounce = setTimeout(search, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery])

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getCurrencySymbol = (currency: string) => {
    return currency === 'AOA' ? 'Kz' : '€'
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'overdue':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'lowStock':
        return <Box className="w-4 h-4 text-amber-500" />
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      default:
        return <Clock className="w-4 h-4 text-blue-500" />
    }
  }

  const unreadCount = useMemo(() => notifications.length, [notifications])

  // Render placeholder during SSR to avoid hydration mismatch
  if (!mounted) {
    return (
      <header
        className={cn(
          'fixed top-0 right-0 z-30 h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border',
          'transition-all duration-300',
          collapsed ? 'left-20' : 'left-[280px]'
        )}
      >
        <div className="flex items-center justify-between h-full px-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" className="w-80 justify-start text-muted-foreground">
              <Search className="w-4 h-4 mr-2" />
              <span className="flex-1 text-left">Pesquisar...</span>
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-[180px]" />
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-[140px]" />
          </div>
        </div>
      </header>
    )
  }

  return (
    <>
      <header
        className={cn(
          'fixed top-0 right-0 z-30 h-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border',
          'transition-all duration-300',
          collapsed ? 'left-20' : 'left-[280px]'
        )}
      >
        <div className="flex items-center justify-between h-full px-6">
          {/* Left Section - Search */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              className="w-80 justify-start text-muted-foreground"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="w-4 h-4 mr-2" />
              <span className="flex-1 text-left">Pesquisar...</span>
              <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:flex">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center gap-3">
            {/* Company Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Building2 className="w-4 h-4" />
                  <span className="max-w-[150px] truncate">
                    {company?.name || 'Empresa'}
                  </span>
                  <Badge variant="secondary" className="ml-1">
                    {company?.country || 'PT'}
                  </Badge>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Empresa Atual</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5">
                  <p className="font-medium">{company?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    NIF: {company?.nif}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Moeda: {getCurrencySymbol(company?.currency || 'EUR')} ({company?.currency})
                  </p>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              suppressHydrationWarning
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Alternar tema</span>
            </Button>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  Notificações
                  {unreadCount > 0 && (
                    <Badge variant="secondary">{unreadCount}</Badge>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notificationsLoading ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhuma notificação</p>
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto">
                    {notifications.map((notif) => (
                      <DropdownMenuItem key={notif.id} asChild>
                        <Link
                          href={notif.href || '#'}
                          className="flex items-start gap-3 p-3 cursor-pointer"
                        >
                          {getNotificationIcon(notif.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{notif.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {notif.description}
                            </p>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 pl-2 pr-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user?.image || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium">{user?.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {user?.role?.toLowerCase()}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{user?.name}</span>
                    <span className="font-normal text-xs text-muted-foreground">
                      {user?.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="w-4 h-4 mr-2" />
                  Meu Perfil
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={() => signOut({ callbackUrl: '/login' })}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Terminar Sessão
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Search Dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pesquisa Global</DialogTitle>
            <DialogDescription>
              Pesquisar em todo o sistema
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Pesquisar faturas, clientes, produtos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
              autoFocus
            />
            {searchLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {searchResults.map((result) => (
                  <Link
                    key={`${result.type}-${result.id}`}
                    href={result.href}
                    onClick={() => setSearchOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    {result.icon}
                    <div className="flex-1">
                      <p className="font-medium">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-sm text-muted-foreground">{result.subtitle}</p>
                      )}
                    </div>
                    <Badge variant="outline">{result.type}</Badge>
                  </Link>
                ))}
              </div>
            ) : searchQuery ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhum resultado encontrado</p>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
