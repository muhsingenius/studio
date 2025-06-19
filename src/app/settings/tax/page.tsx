"use client";

import { useState, useEffect } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import TaxSettingsForm from "@/components/settings/TaxSettingsForm";
import type { TaxSettings } from "@/types";
import { useToast } from "@/hooks/use-toast";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

// Placeholder initial settings - replace with Firestore integration
const initialTaxSettings: TaxSettings = {
  vat: 0.15, // 15%
  nhil: 0.025, // 2.5%
  getFund: 0.025, // 2.5%
  customTaxes: [
    // { id: "tourism", name: "Tourism Levy", rate: 0.01, description: "1% Tourism Levy" }
  ],
};

export default function TaxSettingsPage() {
  const [taxSettings, setTaxSettings] = useState<TaxSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Simulate fetching tax settings from Firestore
    const fetchSettings = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
      // In a real app:
      // const docRef = doc(db, "settings", "taxConfiguration");
      // const docSnap = await getDoc(docRef);
      // if (docSnap.exists()) {
      //   setTaxSettings(docSnap.data() as TaxSettings);
      // } else {
      //   setTaxSettings(initialTaxSettings); // Set defaults if not found
      // }
      setTaxSettings(initialTaxSettings);
      setIsLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSaveSettings = async (data: TaxSettings) => {
    // Simulate saving to Firestore
    // In a real app:
    // const docRef = doc(db, "settings", "taxConfiguration");
    // await setDoc(docRef, data, { merge: true });
    setTaxSettings(data); // Update local state
    toast({
      title: "Settings Saved",
      description: "Tax rates have been updated successfully.",
    });
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
          title="Tax Setup"
          description="Configure VAT, NHIL, GETFund, and other applicable tax rates for your business."
        />
        <TaxSettingsForm settings={taxSettings} onSave={handleSaveSettings} />
      </AuthenticatedLayout>
    </AuthGuard>
  );
}
