
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import InvoiceDetailsDisplay from "@/components/invoices/InvoiceDetailsDisplay";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit } from "lucide-react";
import type { Invoice } from "@/types";
import { db } from "@/lib/firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export default function ViewInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const invoiceId = typeof params.id === 'string' ? params.id : null;

  useEffect(() => {
    if (!invoiceId) {
      setError("Invalid invoice ID.");
      setIsLoading(false);
      toast({ title: "Error", description: "Invalid invoice ID provided.", variant: "destructive" });
      router.push("/invoices");
      return;
    }

    const fetchInvoice = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const invoiceDocRef = doc(db, "invoices", invoiceId);
        const docSnap = await getDoc(invoiceDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const fetchedInvoice = {
            id: docSnap.id,
            ...data,
            dateIssued: (data.dateIssued as Timestamp)?.toDate ? (data.dateIssued as Timestamp).toDate() : new Date(data.dateIssued),
            dueDate: (data.dueDate as Timestamp)?.toDate ? (data.dueDate as Timestamp).toDate() : new Date(data.dueDate),
            totalPaidAmount: data.totalPaidAmount || 0, // Ensure totalPaidAmount is present
            createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate() : new Date(),
          } as Invoice;
          setInvoice(fetchedInvoice);
        } else {
          setError("Invoice not found.");
          toast({ title: "Not Found", description: `Invoice with ID ${invoiceId} does not exist.`, variant: "destructive" });
        }
      } catch (err: any) {
        console.error("Error fetching invoice: ", err);
        setError("Failed to fetch invoice data.");
        toast({ title: "Error", description: "Could not retrieve invoice details.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoice();
  }, [invoiceId, toast, router]);

  if (isLoading) {
    return (
      <AuthGuard>
        <AuthenticatedLayout>
          <LoadingSpinner fullPage />
        </AuthenticatedLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <AuthenticatedLayout>
        <PageHeader
          title={invoice ? `Invoice ${invoice.invoiceNumber}` : "View Invoice"}
          description={invoice ? `Details for invoice issued to ${invoice.customerName || 'N/A'}` : "Loading invoice details..."}
          actions={
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => router.push("/invoices")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Invoices
              </Button>
              {invoice && (
                <Button onClick={() => router.push(`/invoices/${invoice.id}/edit`)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Invoice
                </Button>
              )}
            </div>
          }
        />
        {error && (
          <div className="text-center py-10 text-destructive bg-destructive/10 p-4 rounded-md">
            <p className="text-lg font-semibold">Error</p>
            <p>{error}</p>
          </div>
        )}
        {invoice && !error && <InvoiceDetailsDisplay invoice={invoice} />}
        {!invoice && !isLoading && !error && (
             <div className="text-center py-10 text-muted-foreground">
                <p>Could not load invoice details.</p>
             </div>
        )}
      </AuthenticatedLayout>
    </AuthGuard>
  );
}
