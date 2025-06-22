

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

export interface ItemCategory {
  id: string;
  name: string;
  businessId: string;
  createdAt: Date;
}

export interface Item {
  id:string;
  type: ItemType;
  name: string;
  sku?: string;
  description?: string;
  categoryId?: string;
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

export const paymentMethods = ["Cash", "Mobile Money", "Bank Transfer", "Cheque", "Card", "Other"] as const;
export type PaymentMethod = typeof paymentMethods[number];


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
  totalPaidAmount: number; // Sum of all payments for this invoice
  status: InvoiceStatus;
  dateIssued: Date;
  dueDate: Date;
  notes?: string;
  pdfUrl?: string;
  createdAt: Date;
  businessId?: string; 
}

export interface ExpenseCategory {
  id: string;
  name: string;
  businessId: string;
  createdAt: Date;
}

export interface Expense {
  id: string;
  businessId: string;
  date: Date;
  vendor: string;
  categoryId: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  recordedBy: string;
  createdAt: Date;
  updatedAt?: Date;
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

export interface PAYEBracket {
    id: string;
    from: number;
    to: number | null; // null for the highest bracket
    rate: number; // e.g., 0.175 for 17.5%
}

export interface SSNITRates {
    employeeContribution: number; // e.g., 0.055 for 5.5%
    employerContribution: number; // e.g., 0.13 for 13%
}

export interface PayrollSettings {
    payeBrackets: PAYEBracket[];
    ssnitRates: SSNITRates;
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
  updatedAt?: Date;
  settings?: {
    tax?: TaxSettings;
    payroll?: PayrollSettings;
  }
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

// Types for Cash Sales Module
export interface CashSaleItem {
  id: string; // Unique ID for this line item within the sale
  itemId?: string; // Optional: ID of the product/service from the 'items' collection
  description: string; // Name/description of the item/service sold
  quantity: number;
  unitPrice: number;
  total: number; // quantity * unitPrice
}

export interface CashSale {
  id: string; // Firestore document ID
  saleNumber: string; // User-friendly sale identifier (e.g., CSALE-2024-001)
  businessId: string;
  customerId?: string; // Optional: Link to a customer
  customerName?: string; // Optional: Manually entered customer name if not linked
  items: CashSaleItem[];
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
  paymentMethod: PaymentMethod; // Payment is immediate for cash sales
  paymentReference?: string; // Optional: Transaction ID, etc.
  date: Date; // Date of the sale
  notes?: string;
  recordedBy: string; // UID of the user who recorded the sale
  createdAt: Date; // Firestore server timestamp
  updatedAt?: Date; // Optional: For tracking updates
}

// Types for Payroll Module
export type EmployeeCompensationType = 'Salary' | 'Wage';
export const employeeCompensationTypes: EmployeeCompensationType[] = ['Salary', 'Wage'];

export type WagePeriod = 'Hour' | 'Day';
export const wagePeriods: WagePeriod[] = ['Hour', 'Day'];

export interface Employee {
  id: string;
  businessId: string;
  name: string;
  role: string; // e.g., "Developer", "Designer", "Manager"
  startDate: Date;
  email?: string;
  phone?: string;

  compensationType: EmployeeCompensationType;
  // For Salary
  grossSalary?: number; // Monthly gross salary
  // For Wage
  wageRate?: number;
  wagePeriod?: WagePeriod;

  ssnitNumber?: string;
  tinNumber?: string; // Tax Identification Number

  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface PayrollItem {
    employeeId: string;
    employeeName: string;
    grossPay: number;
    employeeSSNIT: number;
    taxableIncome: number;
    paye: number;
    netPay: number;
}

export interface PayrollRun {
    id: string;
    businessId: string;
    periodStartDate: Date;
    periodEndDate: Date;
    paymentDate: Date;
    items: PayrollItem[];
    totalGrossPay: number;
    totalEmployeeSSNIT: number;
    totalEmployerSSNIT: number;
    totalPAYE: number;
    totalNetPay: number;
    totalCostToBusiness: number; // Gross Pay + Employer SSNIT
    status: 'Draft' | 'Completed';
    expenseId?: string; // Link to the expense record created
    completedBy: string;
    completedAt: Date;
}
