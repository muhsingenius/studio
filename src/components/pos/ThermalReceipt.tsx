
"use client";

import type { Business, CashSale } from '@/types';
import { format } from 'date-fns';
import './ThermalReceipt.css';
import Image from 'next/image';

interface ThermalReceiptProps {
  sale: CashSale | null;
  business: Business | null;
}

export default function ThermalReceipt({ sale, business }: ThermalReceiptProps) {
  // This component will be rendered but invisible on the screen,
  // and only made visible for printing via CSS.
  if (!sale || !business) {
    return null;
  }

  return (
    <div className="thermal-receipt">
      <div className="receipt-header">
        {business.logoUrl && (
           <Image
            src={business.logoUrl}
            alt={`${business.name} Logo`}
            width={100}
            height={50}
            className="receipt-logo"
            data-ai-hint="logo company"
          />
        )}
        <h1>{business.name}</h1>
        {business.location && <p>{business.location}</p>}
      </div>

      <div className="receipt-info">
        <p>Sale #: {sale.saleNumber}</p>
        <p>Date: {format(new Date(sale.date), 'yyyy-MM-dd HH:mm:ss')}</p>
        <p>Customer: {sale.customerName || 'Walk-in Customer'}</p>
      </div>

      <hr className="receipt-separator" />

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item) => (
            <tr key={item.id}>
              <td>{item.description}</td>
              <td className="text-center">{item.quantity}</td>
              <td className="text-right">{item.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr className="receipt-separator" />

      <div className="receipt-totals">
        <p><span>Subtotal:</span> <span>{sale.subtotal.toFixed(2)}</span></p>
        <p><span>Total Tax:</span> <span>{sale.taxDetails.totalTax.toFixed(2)}</span></p>
        <p className="total"><span>TOTAL:</span> <span>GHS {sale.totalAmount.toFixed(2)}</span></p>
      </div>
      
      <div className="receipt-payment">
         <hr className="receipt-separator" />
         <p><span>Payment Method:</span> <span>{sale.paymentMethod}</span></p>
         {sale.paymentReference && <p><span>Reference:</span> <span>{sale.paymentReference}</span></p>}
      </div>

      <div className="receipt-footer">
        <p>Thank you for your business!</p>
      </div>
    </div>
  );
}
