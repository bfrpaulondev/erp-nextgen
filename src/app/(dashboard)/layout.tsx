'use client'

/**
 * Dashboard Layout
 * Wraps all dashboard pages with sidebar and navbar
 */

import { SessionProvider } from 'next-auth/react'
import { Sidebar } from '@/components/shared/sidebar'
import { Navbar } from '@/components/shared/navbar'
import { ThemeProvider } from 'next-themes'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <div className="min-h-screen bg-background">
          <Sidebar />
          <Navbar collapsed={sidebarCollapsed} />
          <main
            className={cn(
              'pt-16 min-h-screen transition-all duration-300',
              sidebarCollapsed ? 'pl-20' : 'pl-[280px]'
            )}
          >
            <div className="p-6">{children}</div>
          </main>
        </div>
      </ThemeProvider>
    </SessionProvider>
  )
}
