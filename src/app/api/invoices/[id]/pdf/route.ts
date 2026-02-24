/**
 * Invoice PDF Generation API
 * Generates PDF documents for invoices with QR Code (ATCUD compliant)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { DOCUMENT_TYPE_CONFIG, formatCurrency, formatDate } from '@/lib/invoice-utils'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import QRCode from 'qrcode'

// ===========================================
// Helper Functions
// ===========================================

function getDocumentTitle(type: string): string {
  const config = DOCUMENT_TYPE_CONFIG[type as keyof typeof DOCUMENT_TYPE_CONFIG]
  return config?.namePt || 'Documento'
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    DRAFT: 'RASCUNHO',
    FINALIZED: 'FINALIZADO',
    PENDING: 'PENDENTE',
    PAID: 'PAGO',
    PARTIAL: 'PAGAMENTO PARCIAL',
    CANCELLED: 'ANULADO',
  }
  return statusMap[status] || status
}

/**
 * Generate ATCUD code (simplified version for demonstration)
 * In production, this should integrate with the Portuguese Tax Authority
 */
function generateATCUD(
  seriesNumber: string,
  companyNif: string,
  date: Date,
  total: number
): string {
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '')
  const hash = Buffer.from(`${companyNif}${dateStr}${seriesNumber}${total}`).toString('base64').slice(0, 8)
  return `${seriesNumber}-${hash.toUpperCase()}`
}

/**
 * Generate QR Code data for Portuguese invoices
 * Format: A:CompanyNIF*B:CustomerNIF*C:DocumentType*D:DocumentNumber*E:Date*F:Total*G:ATCUD*H:CertificateNumber
 */
function generateQRData(
  companyNif: string,
  customerNif: string | null,
  docType: string,
  docNumber: string,
  date: Date,
  total: number,
  atcud: string
): string {
  const fields = [
    `A:${companyNif}`,
    `B:${customerNif || '999999990'}`, // Default for consumers without NIF
    `C:${docType}`,
    `D:${docNumber}`,
    `E:${date.toISOString().split('T')[0]}`,
    `F:${total.toFixed(2)}`,
    `G:${atcud}`,
    `H:0`, // Certificate number (would be assigned by AT)
  ]
  return fields.join('*')
}

