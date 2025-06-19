
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
  Timestamp,
  where,
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";


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
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser?.businessId) {
        toast({ title: "Error", description: "Business context not available.", variant: "destructive"});
        setIsLoadingData(false);
        return;
      }
      setIsLoadingData(true);
      try {
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

        // Fetch tax settings (assuming global or business-specific if implemented later)
        // For now, using a single 'taxConfiguration' document, could be scoped to businessId later
        const taxSettingsDocRef = doc(db, "settings", "taxConfiguration"); // Potentially: doc(db, "businesses", currentUser.businessId, "settings", "taxConfiguration")
        const taxSettingsSnap = await getDoc(taxSettingsDocRef);
        if (taxSettingsSnap.exists()) {
          setTaxSettings(taxSettingsSnap.data() as TaxSettings);
        } else {
          console.warn("Tax settings not found in Firestore, using default values.");
          setTaxSettings(defaultTaxSettings);
        }

        // Fetch items (potentially scoped to businessId)
        const itemsCollectionRef = collection(db, "items");
        // Add where clause if items are business-specific: where("businessId", "==", currentUser.businessId)
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
        if (!taxSettings) { // Ensure taxSettings is not null if fetch fails partially
          setTaxSettings(defaultTaxSettings);
        }
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchData();
  }, [toast, currentUser]);

  const handleSaveInvoice = async (invoicePayload: Omit<Invoice, "id" | "createdAt">, _formData: InvoiceFormInputs) => {
    if (!currentUser?.businessId) {
      toast({ title: "Error", description: "Business context is missing. Cannot save invoice.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const docToSave = {
        ...invoicePayload,
        businessId: currentUser.businessId, // Add businessId
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

  if (isLoadingData || !taxSettings) { // Check taxSettings as well
    return (
      <AuthGuard>
        <AuthenticatedLayout>
          <LoadingSpinner fullPage />
        </AuthenticatedLayout>
      </AuthGuard>
    );
  }
  
  if (!currentUser?.businessId && !isLoadingData) {
     return (
      <AuthGuard>
        <AuthenticatedLayout>
           <PageHeader title="Create New Invoice" />
           <div className="text-center py-10 text-muted-foreground">
             <p>Business information is not loaded. Please ensure your business profile is set up.</p>
             <Button variant="outline" onClick={() => router.push("/dashboard")} className="mt-4">
                Go to Dashboard
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
          title="Create New Invoice"
          description="Fill in the details below to generate a new VAT-inclusive invoice."
        />
        <InvoiceForm
          customers={customers}
          taxSettings={taxSettings}
          availableItems={availableItems}
          onSave={handleSaveInvoice}
          isSaving={isSaving}
          formMode="create"
        />
      </AuthenticatedLayout>
    </AuthGuard>
  );
}
