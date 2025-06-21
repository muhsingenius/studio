
"use client";

import { useState, useEffect } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import InvoiceForm, { type InvoiceFormInputs } from "@/components/invoices/InvoiceForm";
import type { Customer, TaxSettings, Invoice, Item, Business } from "@/types";
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
import { Button } from "@/components/ui/button";
import { generateInvoicePDF } from "@/lib/pdfGenerator";


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
  const [business, setBusiness] = useState<Business | null>(null);
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
         // Fetch all data in parallel
        const [customerSnapshot, taxSettingsSnap, itemsSnapshot, businessSnap] = await Promise.all([
          getDocs(query(collection(db, "customers"), where("businessId", "==", currentUser.businessId), orderBy("name", "asc"))),
          getDoc(doc(db, "settings", "taxConfiguration")),
          getDocs(query(collection(db, "items"), orderBy("name", "asc"))),
          getDoc(doc(db, "businesses", currentUser.businessId!))
        ]);

        // Process Customers
        const customersData = customerSnapshot.docs.map(docSnapshot => ({
          id: docSnapshot.id,
          ...docSnapshot.data(),
          createdAt: (docSnapshot.data().createdAt as Timestamp)?.toDate ? (docSnapshot.data().createdAt as Timestamp).toDate() : new Date(),
        } as Customer));
        setCustomers(customersData);

        // Process Tax Settings
        setTaxSettings(taxSettingsSnap.exists() ? taxSettingsSnap.data() as TaxSettings : defaultTaxSettings);
        
        // Process Business Details
        if (businessSnap.exists()) {
            setBusiness({ id: businessSnap.id, ...businessSnap.data() } as Business);
        } else {
            toast({ title: "Warning", description: "Business details not found. PDF download may not work correctly.", variant: "destructive" });
        }

        // Process Items
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
  }, [toast, currentUser]);

  const handleSaveInvoice = async (invoicePayload: Omit<Invoice, "id" | "createdAt">, _formData: InvoiceFormInputs, saveAndDownload = false) => {
    if (!currentUser?.businessId) {
      toast({ title: "Error", description: "Business context is missing. Cannot save invoice.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const docToSave = {
        ...invoicePayload,
        businessId: currentUser.businessId, 
        totalPaidAmount: 0, // Initialize totalPaidAmount for new invoices
        status: invoicePayload.status || "Pending", // Ensure status is set, default to Pending
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, "invoices"), docToSave);
      toast({
        title: "Invoice Created",
        description: `Invoice ${invoicePayload.invoiceNumber} has been saved successfully.`,
      });

      if (saveAndDownload) {
          if (business) {
              const finalInvoiceForPdf: Invoice = {
                  ...invoicePayload,
                  id: docRef.id,
                  createdAt: new Date(), // Use current date as an approximation for the server timestamp
              };
              generateInvoicePDF(finalInvoiceForPdf, business);
          } else {
              toast({ title: "Cannot generate PDF", description: "Business details not found. Please save them in settings.", variant: "destructive" });
          }
      }

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
