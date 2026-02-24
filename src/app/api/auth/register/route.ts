/**
 * Registration API Route
 * Creates new company with admin user and chart of accounts
 */

import { NextRequest, NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { validateFiscalId } from '@/lib/validators'

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  companyName: z.string().min(2, 'Nome da empresa é obrigatório'),
  companyNif: z.string().min(5, 'NIF inválido'),
  country: z.enum(['PT', 'AO']),
})

// Chart of Accounts Templates
const CHART_OF_ACCOUNTS_PT = [
  { code: '1', name: 'Meios Financeiros Líquidos', type: 'ASSET', category: 'Tesouraria' },
  { code: '11', name: 'Caixa', type: 'ASSET', category: 'Tesouraria' },
  { code: '12', name: 'Depósitos à Ordem', type: 'ASSET', category: 'Tesouraria' },
  { code: '2', name: 'Terceiros', type: 'ASSET', category: 'Clientes' },
  { code: '21', name: 'Clientes', type: 'ASSET', category: 'Clientes' },
  { code: '211', name: 'Clientes C/ Conta Corrente', type: 'ASSET', category: 'Clientes' },
  { code: '3', name: 'Inventários', type: 'ASSET', category: 'Stock' },
  { code: '31', name: 'Compras', type: 'ASSET', category: 'Stock' },
  { code: '32', name: 'Mercadorias', type: 'ASSET', category: 'Stock' },
  { code: '5', name: 'Capital e Reservas', type: 'LIABILITY', category: 'Capital' },
  { code: '51', name: 'Capital', type: 'LIABILITY', category: 'Capital' },
  { code: '54', name: 'Fornecedores', type: 'LIABILITY', category: 'Fornecedores' },
  { code: '6', name: 'Gastos', type: 'EXPENSE', category: 'Gastos' },
  { code: '61', name: 'Custo das Mercadorias Vendidas', type: 'EXPENSE', category: 'Gastos' },
  { code: '7', name: 'Rendimentos', type: 'REVENUE', category: 'Vendas' },
  { code: '71', name: 'Vendas', type: 'REVENUE', category: 'Vendas' },
  { code: '711', name: 'Vendas de Mercadorias', type: 'REVENUE', category: 'Vendas' },
  { code: '72', name: 'Prestações de Serviços', type: 'REVENUE', category: 'Serviços' },
  { code: '8', name: 'Impostos', type: 'LIABILITY', category: 'Impostos' },
  { code: '82', name: 'IVA', type: 'LIABILITY', category: 'Impostos' },
  { code: '821', name: 'IVA Dedutível', type: 'ASSET', category: 'Impostos' },
  { code: '822', name: 'IVA Liquidado', type: 'LIABILITY', category: 'Impostos' },
]

const CHART_OF_ACCOUNTS_AO = [
  { code: '1', name: 'Meios Financeiros Líquidos', type: 'ASSET', category: 'Tesouraria' },
  { code: '11', name: 'Caixa', type: 'ASSET', category: 'Tesouraria' },
  { code: '12', name: 'Depósitos Bancários', type: 'ASSET', category: 'Tesouraria' },
  { code: '2', name: 'Terceiros', type: 'ASSET', category: 'Clientes' },
  { code: '21', name: 'Clientes', type: 'ASSET', category: 'Clientes' },
  { code: '211', name: 'Clientes Conta Corrente', type: 'ASSET', category: 'Clientes' },
  { code: '3', name: 'Existências', type: 'ASSET', category: 'Stock' },
  { code: '31', name: 'Compras', type: 'ASSET', category: 'Stock' },
  { code: '32', name: 'Mercadorias', type: 'ASSET', category: 'Stock' },
  { code: '5', name: 'Capital e Reservas', type: 'LIABILITY', category: 'Capital' },
  { code: '51', name: 'Capital Social', type: 'LIABILITY', category: 'Capital' },
  { code: '54', name: 'Fornecedores', type: 'LIABILITY', category: 'Fornecedores' },
  { code: '6', name: 'Custos e Perdas', type: 'EXPENSE', category: 'Custos' },
  { code: '61', name: 'Custo das Mercadorias Vendidas', type: 'EXPENSE', category: 'Custos' },
  { code: '7', name: 'Proveitos e Ganhos', type: 'REVENUE', category: 'Vendas' },
  { code: '71', name: 'Vendas', type: 'REVENUE', category: 'Vendas' },
  { code: '72', name: 'Prestação de Serviços', type: 'REVENUE', category: 'Serviços' },
  { code: '8', name: 'Impostos', type: 'LIABILITY', category: 'Impostos' },
  { code: '81', name: 'IGVA', type: 'LIABILITY', category: 'Impostos' },
  { code: '811', name: 'IGVA Dedutível', type: 'ASSET', category: 'Impostos' },
  { code: '812', name: 'IGVA Liquidado', type: 'LIABILITY', category: 'Impostos' },
]

