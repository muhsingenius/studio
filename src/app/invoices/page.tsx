
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
import { Card } from "@/components/ui/card";
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
import { db } from "@/lib/firebase";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  Timestamp
} from "firebase/firestore";

const getStatusVariant = (status: InvoiceStatus): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "Paid": return "default";
    case "Pending": return "secondary";
    case "Overdue": return "destructive";
    default: return "outline";
  }
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    const invoicesCollectionRef = collection(db, "invoices");
    // Consider ordering by dateIssued or createdAt in descending order
    const q = query(invoicesCollectionRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const invoicesData = querySnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          ...data,
          dateIssued: (data.dateIssued as Timestamp)?.toDate ? (data.dateIssued as Timestamp).toDate() : new Date(data.dateIssued),
          dueDate: (data.dueDate as Timestamp)?.toDate ? (data.dueDate as Timestamp).toDate() : new Date(data.dueDate),
          createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate() : new Date(),
        } as Invoice;
      });
      setInvoices(invoicesData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching invoices: ", error);
      toast({ title: "Error", description: "Could not fetch invoices.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handleDeleteInvoice = async (invoiceId: string) => {
    setIsDeleting(true);
    try {
      const invoiceDocRef = doc(db, "invoices", invoiceId);
      await deleteDoc(invoiceDocRef);
      toast({ title: "Invoice Deleted", description: "The invoice has been deleted.", variant: "destructive" });
    } catch (error) {
      console.error("Error deleting invoice: ", error);
      toast({ title: "Error", description: "Could not delete invoice.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
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

        {isLoading && invoices.length === 0 && <LoadingSpinner fullPage />}

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
                {!isLoading && filteredInvoices.length > 0 ? (
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
                        <Button variant="ghost" size="icon" title="View Invoice" disabled> {/* View page not yet created */}
                           <ViewIcon className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Edit Invoice" disabled> {/* Edit page not yet created */}
                            <Edit className="h-4 w-4 text-yellow-600" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Download PDF" disabled> {/* Placeholder action */}
                            <FileDown className="h-4 w-4 text-gray-600" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" title="Delete Invoice" disabled={isDeleting}>
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
                                disabled={isDeleting}
                              >
                                {isDeleting ? <LoadingSpinner size={16} /> : "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                   !isLoading && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                       {invoices.length === 0 ? "No invoices yet. Create your first invoice!" : "No invoices match your search."}
                      </TableCell>
                    </TableRow>
                   )
                )}
              </TableBody>
            </Table>
            {isLoading && invoices.length > 0 && <div className="p-4 text-center"><LoadingSpinner /></div>}
          </div>
        </Card>
      </AuthenticatedLayout>
    </AuthGuard>
  );
}

    
