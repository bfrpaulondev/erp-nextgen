import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

// Ensure secret is passed directly to NextAuth handler
const handler = NextAuth({
  ...authOptions,
  secret: process.env.NEXTAUTH_SECRET || 'erp-nextgen-secret-key-2024-fallback-min-32-chars',
})

export { handler as GET, handler as POST }
