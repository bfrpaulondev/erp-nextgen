/**
 * Payment Receipt PDF API
 * Generates PDF receipt for a payment
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

    // Get payment with all details
    const payment = await prisma.payment.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
      include: {
        customer: true,
        invoice: true,
        company: true,
      },
    })

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Pagamento não encontrado' },
        { status: 404 }
      )
    }

    const company = payment.company
    const isReceipt = payment.type === 'RECEIPT'

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

    // Document title on the right
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    const docTitle = isReceipt ? 'Recibo' : 'Comprovativo de Pagamento'
    doc.text(docTitle, pageWidth - margin, yPos, { align: 'right' })
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(payment.number, pageWidth - margin, yPos + 7, { align: 'right' })

    yPos = 55

    // Separator line
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 10

    // ===========================================
    // Payment Details
    // ===========================================

    // Entity info
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(isReceipt ? 'RECEBIDO DE' : 'PAGO A', margin, yPos)
    
    doc.setFont('helvetica', 'normal')
    doc.text(payment.customer?.name || 'N/A', margin, yPos + 6)
    
    if (payment.customer?.fiscalId) {
      doc.text(`NIF: ${payment.customer.fiscalId}`, margin, yPos + 12)
    }
    
    if (payment.customer?.address) {
      doc.text(payment.customer.address, margin, yPos + 18)
    }

    // Payment details on the right
    const detailsX = pageWidth - 70
    doc.setFont('helvetica', 'bold')
    doc.text('DATA', detailsX, yPos)
    doc.text('MÉTODO', detailsX, yPos + 10)
    
    doc.setFont('helvetica', 'normal')
    doc.text(
      new Date(payment.date).toLocaleDateString('pt-PT'),
      detailsX + 30, yPos
    )
    doc.text(methodLabels[payment.method] || payment.method, detailsX + 30, yPos + 10)

    yPos += 45

    // ===========================================
    // Amount Box
    // ===========================================

    doc.setFillColor(240, 240, 240)
    doc.rect(margin, yPos, pageWidth - 2 * margin, 30, 'F')
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(isReceipt ? 'VALOR RECEBIDO' : 'VALOR PAGO', margin + 5, yPos + 12)
    
    doc.setFontSize(16)
    const amountText = new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: company.currency as 'EUR' | 'AOA',
    }).format(Number(payment.amount))
    doc.text(amountText, pageWidth - margin - 5, yPos + 18, { align: 'right' })

    yPos += 45

    // ===========================================
    // Reference and Notes
    // ===========================================

    if (payment.reference) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Referência:', margin, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(payment.reference, margin + 30, yPos)
      yPos += 10
    }

    if (payment.invoice) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Documento Relacionado:', margin, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(`${payment.invoice.number}`, margin + 55, yPos)
      yPos += 10
    }

    if (payment.notes) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Observações:', margin, yPos)
      yPos += 5
      doc.setFont('helvetica', 'normal')
      const notes = doc.splitTextToSize(payment.notes, pageWidth - 2 * margin)
      doc.text(notes, margin, yPos)
      yPos += notes.length * 5 + 5
    }

    // ===========================================
    // Footer
    // ===========================================

    const footerY = doc.internal.pageSize.getHeight() - 25
    
    // Signature line
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, footerY - 10, pageWidth / 2 - 20, footerY - 10)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('Assinatura', margin + 30, footerY - 5, { align: 'center' })

    // Generated info
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(
      `Documento gerado em ${new Date().toLocaleDateString('pt-PT')} às ${new Date().toLocaleTimeString('pt-PT')}`,
      pageWidth / 2,
      footerY + 10,
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
        'Content-Disposition': `attachment; filename="${payment.number}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error generating receipt:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao gerar recibo' },
      { status: 500 }
    )
  }
}
