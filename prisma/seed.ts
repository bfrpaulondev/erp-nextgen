/**
 * Seed Script - Create test company and user
 */

import { hash } from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
  { code: '541', name: 'Fornecedores C/ Conta Corrente', type: 'LIABILITY', category: 'Fornecedores' },
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

const TAX_RATES_PT = [
  { name: 'IVA Normal', code: 'NOR', rate: 23.0, country: 'PT', description: 'Taxa normal de IVA - Portugal' },
  { name: 'IVA Intermédio', code: 'INT', rate: 13.0, country: 'PT', description: 'Taxa intermédia de IVA - Portugal' },
  { name: 'IVA Reduzido', code: 'RED', rate: 6.0, country: 'PT', description: 'Taxa reduzida de IVA - Portugal' },
  { name: 'IVA Isento', code: 'ISE', rate: 0.0, country: 'PT', description: 'Isenção de IVA' },
]

async function main() {
  console.log('🌱 Iniciando seed...')

  // Check if test company already exists
  const existingCompany = await prisma.company.findFirst({
    where: { nif: '000000000' },
  })

  if (existingCompany) {
    console.log('✅ Empresa de teste já existe')
    return
  }

  // Create test company
  const company = await prisma.company.create({
    data: {
      name: 'Empresa Teste Lda',
      nif: '000000000',
      country: 'PT',
      currency: 'EUR',
      address: 'Rua de Teste, 123',
      city: 'Lisboa',
      phone: '+351 912 345 678',
      email: 'teste@empresa.pt',
    },
  })
  console.log('✅ Empresa criada:', company.name)

  // Create admin user
  const hashedPassword = await hash('teste123', 12)
  const user = await prisma.user.create({
    data: {
      name: 'Administrador',
      email: 'admin@teste.com',
      password: hashedPassword,
      role: 'ADMIN',
      companyId: company.id,
    },
  })
  console.log('✅ Utilizador criado:', user.email)

  // Create chart of accounts
  await prisma.chartOfAccount.createMany({
    data: CHART_OF_ACCOUNTS_PT.map((account) => ({
      ...account,
      companyId: company.id,
    })),
  })
  console.log('✅ Plano de contas criado:', CHART_OF_ACCOUNTS_PT.length, 'contas')

  // Create tax rates
  await prisma.taxRate.createMany({
    data: TAX_RATES_PT.map((tax) => ({
      ...tax,
      companyId: company.id,
    })),
  })
  console.log('✅ Taxas de imposto criadas:', TAX_RATES_PT.length, 'taxas')

  // Create test customer
  const customer = await prisma.party.create({
    data: {
      name: 'Cliente Teste',
      fiscalId: '123456789',
      type: 'CUSTOMER',
      email: 'cliente@teste.com',
      phone: '+351 923 456 789',
      address: 'Av. do Cliente, 456',
      city: 'Porto',
      country: 'PT',
      companyId: company.id,
    },
  })
  console.log('✅ Cliente de teste criado:', customer.name)

  // Create test product
  const product = await prisma.item.create({
    data: {
      code: 'P001',
      name: 'Produto Teste',
      description: 'Um produto para testes',
      type: 'PRODUCT',
      unit: 'UN',
      price: 100.00,
      cost: 50.00,
      stock: 100,
      minStock: 10,
      companyId: company.id,
    },
  })
  console.log('✅ Produto de teste criado:', product.name)

  // Create test service
  const service = await prisma.item.create({
    data: {
      code: 'S001',
      name: 'Serviço Teste',
      description: 'Um serviço para testes',
      type: 'SERVICE',
      unit: 'H',
      price: 50.00,
      companyId: company.id,
    },
  })
  console.log('✅ Serviço de teste criado:', service.name)

  console.log('\n🎉 Seed completo!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📧 Email: admin@teste.com')
  console.log('🔑 Senha: teste123')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
