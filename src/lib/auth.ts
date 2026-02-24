/**
 * NextAuth.js Configuration
 * Authentication for ERP Next-Gen
 */

import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { compare } from 'bcryptjs'
import prisma from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email e senha são obrigatórios')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            company: {
              select: {
                id: true,
                name: true,
                nif: true,
                country: true,
                currency: true,
              },
            },
          },
        })

        if (!user || !user.password) {
          throw new Error('Credenciais inválidas')
        }

        if (!user.isActive) {
          throw new Error('Conta desativada. Contacte o administrador.')
        }

        const isPasswordValid = await compare(credentials.password, user.password)

        if (!isPasswordValid) {
          throw new Error('Credenciais inválidas')
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
          company: user.company,
        }
      },
    }),
  ],
  
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  pages: {
    signIn: '/login',
    error: '/login',
  },
  
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.companyId = user.companyId
        token.company = user.company
      }
      
      // Handle session update
      if (trigger === 'update' && session) {
        token = { ...token, ...session }
      }
      
      return token
    },
    
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.companyId = token.companyId as string
        session.user.company = token.company as {
          id: string
          name: string
          nif: string
          country: string
          currency: string
        }
      }
      return session
    },
  },
  
  events: {
    signIn: ({ user }) => console.log(`[Auth] User signed in: ${user.email}`),
    signOut: ({ token }) => console.log(`[Auth] User signed out: ${token?.email}`),
  },
}

// Type augmentation for NextAuth
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string | null
      role: string
      companyId: string
      company: {
        id: string
        name: string
        nif: string
        country: string
        currency: string
      }
    }
  }
  
  interface User {
    role: string
    companyId: string
    company: {
      id: string
      name: string
      nif: string
      country: string
      currency: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    companyId: string
    company: {
      id: string
      name: string
      nif: string
      country: string
      currency: string
    }
  }
}
