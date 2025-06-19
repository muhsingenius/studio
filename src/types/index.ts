
export type Role = "Admin" | "Accountant" | "Sales" | "Staff";

export interface User {
  id: string;
  email: string | null;
  name?: string | null;
  role: Role;
  businessId?: string; 
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  location: string;
  createdAt: Date; 
  businessId: string; 
  createdBy: string; 
}

export type ItemType = 'inventory' | 'non-inventory' | 'service' | 'digital' | 'bundle';

export interface Item {
  id: string;
  type: ItemType;
  name: string;
  sku?: string;
  description?: string;
  category?: string;
  sellingPrice: number;
  costPrice?: number;
  unit?: string;
  trackInventory: boolean;
  isActive: boolean;
  quantityOnHand?: number;
  reorderLevel?: number;
  warehouse?: string;
  batchOrSerialNo?: string;
  taxCode?: string;
  createdAt: Date;
  updatedAt?: Date;
  businessId?: string; 
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  itemId?: string;
}

export type InvoiceStatus = "Pending" | "Paid" | "Overdue" | "Partially Paid";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxDetails: {
    vatRate: number;
    nhilRate: number;
    getFundRate: number;
    vatAmount: number;
    nhilAmount: number;
    getFundAmount: number;
    totalTax: number;
  };
  totalAmount: number;
  totalPaidAmount: number;
  status: InvoiceStatus;
  dateIssued: Date;
  dueDate: Date;
  notes?: string;
  pdfUrl?: string;
  createdAt: Date;
  businessId?: string; 
}

export interface Expense {
  id:string;
  vendor: string;
  category: string;
  description?: string;
  amount: number;
  date: Date;
  paymentMethod: "Cash" | "Mobile Money" | "Bank Transfer" | "Cheque" | "Other";
  taxType?: string;
  createdAt: Date;
  businessId?: string; 
}

export interface TaxRate {
  id: string;
  name: string;
  rate: number;
  description?: string;
  isDefault?: boolean;
}

export interface TaxSettings {
  vat: number;
  nhil: number;
  getFund: number;
  customTaxes: TaxRate[];
  businessId?: string; 
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error";
  read: boolean;
  createdAt: Date;
  link?: string;
}

export interface Business {
  id: string;
  name: string;
  industry?: string;
  location?: string;
  currency?: string;
  logoUrl?: string; 
  createdBy: string; 
  adminUids: string[]; 
  createdAt: Date;
}

export interface BusinessUser {
  userId: string;
  businessId: string;
  role: Role; 
  isActive: boolean;
  joinedAt: Date;
}

// New Payment type
export interface Payment {
  id: string; 
  invoiceId: string; 
  businessId: string; 
  amountPaid: number;
  paymentDate: Date;
  paymentMethod: "Cash" | "Mobile Money" | "Bank Transfer" | "Cheque" | "Card" | "Other"; 
  paymentReference?: string; 
  notes?: string; 
  recordedBy: string; // User ID of who recorded it
  createdAt: Date; // Firestore server timestamp
}

