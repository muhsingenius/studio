

export type Role = "Admin" | "Accountant" | "Staff";

export interface User {
  id: string;
  email: string | null;
  name?: string | null;
  role: Role;
  businessId?: string; // Added to link user to a business
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  location: string;
  createdAt: Date; // Represents Firestore Timestamp converted to Date client-side
  businessId: string; // Now required
  createdBy: string; // UID of the user who created the customer
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
  businessId?: string; // Optional: To scope items to a business
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  itemId?: string;
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
  businessId?: string; // Optional: To scope invoices to a business
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
  businessId?: string; // Optional: To scope expenses to a business
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
  businessId?: string; // To scope tax settings to a business
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

// New Interfaces for Business Management
export interface Business {
  id: string;
  name: string;
  industry?: string;
  location?: string;
  currency?: string;
  logoUrl?: string; // Added for business logo
  createdBy: string; // UID of the user who created the business
  adminUids: string[]; // Array of UIDs of users who are admins for this business
  createdAt: Date;
}

export interface BusinessUser {
  // Document ID might be composite: {businessId}_{userId}
  // Or fields:
  userId: string;
  businessId: string;
  role: Role; // Role within this specific business
  isActive: boolean;
  joinedAt: Date;
}

