
export type Role = "Admin" | "Accountant" | "Staff";

export interface User {
  id: string;
  email: string | null;
  name?: string | null;
  role: Role;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  location: string;
  createdAt: Date;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  unitPrice: number;
  quantityInStock: number; // Added for stock management
  createdAt: Date;
}

export interface InvoiceItem {
  id: string; // Can be a product ID or a unique ID for custom items
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  productId?: string; // Optional: to link back to a Product
}

export type InvoiceStatus = "Pending" | "Paid" | "Overdue";

export interface Invoice {
  id: string;
  invoiceNumber: string; // Auto-generated
  customerId: string;
  customerName?: string; // For display convenience
  items: InvoiceItem[];
  subtotal: number;
  taxDetails: {
    vatRate: number; // e.g., 0.15 for 15%
    nhilRate: number; // e.g., 0.025 for 2.5%
    getFundRate: number; // e.g., 0.025 for 2.5%
    vatAmount: number;
    nhilAmount: number;
    getFundAmount: number;
    totalTax: number;
  };
  totalAmount: number;
  status: InvoiceStatus;
  dateIssued: Date;
  dueDate: Date;
  notes?: string; // For AI generated text or other notes
  pdfUrl?: string; // Link to PDF if generated
  createdAt: Date;
}

export interface Expense {
  id:string;
  vendor: string;
  category: string;
  description?: string;
  amount: number;
  date: Date;
  paymentMethod: "Cash" | "Mobile Money" | "Bank Transfer" | "Cheque" | "Other";
  taxType?: string; // e.g., "Input VAT"
  createdAt: Date;
}

export interface TaxRate {
  id: string; // e.g., 'vat', 'nhil', 'getfund' or custom ID
  name: string; // e.g., 'VAT', 'NHIL', 'GETFund Levy'
  rate: number; // e.g., 0.15 for 15%
  description?: string;
  isDefault?: boolean; // True for VAT, NHIL, GETFund
}

export interface TaxSettings {
  vat: number; // 0.15
  nhil: number; // 0.025
  getFund: number; // 0.025
  customTaxes: TaxRate[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error";
  read: boolean;
  createdAt: Date;
  link?: string; // Optional link to related item, e.g., overdue invoice
}
