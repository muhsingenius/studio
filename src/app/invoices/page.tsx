
"use client";

import { useState, useEffect } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { PlusCircle, Edit, Trash2, Search, Eye as ViewIcon, FileDown } from "lucide-react";
import Link from "next/link";
import type { Invoice, InvoiceStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card"; // Added import
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { cn } from "@/lib/utils";

// Placeholder data - replace with Firestore integration
const initialInvoices: Invoice[] = [
  { 
    id: "1", invoiceNumber: "INV-202407-0001", customerId: "1", customerName: "Kwame Enterprise",
    items: [{ id: "i1", description: "Web Design Services", quantity: 1, unitPrice: 1200, total: 1200 }],
    subtotal: 1200, 
    taxDetails: { vatRate: 0.15, nhilRate: 0.025, getFundRate: 0.025, vatAmount: 180, nhilAmount: 30, getFundAmount: 30, totalTax: 240 },
    totalAmount: 1440, status: "Paid", dateIssued: new Date("2024-07-01"), dueDate: new Date("2024-07-31"), createdAt: new Date()
  },
  { 
    id: "2", invoiceNumber: "INV-202407-0002", customerId: "2", customerName: "Adoma Services Ltd",
    items: [{ id: "i2", description: "Consulting Hours", quantity: 10, unitPrice: 150, total: 1500 }],
    subtotal: 1500, 
    taxDetails: { vatRate: 0.15, nhilRate: 0.025, getFundRate: 0.025, vatAmount: 225, nhilAmount: 37.5, getFundAmount: 37.5, totalTax: 300 },
    totalAmount: 1800, status: "Pending", dateIssued: new Date("2024-07-15"), dueDate: new Date("2024-08-14"), createdAt: new Date()
  },
  { 
    id: "3", invoiceNumber: "INV-202406-0001", customerId: "1", customerName: "Kwame Enterprise",
    items: [{ id: "i3", description: "Software License", quantity: 1, unitPrice: 500, total: 500 }],
    subtotal: 500, 
    taxDetails: { vatRate: 0.15, nhilRate: 0.025, getFundRate: 0.025, vatAmount: 75, nhilAmount: 12.5, getFundAmount: 12.5, totalTax: 100 },
    totalAmount: 600, status: "Overdue", dateIssued: new Date("2024-06-10"), dueDate: new Date("2024-07-10"), createdAt: new Date()
  },
];

const getStatusVariant = (status: InvoiceStatus): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "Paid": return "default"; // Or a success-like color, "default" is often primary
    case "Pending": return "secondary";
    case "Overdue": return "destructive";
    default: return "outline";
  }
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Simulate fetching invoices
  useEffect(() => {
    // In a real app, fetch from Firestore here
  }, []);

  const handleDeleteInvoice = async (invoiceId: string) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    setInvoices(invoices.filter(inv => inv.id !== invoiceId));
    toast({ title: "Invoice Deleted", description: "The invoice has been deleted.", variant: "destructive" });
    setIsLoading(false);
  };

  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (invoice.customerName && invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    invoice.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AuthGuard>
      <AuthenticatedLayout>
        <PageHeader
          title="Invoices"
          description="Manage all your business invoices."
          actions={
            <Link href="/invoices/new" passHref>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <PlusCircle className="mr-2 h-5 w-5" /> Create New Invoice
              </Button>
            </Link>
          }
        />

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by Invoice #, Customer, or Status..."
              className="w-full pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading && invoices.length === 0 && <LoadingSpinner />}

        <Card className="shadow-lg">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date Issued</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length > 0 ? (
                  filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.customerName || "N/A"}</TableCell>
                      <TableCell>{format(new Date(invoice.dateIssued), "dd MMM, yyyy")}</TableCell>
                      <TableCell>{format(new Date(invoice.dueDate), "dd MMM, yyyy")}</TableCell>
                      <TableCell>GHS {invoice.totalAmount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(invoice.status)} className={cn(
                            invoice.status === "Paid" ? "bg-green-500/20 text-green-700 border-green-500/30" : "",
                            invoice.status === "Pending" ? "bg-yellow-500/20 text-yellow-700 border-yellow-500/30" : "",
                            invoice.status === "Overdue" ? "bg-red-500/20 text-red-700 border-red-500/30" : ""
                        )}>
                            {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" title="View Invoice" asChild>
                          <Link href={`/invoices/${invoice.id}`}> {/* Placeholder: View page not yet created */}
                             <ViewIcon className="h-4 w-4 text-blue-600" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" title="Edit Invoice" asChild>
                           <Link href={`/invoices/edit/${invoice.id}`}> {/* Placeholder: Edit page not yet created */}
                            <Edit className="h-4 w-4 text-yellow-600" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" title="Download PDF"> {/* Placeholder action */}
                            <FileDown className="h-4 w-4 text-gray-600" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" title="Delete Invoice">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete invoice {invoice.invoiceNumber}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteInvoice(invoice.id)}
                                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                              >
                                {isLoading ? <LoadingSpinner size={16} /> : "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                       {invoices.length === 0 ? "No invoices yet. Create your first invoice!" : "No invoices match your search."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </AuthenticatedLayout>
    </AuthGuard>
  );
}
