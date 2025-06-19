
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

export type ItemType = 'inventory' | 'non-inventory' | 'service' | 'digital' | 'bundle';

export interface Item {
  id: string;
  type: ItemType;
  name: string;
  sku?: string;
  description?: string;
  category?: string; // For simplicity, a string. Could be an ID linking to a categories collection.
  sellingPrice: number;
  costPrice?: number;
  unit?: string; // e.g., pcs, kg, hour
  trackInventory: boolean;
  isActive: boolean;
  quantityOnHand?: number; // Required if trackInventory is true or type is 'inventory'
  reorderLevel?: number;
  warehouse?: string;
  batchOrSerialNo?: string;
  taxCode?: string; // Placeholder for future tax integration
  createdAt: Date;
  updatedAt?: Date; // Optional: to track updates
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  itemId?: string; // Optional: to link back to an Item
}

export type InvoiceStatus = "Pending" | "Paid" | "Overdue";

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
  status: InvoiceStatus;
  dateIssued: Date;
  dueDate: Date;
  notes?: string;
  pdfUrl?: string;
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
  taxType?: string;
  createdAt: Date;
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
