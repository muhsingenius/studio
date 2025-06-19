
"use client";

import { useState, useEffect } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import InvoiceForm, { type InvoiceFormInputs } from "@/components/invoices/InvoiceForm";
import type { Customer, TaxSettings, Invoice, Item } from "@/types";
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
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
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

      } catch (error) {
        console.error("Error fetching initial data for new invoice: ", error);
        toast({
          title: "Error Loading Data",
          description: "Could not load customer, tax, or item data. Please try again.",
          variant: "destructive",
        });
        if (!taxSettings) {
          setTaxSettings(defaultTaxSettings);
        }
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchData();
  }, [toast]);

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
          taxSettings={taxSettings}
          availableItems={availableItems}
          onSave={handleSaveInvoice}
          isSaving={isSaving}
        />
      </AuthenticatedLayout>
    </AuthGuard>
  );
}
