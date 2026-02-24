/**
 * Auth Layout
 * Layout for login and register pages (no sidebar)
 */

import { ThemeProvider } from 'next-themes'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  )
}
