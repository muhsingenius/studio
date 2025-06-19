
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import InvoiceForm, { type InvoiceFormInputs } from "@/components/invoices/InvoiceForm";
import type { Customer, TaxSettings, Invoice, Item } from "@/types";
import { useToast } from "@/hooks/use-toast";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
  where
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const defaultTaxSettings: TaxSettings = {
  vat: 0.15,
  nhil: 0.025,
  getFund: 0.025,
  customTaxes: [],
};

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [taxSettings, setTaxSettings] = useState<TaxSettings | null>(null);
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invoiceId = typeof params.id === 'string' ? params.id : null;

  useEffect(() => {
    if (!invoiceId) {
      setError("Invalid invoice ID.");
      setIsLoadingData(false);
      router.push("/invoices");
      return;
    }
    if (!currentUser || !currentUser.businessId) {
      setError("Business context not loaded.");
      setIsLoadingData(false);
      return;
    }

    const fetchData = async () => {
      setIsLoadingData(true);
      setError(null);
      try {
        // Fetch invoice
        const invoiceDocRef = doc(db, "invoices", invoiceId);
        const invoiceSnap = await getDoc(invoiceDocRef);

        if (invoiceSnap.exists()) {
          const data = invoiceSnap.data();
          if (data.businessId !== currentUser.businessId) {
            setError("Access Denied. This invoice does not belong to your business.");
            toast({ title: "Access Denied", description: "You do not have permission to edit this invoice.", variant: "destructive" });
            setInvoice(null);
          } else {
            const fetchedInvoice = {
              id: invoiceSnap.id,
              ...data,
              dateIssued: (data.dateIssued as Timestamp)?.toDate ? (data.dateIssued as Timestamp).toDate() : new Date(data.dateIssued),
              dueDate: (data.dueDate as Timestamp)?.toDate ? (data.dueDate as Timestamp).toDate() : new Date(data.dueDate),
              paymentDate: (data.paymentDate as Timestamp)?.toDate ? (data.paymentDate as Timestamp).toDate() : undefined,
              createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate() : new Date(),
            } as Invoice;
            setInvoice(fetchedInvoice);
          }
        } else {
          setError("Invoice not found.");
          toast({ title: "Not Found", description: `Invoice with ID ${invoiceId} does not exist.`, variant: "destructive" });
        }

        // Fetch customers for the current business
        const customersCollectionRef = collection(db, "customers");
        const customersQuery = query(customersCollectionRef, where("businessId", "==", currentUser.businessId), orderBy("name", "asc"));
        const customerSnapshot = await getDocs(customersQuery);
        const customersData = customerSnapshot.docs.map(docSnapshot => ({
          id: docSnapshot.id,
          ...docSnapshot.data(),
          createdAt: (docSnapshot.data().createdAt as Timestamp)?.toDate ? (docSnapshot.data().createdAt as Timestamp).toDate() : new Date(),
        } as Customer));
        setCustomers(customersData);

        // Fetch tax settings
        const taxSettingsDocRef = doc(db, "settings", "taxConfiguration");
        const taxSettingsSnap = await getDoc(taxSettingsDocRef);
        if (taxSettingsSnap.exists()) {
          setTaxSettings(taxSettingsSnap.data() as TaxSettings);
        } else {
          setTaxSettings(defaultTaxSettings);
        }

        // Fetch items
        const itemsCollectionRef = collection(db, "items");
        const itemsQuery = query(itemsCollectionRef, orderBy("name", "asc"));
        const itemsSnapshot = await getDocs(itemsQuery);
        const itemsData = itemsSnapshot.docs.map(docSnapshot => ({
          id: docSnapshot.id,
          ...docSnapshot.data(),
           createdAt: (docSnapshot.data().createdAt as Timestamp)?.toDate ? (docSnapshot.data().createdAt as Timestamp).toDate() : new Date(),
          updatedAt: (docSnapshot.data().updatedAt as Timestamp)?.toDate ? (docSnapshot.data().updatedAt as Timestamp).toDate() : undefined,
        } as Item));
        setAvailableItems(itemsData);

      } catch (err: any) {
        console.error("Error fetching data for edit invoice: ", err);
        setError("Failed to fetch invoice or related data.");
        toast({ title: "Error", description: "Could not retrieve data for editing.", variant: "destructive" });
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [invoiceId, router, toast, currentUser]);

  const handleSaveInvoice = async (invoicePayload: Omit<Invoice, "id" | "createdAt">, _formData: InvoiceFormInputs) => {
    if (!invoice || !currentUser || !currentUser.businessId) {
      toast({ title: "Error", description: "Required data missing for update.", variant: "destructive" });
      return;
    }
    if (invoice.businessId !== currentUser.businessId) {
        toast({ title: "Error", description: "Operation not allowed. Invoice does not belong to your business.", variant: "destructive" });
        return;
    }

    setIsSaving(true);
    try {
      const invoiceDocRef = doc(db, "invoices", invoice.id);
      await updateDoc(invoiceDocRef, {
        ...invoicePayload,
        updatedAt: serverTimestamp(), // Add/update an updatedAt timestamp
      });
      toast({ title: "Invoice Updated", description: `Invoice ${invoicePayload.invoiceNumber} has been updated.` });
      router.push(`/invoices/${invoice.id}`); // Redirect to view page after update
    } catch (error) {
      console.error("Error updating invoice: ", error);
      toast({ title: "Error", description: "Could not update invoice data.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingData || (!invoice && !error) || !taxSettings) {
    return (
      <AuthGuard>
        <AuthenticatedLayout>
          <LoadingSpinner fullPage />
        </AuthenticatedLayout>
      </AuthGuard>
    );
  }

  if (error) {
    return (
      <AuthGuard>
        <AuthenticatedLayout>
          <PageHeader title="Edit Invoice" />
          <div className="text-center py-10 text-destructive bg-destructive/10 p-4 rounded-md">
            <p className="text-lg font-semibold">Error</p>
            <p>{error}</p>
            <Button variant="outline" onClick={() => router.push("/invoices")} className="mt-4">
                Back to Invoices
            </Button>
          </div>
        </AuthenticatedLayout>
      </AuthGuard>
    );
  }
  
  if (!invoice) { // Should be caught by isLoadingData or error, but as a fallback
     return (
      <AuthGuard>
        <AuthenticatedLayout>
          <PageHeader title="Edit Invoice" />
           <div className="text-center py-10 text-muted-foreground">
             <p>Invoice data could not be loaded.</p>
              <Button variant="outline" onClick={() => router.push("/invoices")} className="mt-4">
                Back to Invoices
            </Button>
           </div>
        </AuthenticatedLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <AuthenticatedLayout>
        <PageHeader
          title={`Edit Invoice ${invoice.invoiceNumber}`}
          description="Update the invoice details below."
        />
        <InvoiceForm
          invoice={invoice}
          customers={customers}
          taxSettings={taxSettings}
          availableItems={availableItems}
          onSave={handleSaveInvoice}
          isSaving={isSaving}
          formMode="edit"
        />
      </AuthenticatedLayout>
    </AuthGuard>
  );
}