const TAX_RATES_PT = [
  { name: 'IVA Normal', code: 'NOR', rate: 23.0, country: 'PT', description: 'Taxa normal de IVA - Portugal' },
  { name: 'IVA Intermédio', code: 'INT', rate: 13.0, country: 'PT', description: 'Taxa intermédia de IVA - Portugal' },
  { name: 'IVA Reduzido', code: 'RED', rate: 6.0, country: 'PT', description: 'Taxa reduzida de IVA - Portugal' },
  { name: 'IVA Isento', code: 'ISE', rate: 0.0, country: 'PT', description: 'Isenção de IVA' },
]

const TAX_RATES_AO = [
  { name: 'IGVA Normal', code: 'NOR', rate: 14.0, country: 'AO', description: 'Taxa normal de IGVA - Angola' },
  { name: 'IGVA Reduzido', code: 'RED', rate: 7.0, country: 'AO', description: 'Taxa reduzida de IGVA - Angola' },
  { name: 'IGVA Isento', code: 'ISE', rate: 0.0, country: 'AO', description: 'Isenção de IGVA' },
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[Register] Received request:', { ...body, password: '[REDACTED]' })
    
    // Validate input
    const validatedData = registerSchema.parse(body)
    console.log('[Register] Validation passed')
    
    // Validate NIF based on country
    const nifValidation = validateFiscalId(validatedData.companyNif, validatedData.country)
    if (!nifValidation.valid) {
      console.log('[Register] NIF validation failed:', nifValidation.error)
      return NextResponse.json(
        { error: nifValidation.error },
        { status: 400 }
      )
    }
    console.log('[Register] NIF validated:', nifValidation.type)
    
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    })
    
    if (existingUser) {
      console.log('[Register] Email already exists')
      return NextResponse.json(
        { error: 'Este email já está registado' },
        { status: 400 }
      )
    }
    
    // Check if NIF already exists for the country
    const existingCompany = await prisma.company.findFirst({
      where: {
        nif: validatedData.companyNif,
        country: validatedData.country,
      },
    })
    
    if (existingCompany) {
      console.log('[Register] NIF already exists')
      return NextResponse.json(
        { error: 'Já existe uma empresa com este NIF' },
        { status: 400 }
      )
    }
    
    // Hash password
    const hashedPassword = await hash(validatedData.password, 12)
    console.log('[Register] Password hashed')
    
    // Get appropriate chart of accounts and tax rates
    const chartOfAccounts = validatedData.country === 'PT' 
      ? CHART_OF_ACCOUNTS_PT 
      : CHART_OF_ACCOUNTS_AO
    
    const taxRates = validatedData.country === 'PT'
      ? TAX_RATES_PT
      : TAX_RATES_AO
    
    console.log('[Register] Creating company and user...')
    
    // Create everything in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create company
      const company = await tx.company.create({
        data: {
          name: validatedData.companyName,
          nif: validatedData.companyNif,
          country: validatedData.country,
          currency: validatedData.country === 'PT' ? 'EUR' : 'AOA',
        },
      })
      console.log('[Register] Company created:', company.id)
      
      // 2. Create user
      const user = await tx.user.create({
        data: {
          name: validatedData.name,
          email: validatedData.email,
          password: hashedPassword,
          role: 'ADMIN',
          companyId: company.id,
        },
      })
      console.log('[Register] User created:', user.id)
      
      // 3. Create chart of accounts
      await tx.chartOfAccount.createMany({
        data: chartOfAccounts.map((account) => ({
          code: account.code,
          name: account.name,
          type: account.type,
          category: account.category,
          companyId: company.id,
        })),
      })
      console.log('[Register] Chart of accounts created')
      
      // 4. Create tax rates
      await tx.taxRate.createMany({
        data: taxRates.map((tax) => ({
          name: tax.name,
          code: tax.code,
          rate: tax.rate,
          country: tax.country,
          description: tax.description,
          companyId: company.id,
        })),
      })
      console.log('[Register] Tax rates created')
      
      return { company, user }
    })
    
    console.log('[Register] Success!')
    
    return NextResponse.json({
      success: true,
      message: 'Conta criada com sucesso',
      data: {
        companyId: result.company.id,
        userId: result.user.id,
      },
    })
    
  } catch (error) {
    console.error('[Register] Error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    
    // Return more detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    
    return NextResponse.json(
      { error: `Erro ao criar conta: ${errorMessage}` },
      { status: 500 }
    )
  }
}
