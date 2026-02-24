/**
 * Cash Flow API
 * Cash flow analysis and forecasting
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import prisma from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

// ===========================================
// GET - Cash flow data
// ===========================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const months = parseInt(searchParams.get('months') || '12')

    const companyId = session.user.companyId
    const now = new Date()

    // ========================================
    // Current Balance (from payments)
    // ========================================
    const [totalReceipts, totalPayments] = await Promise.all([
      prisma.payment.aggregate({
        where: { companyId, type: 'RECEIPT' },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { companyId, type: 'PAYMENT' },
        _sum: { amount: true },
      })
    ])

    const currentBalance = 
      (Number(totalReceipts._sum.amount) || 0) - 
      (Number(totalPayments._sum.amount) || 0)

    // ========================================
    // Historical Cash Flow (last N months)
    // ========================================
    const historicalData = []
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const startDate = new Date(date.getFullYear(), date.getMonth(), 1)
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0)

      const [monthReceipts, monthPayments] = await Promise.all([
        prisma.payment.aggregate({
          where: {
            companyId,
            type: 'RECEIPT',
            date: { gte: startDate, lte: endDate }
          },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.payment.aggregate({
          where: {
            companyId,
            type: 'PAYMENT',
            date: { gte: startDate, lte: endDate }
          },
          _sum: { amount: true },
          _count: true,
        })
      ])

      const receipts = Number(monthReceipts._sum.amount) || 0
      const payments = Number(monthPayments._sum.amount) || 0

      historicalData.push({
        month: `${monthNames[date.getMonth()]} ${date.getFullYear()}`,
        shortMonth: monthNames[date.getMonth()],
        year: date.getFullYear(),
        monthIndex: date.getMonth(),
        receipts,
        payments,
        netFlow: receipts - payments,
        receiptCount: monthReceipts._count,
        paymentCount: monthPayments._count,
      })
    }

    // ========================================
    // Pending Invoices (Receivables)
    // ========================================
    const pendingInvoices = await prisma.invoice.findMany({
      where: {
        companyId,
        status: { in: ['PENDING', 'PARTIAL'] },
      },
      include: {
        customer: {
          select: { id: true, name: true }
        }
      },
      orderBy: { dueDate: 'asc' }
    })

    const receivables = pendingInvoices.map(inv => ({
      id: inv.id,
      number: inv.number,
      customer: inv.customer?.name || inv.customerName,
      totalAmount: Number(inv.totalAmount),
      paidAmount: Number(inv.paidAmount),
      dueAmount: Number(inv.totalAmount) - Number(inv.paidAmount),
      dueDate: inv.dueDate,
      daysOverdue: inv.dueDate 
        ? Math.max(0, Math.floor((now.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24)))
        : 0,
      status: inv.status,
    }))

    // Calculate expected receipts by month (next 3 months)
    const forecastReceipts = []
    for (let i = 0; i < 3; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const startDate = new Date(date.getFullYear(), date.getMonth(), 1)
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0)

      const expectedAmount = pendingInvoices
        .filter(inv => {
          if (!inv.dueDate) return i === 0
          return inv.dueDate >= startDate && inv.dueDate <= endDate
        })
        .reduce((sum, inv) => sum + Number(inv.totalAmount) - Number(inv.paidAmount), 0)

      forecastReceipts.push({
        month: `${monthNames[date.getMonth()]} ${date.getFullYear()}`,
        expectedAmount,
        invoiceCount: pendingInvoices.filter(inv => {
          if (!inv.dueDate) return i === 0
          return inv.dueDate >= startDate && inv.dueDate <= endDate
        }).length,
      })
    }

    // ========================================
    // Supplier Payables (from ledger entries)
    // ========================================
    const payablesAccounts = await prisma.chartOfAccount.findMany({
      where: {
        companyId,
        type: 'LIABILITY',
        code: { startsWith: '2' }
      },
      select: { id: true }
    })

    const payablesAccountIds = payablesAccounts.map(a => a.id)

    let totalPayables = 0
    if (payablesAccountIds.length > 0) {
      const payablesResult = await prisma.ledgerEntry.aggregate({
        where: {
          companyId,
          accountId: { in: payablesAccountIds },
        },
        _sum: { credit: true, debit: true }
      })
      totalPayables = (Number(payablesResult._sum.credit) || 0) - (Number(payablesResult._sum.debit) || 0)
    }

    // ========================================
    // Payment Methods Summary
    // ========================================
    const paymentsByMethod = await prisma.payment.groupBy({
      by: ['method', 'type'],
      where: { companyId },
      _sum: { amount: true },
      _count: true,
    })

    // ========================================
    // Forecast Summary
    // ========================================
    const totalReceivables = receivables.reduce((sum, r) => sum + r.dueAmount, 0)
    const forecastBalance = currentBalance + totalReceivables - totalPayables

    // Next 30 days forecast
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const next30DaysReceivables = receivables
      .filter(r => !r.dueDate || r.dueDate <= thirtyDaysFromNow)
      .reduce((sum, r) => sum + r.dueAmount, 0)

    return NextResponse.json({
      success: true,
      data: {
        currentBalance,
        totalReceivables,
        totalPayables,
        netPosition: currentBalance + totalReceivables - totalPayables,
        
        historical: historicalData,
        
        forecast: {
          receipts: forecastReceipts,
          projectedBalance: forecastBalance,
          next30Days: {
            expectedReceipts: next30DaysReceivables,
            expectedPayments: 0,
          }
        },
        
        receivables: receivables.slice(0, 20),
        
        byMethod: paymentsByMethod.map(m => ({
          method: m.method,
          type: m.type,
          total: Number(m._sum.amount) || 0,
          count: m._count,
        })),
        
        stats: {
          overdueReceivables: receivables.filter(r => r.daysOverdue > 0).length,
          overdueAmount: receivables
            .filter(r => r.daysOverdue > 0)
            .reduce((sum, r) => sum + r.dueAmount, 0),
          avgCollectionDays: 0,
        }
      }
    })
  } catch (error) {
    console.error('Error fetching cash flow:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return NextResponse.json(
      { success: false, error: `Erro ao carregar fluxo de caixa: ${errorMessage}` },
      { status: 500 }
    )
  }
}
