
"use client";

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { Invoice, Business } from '@/types';

// Augment jsPDF interface for the autoTable plugin
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const generateInvoicePDF = (invoice: Invoice, business: Business) => {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 20; // vertical position

  // 1. Business Logo and Name
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(business.name || 'Your Business Name', 15, y);
  y += 10;
  
  // 2. Invoice Title
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 200, y - 10, { align: 'right' });
  
  y += 10;
  doc.setLineWidth(0.5);
  doc.line(15, y, 200, y);
  y += 10;

  // 3. Invoice & Customer Details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Left column: Bill To
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.customerName || 'N/A', 15, y + 5);
  
  // Right column: Invoice Info
  const rightColX = 140;
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE #:', rightColX, y);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.invoiceNumber, rightColX + 25, y);

  doc.setFont('helvetica', 'bold');
  doc.text('DATE ISSUED:', rightColX, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(format(new Date(invoice.dateIssued), 'PPP'), rightColX + 25, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.text('DUE DATE:', rightColX, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.text(format(new Date(invoice.dueDate), 'PPP'), rightColX + 25, y + 10);

  y += 25;

  // 4. Invoice Items Table
  const tableHead = [['Description', 'Quantity', 'Unit Price (GHS)', 'Total (GHS)']];
  const tableBody = invoice.items.map(item => [
    item.description,
    item.quantity.toString(),
    item.unitPrice.toFixed(2),
    item.total.toFixed(2),
  ]);

  autoTable(doc, {
    head: tableHead,
    body: tableBody,
    startY: y,
    theme: 'striped',
    headStyles: { fillColor: [38, 109, 118] }, // Using a teal color from the theme
    styles: { fontSize: 10 },
  });

  y = (doc as any).lastAutoTable.finalY + 15;
  if (y > pageHeight - 60) {
      doc.addPage();
      y = 15;
  }

  // 5. Totals Section
  const totalSectionX = 130;
  doc.setFontSize(10);
  
  const addTotalLine = (label: string, value: string, isBold = false) => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.text(label, totalSectionX, y, { align: 'left' });
    doc.text(value, 200, y, { align: 'right' });
    y += 6;
  };
  
  addTotalLine('Subtotal:', `GHS ${invoice.subtotal.toFixed(2)}`);
  if (invoice.taxDetails) {
    addTotalLine(`VAT (${(invoice.taxDetails.vatRate * 100).toFixed(1)}%):`, `GHS ${invoice.taxDetails.vatAmount.toFixed(2)}`);
    addTotalLine(`NHIL (${(invoice.taxDetails.nhilRate * 100).toFixed(1)}%):`, `GHS ${invoice.taxDetails.nhilAmount.toFixed(2)}`);
    addTotalLine(`GETFund (${(invoice.taxDetails.getFundRate * 100).toFixed(1)}%):`, `GHS ${invoice.taxDetails.getFundAmount.toFixed(2)}`);
  }
  
  y += 2;
  doc.setLineWidth(0.2);
  doc.line(totalSectionX - 5, y, 200, y);
  y += 5;

  doc.setFontSize(12);
  addTotalLine('TOTAL AMOUNT:', `GHS ${invoice.totalAmount.toFixed(2)}`, true);
  doc.setFontSize(10);
  addTotalLine('Amount Paid:', `GHS ${invoice.totalPaidAmount.toFixed(2)}`);
  
  y += 2;
  doc.setLineWidth(0.2);
  doc.line(totalSectionX - 5, y, 200, y);
  y += 5;

  doc.setFontSize(12);
  addTotalLine('Amount Due:', `GHS ${(invoice.totalAmount - invoice.totalPaidAmount).toFixed(2)}`, true);

  y += 10;
  
  // 6. Notes
  if (invoice.notes) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes & Terms:', 15, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const notesText = doc.splitTextToSize(invoice.notes, 180);
    doc.text(notesText, 15, y);
  }
  
  // 7. Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, pageHeight - 10, { align: 'center' });
    doc.text(`Thank you for your business! - ${business.name || 'Your Company'}`, 15, pageHeight - 10);
  }

  // Save the PDF
  doc.save(`Invoice-${invoice.invoiceNumber}.pdf`);
};
