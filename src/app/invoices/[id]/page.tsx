
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import InvoiceDetailsDisplay from "@/components/invoices/InvoiceDetailsDisplay";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, DollarSign } from "lucide-react";
import type { Invoice, Payment, InvoiceStatus } from "@/types";
import { db } from "@/lib/firebase";
import { doc, getDoc, Timestamp, updateDoc, collection, query, where, getDocs, addDoc, serverTimestamp, orderBy } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import PaymentForm, { type PaymentFormInputs } from "@/components/payments/PaymentForm";
import { isPast } from "date-fns";

export default function ViewInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  const invoiceId = typeof params.id === 'string' ? params.id : null;

  const fetchInvoiceAndPayments = useCallback(async () => {
    if (!invoiceId || !currentUser?.businessId) {
      setError(invoiceId ? "Business context not loaded." : "Invalid invoice ID.");
      setIsLoading(false);
      if (!invoiceId) router.push("/invoices");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Fetch Invoice
      const invoiceDocRef = doc(db, "invoices", invoiceId);
      const invoiceSnap = await getDoc(invoiceDocRef);

      if (invoiceSnap.exists() && invoiceSnap.data().businessId === currentUser.businessId) {
        const data = invoiceSnap.data();
        const fetchedInvoice = {
          id: invoiceSnap.id,
          ...data,
          dateIssued: (data.dateIssued as Timestamp)?.toDate ? (data.dateIssued as Timestamp).toDate() : new Date(data.dateIssued),
          dueDate: (data.dueDate as Timestamp)?.toDate ? (data.dueDate as Timestamp).toDate() : new Date(data.dueDate),
          totalPaidAmount: data.totalPaidAmount || 0,
          createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate() : new Date(),
        } as Invoice;
        setInvoice(fetchedInvoice);

        // Fetch Payments for this invoice
        const paymentsCollectionRef = collection(db, "payments");
        const q = query(
          paymentsCollectionRef,
          where("invoiceId", "==", invoiceId),
          where("businessId", "==", currentUser.businessId),
          orderBy("paymentDate", "desc")
        );
        const paymentSnapshot = await getDocs(q);
        const fetchedPayments = paymentSnapshot.docs.map(docSnapshot => {
          const paymentData = docSnapshot.data();
          return {
            id: docSnapshot.id,
            ...paymentData,
            paymentDate: (paymentData.paymentDate as Timestamp)?.toDate ? (paymentData.paymentDate as Timestamp).toDate() : new Date(paymentData.paymentDate),
            createdAt: (paymentData.createdAt as Timestamp)?.toDate ? (paymentData.createdAt as Timestamp).toDate() : new Date(),
          } as Payment;
        });
        setPayments(fetchedPayments);

      } else {
        setError(invoiceSnap.exists() ? "Access Denied." : "Invoice not found.");
        toast({ title: invoiceSnap.exists() ? "Access Denied" : "Not Found", description: invoiceSnap.exists() ? "This invoice does not belong to your business." :`Invoice with ID ${invoiceId} does not exist.`, variant: "destructive" });
        setInvoice(null);
        setPayments([]);
      }
    } catch (err: any) {
      console.error("Error fetching invoice and payments: ", err);
      setError("Failed to fetch invoice data.");
      toast({ title: "Error", description: "Could not retrieve invoice details.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId, toast, router, currentUser]);

  useEffect(() => {
    fetchInvoiceAndPayments();
  }, [fetchInvoiceAndPayments]);

  const handleRecordPayment = async (paymentData: PaymentFormInputs) => {
    if (!invoice || !currentUser || !currentUser.businessId) {
      toast({ title: "Error", description: "Cannot record payment. Missing invoice or user data.", variant: "destructive" });
      return;
    }
    setIsSavingPayment(true);
    try {
      // 1. Add payment to 'payments' collection
      const newPaymentRef = await addDoc(collection(db, "payments"), {
        ...paymentData,
        invoiceId: invoice.id,
        businessId: currentUser.businessId,
        recordedBy: currentUser.id,
        createdAt: serverTimestamp(),
      });

      // 2. Recalculate totalPaidAmount for the invoice
      const paymentsQuery = query(
        collection(db, "payments"),
        where("invoiceId", "==", invoice.id),
        where("businessId", "==", currentUser.businessId)
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      let newTotalPaidAmount = 0;
      paymentsSnapshot.forEach(doc => {
        newTotalPaidAmount += (doc.data() as Payment).amountPaid;
      });

      // 3. Determine new invoice status
      let newStatus: InvoiceStatus = "Pending";
      const outstanding = invoice.totalAmount - newTotalPaidAmount;
      if (outstanding <= 0.001) { // Using epsilon for float comparison
        newStatus = "Paid";
      } else if (newTotalPaidAmount > 0 && outstanding > 0.001) {
        newStatus = "Partially Paid";
      } else if (isPast(new Date(invoice.dueDate)) && outstanding > 0.001) {
        newStatus = "Overdue";
      }
      // If still pending and not overdue, it remains 'Pending'

      // 4. Update invoice document
      const invoiceDocRef = doc(db, "invoices", invoice.id);
      await updateDoc(invoiceDocRef, {
        totalPaidAmount: newTotalPaidAmount,
        status: newStatus,
      });

      toast({ title: "Payment Recorded", description: `Payment of GHS ${paymentData.amountPaid.toFixed(2)} recorded successfully.` });
      setIsPaymentDialogOpen(false);
      await fetchInvoiceAndPayments(); // Re-fetch to update UI

    } catch (error) {
      console.error("Error recording payment: ", error);
      toast({ title: "Payment Failed", description: "Could not record payment.", variant: "destructive" });
    } finally {
      setIsSavingPayment(false);
    }
  };


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
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <Button variant="outline" onClick={() => router.push("/invoices")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Invoices
              </Button>
              {invoice && invoice.status !== "Paid" && (
                <Button onClick={() => setIsPaymentDialogOpen(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Record Payment
                </Button>
              )}
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
        {invoice && !error && (
          <InvoiceDetailsDisplay invoice={invoice} payments={payments} />
        )}
        {!invoice && !isLoading && !error && (
             <div className="text-center py-10 text-muted-foreground">
                <p>Could not load invoice details.</p>
             </div>
        )}

        {invoice && (
          <PaymentForm
            isOpen={isPaymentDialogOpen}
            onOpenChange={setIsPaymentDialogOpen}
            onSave={handleRecordPayment}
            invoiceId={invoice.id}
            invoiceTotalAmount={invoice.totalAmount}
            currentPaidAmount={invoice.totalPaidAmount}
            isSaving={isSavingPayment}
          />
        )}

      </AuthenticatedLayout>
    </AuthGuard>
  );
}
