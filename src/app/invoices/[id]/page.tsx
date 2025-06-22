
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import InvoiceDetailsDisplay from "@/components/invoices/InvoiceDetailsDisplay";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, DollarSign, FileDown } from "lucide-react";
import type { Invoice, Payment, InvoiceStatus, Item as ProductItem, InvoiceItem, Business } from "@/types";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  orderBy,
  Timestamp,
  runTransaction,
  type DocumentReference,
  type DocumentData,
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import PaymentForm, { type PaymentFormInputs } from "@/components/payments/PaymentForm";
import { isPast } from "date-fns";
import { generateInvoicePDF } from "@/lib/pdfGenerator";

export default function ViewInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, currentBusiness } = useAuth();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  const invoiceId = typeof params.id === 'string' ? params.id : null;
  const currency = currentBusiness?.currency || 'GHS';

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

  const handleRecordPayment = async (paymentFormData: PaymentFormInputs) => {
    if (!invoice || !currentUser || !currentUser.businessId || !invoiceId) {
      toast({ title: "Error", description: "Cannot record payment. Missing invoice or user data.", variant: "destructive" });
      return;
    }
    setIsSavingPayment(true);
    try {
      await runTransaction(db, async (transaction) => {
        const invoiceDocRef = doc(db, "invoices", invoiceId);
        
        const invoiceSnapshot = await transaction.get(invoiceDocRef);
        if (!invoiceSnapshot.exists()) {
          throw new Error("Invoice does not exist.");
        }
        const currentInvoiceData = invoiceSnapshot.data() as Invoice;
        const originalInvoiceStatus = currentInvoiceData.status;

        const newTotalPaidAmountProvisional = (currentInvoiceData.totalPaidAmount || 0) + paymentFormData.amountPaid;
        let newStatusProvisional: InvoiceStatus = currentInvoiceData.status;
        const outstandingProvisional = currentInvoiceData.totalAmount - newTotalPaidAmountProvisional;

        if (outstandingProvisional <= 0.001) {
          newStatusProvisional = "Paid";
        } else if (newTotalPaidAmountProvisional > 0 && outstandingProvisional > 0.001) {
          newStatusProvisional = "Partially Paid";
        } else if (isPast(new Date(currentInvoiceData.dueDate)) && outstandingProvisional > 0.001) {
          newStatusProvisional = "Overdue";
        } else if (outstandingProvisional > 0.001) {
          newStatusProvisional = "Pending";
        }
        
        const itemInventoryReads: Array<{
          productItemRef: DocumentReference<DocumentData>;
          invoiceItem: InvoiceItem;
        }> = [];

        if (originalInvoiceStatus !== "Paid" && newStatusProvisional === "Paid") {
          for (const invItem of currentInvoiceData.items) {
            if (invItem.itemId) {
              const productItemRef = doc(db, "items", invItem.itemId);
              itemInventoryReads.push({ productItemRef, invoiceItem: invItem });
            }
          }
        }
        
        const itemSnapshots = await Promise.all(
          itemInventoryReads.map(read => transaction.get(read.productItemRef))
        );

        const newPaymentDocRef = doc(collection(db, "payments"));
        transaction.set(newPaymentDocRef, {
          ...paymentFormData,
          invoiceId: currentInvoiceData.id,
          businessId: currentUser.businessId,
          recordedBy: currentUser.id,
          createdAt: serverTimestamp(),
        });

        transaction.update(invoiceDocRef, {
          totalPaidAmount: newTotalPaidAmountProvisional,
          status: newStatusProvisional,
        });
        
        if (originalInvoiceStatus !== "Paid" && newStatusProvisional === "Paid") {
          for (let i = 0; i < itemInventoryReads.length; i++) {
            const { productItemRef, invoiceItem } = itemInventoryReads[i];
            const productItemSnap = itemSnapshots[i];

            if (productItemSnap.exists()) {
              const productItemData = productItemSnap.data() as ProductItem;
              if (productItemData.trackInventory) {
                const currentQuantity = productItemData.quantityOnHand || 0;
                const newQuantityOnHand = currentQuantity - invoiceItem.quantity;
                
                if (newQuantityOnHand < 0) {
                  console.warn(`Inventory Alert: Stock for item "${productItemData.name}" (ID: ${productItemRef.id}) will be ${newQuantityOnHand}. Current: ${currentQuantity}, Sold in Invoice: ${invoiceItem.quantity}.`);
                }
                transaction.update(productItemRef, { 
                  quantityOnHand: newQuantityOnHand,
                  updatedAt: serverTimestamp() 
                });
              }
            } else {
              console.warn(`Item with ID ${invoiceItem.itemId} on invoice ${currentInvoiceData.invoiceNumber} not found in inventory during write phase. Stock not adjusted for this item.`);
            }
          }
        }
      });

      toast({ title: "Payment Recorded", description: `Payment of ${currency} ${paymentFormData.amountPaid.toFixed(2)} recorded. Invoice and inventory updated if applicable.` });
      setIsPaymentDialogOpen(false);
      await fetchInvoiceAndPayments();

    } catch (error) {
      console.error("Error recording payment: ", error);
      toast({ title: "Payment Failed", description: "Could not record payment. " + (error instanceof Error ? error.message : ""), variant: "destructive" });
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleDownloadPdf = () => {
    if (invoice && currentBusiness) {
        generateInvoicePDF(invoice, currentBusiness);
    } else {
        toast({ title: "Error", description: "Invoice or business data is not available.", variant: "destructive" });
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
              {invoice && currentBusiness && (
                <Button onClick={handleDownloadPdf} variant="outline">
                    <FileDown className="mr-2 h-4 w-4" />
                    Download PDF
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
          <InvoiceDetailsDisplay invoice={invoice} payments={payments} currency={currency} />
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
            currency={currency}
          />
        )}

      </AuthenticatedLayout>
    </AuthGuard>
  );
}
