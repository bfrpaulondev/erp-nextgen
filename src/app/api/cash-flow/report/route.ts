/**
 * Cash Flow Report PDF API
 * Generates PDF report for treasury
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const methodLabels: Record<string, string> = {
  CASH: 'Dinheiro',
  BANK_TRANSFER: 'Transferência Bancária',
  CARD: 'Cartão',
  CHECK: 'Cheque',
  DIRECT_DEBIT: 'Débito Direto',
  MBWAY: 'MB WAY',
  OTHER: 'Outro',
}

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
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

    const companyId = session.user.companyId

    // Get company
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    })

    if (!company) {
      return NextResponse.json(
        { success: false, error: 'Empresa não encontrada' },
        { status: 404 }
      )
    }

    // Build date filter
    const dateFilter: Record<string, Date> = {}
    if (fromDate) dateFilter.gte = new Date(fromDate)
    if (toDate) dateFilter.lte = new Date(toDate)

    // Get totals
    const [totalReceipts, totalPayments, byMethod] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          companyId,
          type: 'RECEIPT',
          ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
        },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: {
          companyId,
          type: 'PAYMENT',
          ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
        },
        _sum: { amount: true },
      }),
      prisma.payment.groupBy({
        by: ['method', 'type'],
        where: {
          companyId,
          ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
        },
        _sum: { amount: true },
        _count: true,
      }),
    ])

    const currency = company.currency as 'EUR' | 'AOA'
    const totalReceiptsAmount = totalReceipts._sum.amount || 0
    const totalPaymentsAmount = totalPayments._sum.amount || 0
    const netFlow = Number(totalReceiptsAmount) - Number(totalPaymentsAmount)

    // Create PDF
    const doc = new jsPDF() as jsPDF & { lastAutoTable: { finalY: number } }
    
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 15
    let yPos = 20

    // ===========================================
    // Header - Company Info
    // ===========================================
    
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(company.name, margin, yPos)
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    
    if (company.nif) doc.text(`NIF: ${company.nif}`, margin, yPos + 6)
    if (company.address) doc.text(company.address, margin, yPos + 12)

    // Document title on the right
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Relatório de Tesouraria', pageWidth - margin, yPos, { align: 'right' })
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    if (fromDate && toDate) {
      doc.text(`${fromDate} a ${toDate}`, pageWidth - margin, yPos + 6, { align: 'right' })
    }

    yPos = 45

    // Separator line
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 15

    // ===========================================
    // Summary Box
    // ===========================================

    doc.setFillColor(240, 240, 240)
    doc.rect(margin, yPos, pageWidth - 2 * margin, 35, 'F')
    
    const colWidth = (pageWidth - 2 * margin) / 3
    
    // Total Recebimentos
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL RECEBIMENTOS', margin + 10, yPos + 10)
    doc.setFontSize(14)
    doc.setTextColor(34, 197, 94)
    doc.text(
      new Intl.NumberFormat('pt-PT', { style: 'currency', currency }).format(Number(totalReceiptsAmount)),
      margin + 10, yPos + 22
    )
    
    // Total Pagamentos
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL PAGAMENTOS', margin + colWidth + 10, yPos + 10)
    doc.setFontSize(14)
    doc.setTextColor(239, 68, 68)
    doc.text(
      new Intl.NumberFormat('pt-PT', { style: 'currency', currency }).format(Number(totalPaymentsAmount)),
      margin + colWidth + 10, yPos + 22
    )
    
    // Fluxo Líquido
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('FLUXO LÍQUIDO', margin + colWidth * 2 + 10, yPos + 10)
    doc.setFontSize(14)
    doc.setTextColor(netFlow >= 0 ? 34 : 239, netFlow >= 0 ? 197 : 68, netFlow >= 0 ? 94 : 68)
    doc.text(
      new Intl.NumberFormat('pt-PT', { style: 'currency', currency }).format(netFlow),
      margin + colWidth * 2 + 10, yPos + 22
    )

    doc.setTextColor(0, 0, 0)
    yPos += 50

    // ===========================================
    // By Method Table
    // ===========================================

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Detalhamento por Método de Pagamento', margin, yPos)
    yPos += 10

    const tableData = byMethod.map(item => [
      methodLabels[item.method] || item.method,
      item.type === 'RECEIPT' ? 'Recebimento' : 'Pagamento',
      item._count.toString(),
      new Intl.NumberFormat('pt-PT', { style: 'currency', currency }).format(Number(item._sum.amount || 0)),
    ])

    autoTable(doc, {
      startY: yPos,
      head: [['Método', 'Tipo', 'Transações', 'Total']],
      body: tableData,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 9,
        cellPadding: 4,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 40 },
        2: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 40, halign: 'right' },
      },
    })

    yPos = doc.lastAutoTable.finalY + 20

    // ===========================================
    // Footer
    // ===========================================

    const footerY = doc.internal.pageSize.getHeight() - 15
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(
      `Relatório gerado em ${new Date().toLocaleDateString('pt-PT')} às ${new Date().toLocaleTimeString('pt-PT')}`,
      pageWidth / 2,
      footerY,
      { align: 'center' }
    )

    // ===========================================
    // Return PDF
    // ===========================================

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="relatorio_tesouraria_${fromDate || 'inicio'}_${toDate || 'fim'}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao gerar relatório' },
      { status: 500 }
    )
  }
}
