
"use client";

import { useState, useEffect } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import InvoiceForm, { type InvoiceFormInputs } from "@/components/invoices/InvoiceForm";
import type { Customer, TaxSettings, Invoice } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  query,
  orderBy,
  Timestamp
} from "firebase/firestore";

// Default tax settings if not found in Firestore
const defaultTaxSettings: TaxSettings = {
  vat: 0.15,
  nhil: 0.025,
  getFund: 0.025,
  customTaxes: [],
};

export default function NewInvoicePage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [taxSettings, setTaxSettings] = useState<TaxSettings | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        // Fetch customers
        const customersCollectionRef = collection(db, "customers");
        const customersQuery = query(customersCollectionRef, orderBy("name", "asc"));
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
          console.warn("Tax settings not found in Firestore, using default values.");
          setTaxSettings(defaultTaxSettings);
        }
      } catch (error) {
        console.error("Error fetching initial data for new invoice: ", error);
        toast({
          title: "Error Loading Data",
          description: "Could not load customer or tax data. Please try again.",
          variant: "destructive",
        });
        // Fallback to default tax settings if fetch fails
        if (!taxSettings) {
          setTaxSettings(defaultTaxSettings);
        }
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchData();
  }, [toast]); // Removed taxSettings from dependency array to avoid re-fetch loop if it's set to default

  const handleSaveInvoice = async (invoicePayload: Omit<Invoice, "id" | "createdAt">, _formData: InvoiceFormInputs) => {
    setIsSaving(true);
    try {
      const docToSave = {
        ...invoicePayload,
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, "invoices"), docToSave);
      toast({
        title: "Invoice Created",
        description: `Invoice ${invoicePayload.invoiceNumber} (ID: ${docRef.id}) has been saved successfully.`,
      });
      router.push("/invoices");
    } catch (error) {
      console.error("Error saving invoice: ", error);
      toast({
        title: "Save Failed",
        description: "Could not save the invoice to Firestore.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingData || !taxSettings) {
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
          title="Create New Invoice"
          description="Fill in the details below to generate a new VAT-inclusive invoice."
        />
        <InvoiceForm
          customers={customers}
          taxSettings={taxSettings} // taxSettings is now guaranteed to be non-null here
          onSave={handleSaveInvoice}
          isSaving={isSaving}
        />
      </AuthenticatedLayout>
    </AuthGuard>
  );
}

    