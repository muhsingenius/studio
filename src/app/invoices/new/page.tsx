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

// Placeholder data - replace with Firestore integration
const initialCustomers: Customer[] = [
  { id: "1", name: "Kwame Enterprise", phone: "+233 24 400 0001", email: "kwame@example.com", location: "Accra Central", createdAt: new Date() },
  { id: "2", name: "Adoma Services Ltd", phone: "+233 55 500 0002", email: "adoma@example.com", location: "Kumasi City Mall", createdAt: new Date() },
];

const initialTaxSettings: TaxSettings = {
  vat: 0.15, // 15%
  nhil: 0.025, // 2.5%
  getFund: 0.025, // 2.5%
  customTaxes: [],
};

export default function NewInvoicePage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [taxSettings, setTaxSettings] = useState<TaxSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    // Simulate fetching customers and tax settings
    const fetchData = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
      setCustomers(initialCustomers);
      setTaxSettings(initialTaxSettings);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const handleSaveInvoice = async (invoiceData: Invoice, _formData: InvoiceFormInputs) => {
    setIsSaving(true);
    console.log("Saving invoice:", invoiceData);
    // Simulate API call to save invoice
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // In a real app, you would save to Firestore here:
    // await addDoc(collection(db, "invoices"), invoiceData);

    toast({
      title: "Invoice Created",
      description: `Invoice ${invoiceData.invoiceNumber} has been saved successfully.`,
    });
    setIsSaving(false);
    router.push("/invoices"); // Redirect to invoices list page
  };

  if (isLoading || !taxSettings) {
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
          onSave={handleSaveInvoice}
          isSaving={isSaving}
        />
      </AuthenticatedLayout>
    </AuthGuard>
  );
}