// ===========================================
// GET - Generate PDF
// ===========================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.companyId) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Get invoice with all details
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
      include: {
        lines: {
          include: {
            item: true,
            taxRateRel: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        company: true,
        customer: true,
        payments: {
          orderBy: { date: 'desc' },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Documento não encontrado' },
        { status: 404 }
      )
    }

    // Get company details
    const company = invoice.company

    // Generate ATCUD code
    const atcud = generateATCUD(
      invoice.number,
      company.nif,
      new Date(invoice.date),
      Number(invoice.totalAmount)
    )

    // Generate QR Code data
    const qrData = generateQRData(
      company.nif,
      invoice.customerFiscalId,
      invoice.type,
      invoice.number,
      new Date(invoice.date),
      Number(invoice.totalAmount),
      atcud
    )

    // Generate QR Code as base64
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      width: 150,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })

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
    
    const companyDetails = []
    if (company.nif) companyDetails.push(`NIF: ${company.nif}`)
    if (company.address) companyDetails.push(company.address)
    if (company.city) companyDetails.push(company.city)
    if (company.postalCode) companyDetails.push(company.postalCode)
    if (company.phone) companyDetails.push(`Tel: ${company.phone}`)
    if (company.email) companyDetails.push(company.email)
    
    companyDetails.forEach((detail, index) => {
      doc.text(detail, margin, yPos + 8 + (index * 5))
    })

    // Document type and number on the right
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    const docTitle = getDocumentTitle(invoice.type)
    doc.text(docTitle, pageWidth - margin, yPos, { align: 'right' })
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(invoice.number, pageWidth - margin, yPos + 7, { align: 'right' })

    // Status
    if (invoice.status === 'CANCELLED') {
      doc.setTextColor(220, 38, 38)
      doc.setFontSize(10)
      doc.text(getStatusText(invoice.status), pageWidth - margin, yPos + 14, { align: 'right' })
      doc.setTextColor(0, 0, 0)
    }

    yPos = 55

    // Separator line
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 10

    // ===========================================
    // Document Details
    // ===========================================

    // Customer info on the left
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('CLIENTE', margin, yPos)
    
    doc.setFont('helvetica', 'normal')
    doc.text(invoice.customerName, margin, yPos + 6)
    
    let customerY = yPos + 12
    if (invoice.customerFiscalId) {
      doc.text(`NIF: ${invoice.customerFiscalId}`, margin, customerY)
      customerY += 5
    }
    if (invoice.customerAddress) {
      doc.text(invoice.customerAddress, margin, customerY)
      customerY += 5
    }

    // Document details on the right
    const detailsX = pageWidth - 70
    doc.setFont('helvetica', 'bold')
    doc.text('DATA', detailsX, yPos)
    doc.text('VENCIMENTO', detailsX, yPos + 10)
    
    doc.setFont('helvetica', 'normal')
    doc.text(formatDate(invoice.date), detailsX + 30, yPos)
    doc.text(invoice.dueDate ? formatDate(invoice.dueDate) : '-', detailsX + 30, yPos + 10)

    yPos = Math.max(customerY, yPos + 30) + 10

    // ===========================================
    // Items Table
    // ===========================================

    const tableData = invoice.lines.map((line, index) => [
      (index + 1).toString(),
      line.description,
      Number(line.quantity).toFixed(2),
      line.item?.unit || 'UN',
      formatCurrency(Number(line.unitPrice), company.currency as 'EUR' | 'AOA'),
      Number(line.discount).toFixed(1) + '%',
      formatCurrency(Number(line.taxRate), company.currency as 'EUR' | 'AOA') + '%',
      formatCurrency(Number(line.total), company.currency as 'EUR' | 'AOA'),
    ])

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Descrição', 'Qtd', 'Un', 'Preço', 'Desc', 'IVA', 'Total']],
      body: tableData,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: 3,
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
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 15, halign: 'right' },
        3: { cellWidth: 12, halign: 'center' },
        4: { cellWidth: 22, halign: 'right' },
        5: { cellWidth: 15, halign: 'center' },
        6: { cellWidth: 18, halign: 'right' },
        7: { cellWidth: 25, halign: 'right' },
      },
    })

    yPos = doc.lastAutoTable.finalY + 10

    // ===========================================
    // Totals
    // ===========================================

    const totalsX = pageWidth - margin - 80
    const totalsValueX = pageWidth - margin

    doc.setDrawColor(200, 200, 200)
    doc.line(totalsX - 10, yPos, pageWidth - margin, yPos)
    yPos += 8

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    
    // Subtotal
    doc.text('Subtotal', totalsX, yPos)
    doc.text(formatCurrency(Number(invoice.subtotal), company.currency as 'EUR' | 'AOA'), totalsValueX, yPos, { align: 'right' })
    yPos += 6

    // Discount
    if (Number(invoice.discountAmount) > 0) {
      doc.text('Desconto', totalsX, yPos)
      doc.text('-' + formatCurrency(Number(invoice.discountAmount), company.currency as 'EUR' | 'AOA'), totalsValueX, yPos, { align: 'right' })
      yPos += 6
    }

    // Tax
    doc.text('IVA', totalsX, yPos)
    doc.text(formatCurrency(Number(invoice.taxAmount), company.currency as 'EUR' | 'AOA'), totalsValueX, yPos, { align: 'right' })
    yPos += 8

    // Total
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('TOTAL', totalsX, yPos)
    doc.text(formatCurrency(Number(invoice.totalAmount), company.currency as 'EUR' | 'AOA'), totalsValueX, yPos, { align: 'right' })

    // Paid amount
    if (Number(invoice.paidAmount) > 0) {
      yPos += 8
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(34, 197, 94)
      doc.text('Pago', totalsX, yPos)
      doc.text(formatCurrency(Number(invoice.paidAmount), company.currency as 'EUR' | 'AOA'), totalsValueX, yPos, { align: 'right' })
      
      if (Number(invoice.paidAmount) < Number(invoice.totalAmount)) {
        yPos += 6
        doc.setTextColor(234, 88, 12)
        doc.text('Em dívida', totalsX, yPos)
        doc.text(
          formatCurrency(Number(invoice.totalAmount) - Number(invoice.paidAmount), company.currency as 'EUR' | 'AOA'),
          totalsValueX, yPos, { align: 'right' }
        )
      }
      doc.setTextColor(0, 0, 0)
    }

    yPos += 20

    // ===========================================
    // Notes
    // ===========================================

    if (invoice.notes) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('Observações:', margin, yPos)
      yPos += 5
      
      doc.setFont('helvetica', 'normal')
      const notes = doc.splitTextToSize(invoice.notes, pageWidth - 2 * margin)
      doc.text(notes, margin, yPos)
      yPos += notes.length * 4 + 5
    }

    // ===========================================
    // QR Code and ATCUD Section
    // ===========================================

    // Add QR Code
    const qrSize = 35
    const qrX = margin
    const qrY = yPos + 5

    // Add QR Code image
    doc.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)

    // ATCUD and certification info next to QR
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('ATCUD:', qrX + qrSize + 5, qrY + 8)
    doc.setFont('helvetica', 'normal')
    doc.text(atcud, qrX + qrSize + 20, qrY + 8)

    doc.setFont('helvetica', 'bold')
    doc.text('Certificado:', qrX + qrSize + 5, qrY + 14)
    doc.setFont('helvetica', 'normal')
    doc.text('Pendente de certificação', qrX + qrSize + 28, qrY + 14)

    // Tax breakdown
    doc.setFont('helvetica', 'bold')
    doc.text('IVA:', qrX + qrSize + 5, qrY + 22)
    doc.setFont('helvetica', 'normal')
    doc.text(formatCurrency(Number(invoice.taxAmount), company.currency as 'EUR' | 'AOA'), qrX + qrSize + 15, qrY + 22)

    yPos = qrY + qrSize + 15

    // ===========================================
    // Footer
    // ===========================================

    const footerY = doc.internal.pageSize.getHeight() - 15
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(
      `Documento gerado em ${new Date().toLocaleDateString('pt-PT')} às ${new Date().toLocaleTimeString('pt-PT')} | ERP Next-Gen`,
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
        'Content-Disposition': `attachment; filename="${invoice.number.replace(/\s+/g, '_')}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao gerar PDF' },
      { status: 500 }
    )
  }
}
