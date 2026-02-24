/**
 * Middleware for Route Protection
 * Protects dashboard routes and handles authentication
 */

import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

// Secret for JWT verification - must be consistent with auth.ts
const secret = process.env.NEXTAUTH_SECRET || 'erp-nextgen-secret-key-2024-fallback-min-32-chars'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // If accessing root, redirect to dashboard
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Role-based access control
    const role = token?.role as string
    
    // Admin only routes
    const adminRoutes = ['/configuracoes/usuarios', '/configuracoes/empresa']
    if (adminRoutes.some(route => pathname.startsWith(route))) {
      if (role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Accountant only routes
    const accountantRoutes = ['/contabilidade']
    if (accountantRoutes.some(route => pathname.startsWith(route))) {
      if (!['ADMIN', 'ACCOUNTANT', 'MANAGER'].includes(role)) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    secret,
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req?.nextUrl?.pathname || '/'
        
        // Allow public routes
        const publicRoutes = ['/login', '/register', '/api/auth', '/api/seed', '/api/health']
        if (publicRoutes.some(route => pathname.startsWith(route))) {
          return true
        }
        
        // Allow static files
        if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
          return true
        }
        
        // Require authentication for all other routes
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
