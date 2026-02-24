/**
 * Dashboard API
 * Provides summary data for the dashboard and notifications
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

// ===========================================
// GET - Dashboard summary data
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

    const companyId = session.user.companyId

    // Get current month bounds
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Run all queries in parallel for better performance
    const [
      invoicesCount,
      pendingInvoices,
      overdueInvoices,
      draftInvoicesCount,
      customersCount,
      suppliersCount,
      itemsCount,
      lowStockItems,
      monthlyRevenue,
      monthlyExpenses,
    ] = await Promise.all([
      // Total invoices count
      prisma.invoice.count({
        where: { companyId },
      }),
      
      // Pending invoices
      prisma.invoice.findMany({
        where: {
          companyId,
          status: { in: ['PENDING', 'PARTIAL'] },
        },
        select: {
          id: true,
          number: true,
          customerName: true,
          totalAmount: true,
          paidAmount: true,
          dueDate: true,
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
      
      // Overdue invoices (pending and past due date)
      prisma.invoice.findMany({
        where: {
          companyId,
          status: { in: ['PENDING', 'PARTIAL'] },
          dueDate: { lt: now },
        },
        select: {
          id: true,
          number: true,
          customerName: true,
          totalAmount: true,
        },
      }),
      
      // Draft invoices count
      prisma.invoice.count({
        where: {
          companyId,
          status: 'DRAFT',
        },
      }),
      
      // Customers count
      prisma.party.count({
        where: {
          companyId,
          type: { in: ['CUSTOMER', 'BOTH'] },
        },
      }),
      
      // Suppliers count
      prisma.party.count({
        where: {
          companyId,
          type: { in: ['SUPPLIER', 'BOTH'] },
        },
      }),
      
      // Items count
      prisma.item.count({
        where: { companyId },
      }),
      
      // Low stock items
      prisma.item.findMany({
        where: {
          companyId,
          type: 'PRODUCT',
        },
        select: {
          id: true,
          code: true,
          name: true,
          stock: true,
          minStock: true,
        },
        take: 20,
      }),
      
      // Monthly revenue (receipts)
      prisma.payment.aggregate({
        where: {
          companyId,
          type: 'RECEIPT',
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      }),
      
      // Monthly expenses (payments)
      prisma.payment.aggregate({
        where: {
          companyId,
          type: 'PAYMENT',
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { amount: true },
      }),
    ])

    // Calculate totals
    const totalPending = pendingInvoices.reduce((sum, inv) => {
      return sum + (inv.totalAmount - inv.paidAmount)
    }, 0)

    const totalOverdue = overdueInvoices.reduce((sum, inv) => {
      return sum + inv.totalAmount
    }, 0)

    // Filter low stock items
    const actualLowStockItems = lowStockItems.filter(item => {
      const stock = item.stock ?? 0
      const minStock = item.minStock ?? 0
      return stock <= minStock
    })

    // Build response
    const dashboardData = {
      summary: {
        totalInvoices: invoicesCount,
        totalCustomers: customersCount,
        totalSuppliers: suppliersCount,
        totalItems: itemsCount,
        pendingAmount: totalPending,
        overdueAmount: totalOverdue,
        monthlyRevenue: monthlyRevenue._sum.amount || 0,
        monthlyExpenses: monthlyExpenses._sum.amount || 0,
      },
      pendingInvoices: pendingInvoices.map(inv => ({
        ...inv,
        dueAmount: inv.totalAmount - inv.paidAmount,
      })),
      alerts: {
        overdueInvoices: overdueInvoices,
        lowStockItems: actualLowStockItems,
        draftInvoices: draftInvoicesCount,
      },
    }

    return NextResponse.json({
      success: true,
      data: dashboardData,
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao carregar dados do dashboard' },
      { status: 500 }
    )
  }
}
