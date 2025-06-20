
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
  itemId?: string; // Link to Item.id if selected from inventory
}

export type InvoiceStatus = "Pending" | "Paid" | "Overdue" | "Partially Paid";
export type PaymentMethod = "Cash" | "Mobile Money" | "Bank Transfer" | "Cheque" | "Card" | "Other";


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
  paymentMethod: PaymentMethod;
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

export interface Payment {
  id: string; 
  invoiceId: string; 
  businessId: string; 
  amountPaid: number;
  paymentDate: Date;
  paymentMethod: PaymentMethod; 
  paymentReference?: string; 
  notes?: string; 
  recordedBy: string; 
  createdAt: Date; 
}

export const revenueSourceCategories = ["Direct Sale", "Service Rendered", "Commission", "Grant", "Interest Income", "Rental Income", "Donation", "Subscription", "Refund Received", "Other"] as const;
export type RevenueSourceCategory = typeof revenueSourceCategories[number];

export interface RevenueRecord {
  id: string;
  businessId: string;
  dateReceived: Date;
  source: RevenueSourceCategory; 
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string; 
  notes?: string;
  recordedBy: string; 
  createdAt: Date;
}

// Types for Direct Sales Module
export interface DirectSaleItem {
  id: string; // Unique ID for this line item within the sale
  itemId?: string; // Optional: ID of the product/service from the 'items' collection
  description: string; // Name/description of the item/service sold
  quantity: number;
  unitPrice: number;
  total: number; // quantity * unitPrice
}

export interface DirectSale {
  id: string; // Firestore document ID
  saleNumber: string; // User-friendly sale identifier (e.g., SALE-2024-001)
  businessId: string;
  customerId?: string; // Optional: Link to a customer
  customerName?: string; // Optional: Manually entered customer name if not linked
  items: DirectSaleItem[];
  subtotal: number;
  taxDetails: { // Consistent with Invoice tax details for now
    vatRate: number;
    nhilRate: number;
    getFundRate: number;
    vatAmount: number;
    nhilAmount: number;
    getFundAmount: number;
    totalTax: number;
  };
  totalAmount: number;
  paymentMethod: PaymentMethod; // Payment is immediate for direct sales
  paymentReference?: string; // Optional: Transaction ID, etc.
  date: Date; // Date of the sale
  notes?: string;
  recordedBy: string; // UID of the user who recorded the sale
  createdAt: Date; // Firestore server timestamp
}
