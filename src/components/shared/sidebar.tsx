'use client'

/**
 * Sidebar Component
 * Main navigation for ERP Next-Gen
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  Calculator,
  Settings,
  Building2,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Truck,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Faturação',
    href: '/faturacao',
    icon: FileText,
  },
  {
    name: 'Entidades',
    href: '/entidades',
    icon: Users,
  },
  {
    name: 'Produtos',
    href: '/produtos',
    icon: Package,
  },
  {
    name: 'Tesouraria',
    href: '/tesouraria',
    icon: Wallet,
  },
  {
    name: 'Contabilidade',
    href: '/contabilidade',
    icon: Calculator,
  },
  {
    name: 'Logística',
    href: '/logistica',
    icon: Truck,
  },
  {
    name: 'Relatórios',
    href: '/relatorios',
    icon: BarChart3,
  },
  {
    name: 'Configurações',
    href: '/configuracoes',
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-card border-r border-border flex flex-col transition-all duration-300",
        collapsed ? "w-20" : "w-[280px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-lg text-foreground">Next-Gen</span>
              <span className="text-xs text-muted-foreground">ERP</span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                'hover:bg-accent hover:text-accent-foreground',
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground'
              )}
            >
              <item.icon
                className={cn(
                  'w-5 h-5 flex-shrink-0',
                  isActive && 'text-primary'
                )}
              />
              {!collapsed && (
                <span className="whitespace-nowrap">
                  {item.name}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse Button */}
      <div className="p-3 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 mr-2" />
              <span>Colapsar</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  )
}
