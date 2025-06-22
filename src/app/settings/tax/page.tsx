
"use client";

import { useState, useEffect, useCallback } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import TaxSettingsForm from "@/components/settings/TaxSettingsForm";
import type { TaxSettings, Business } from "@/types";
import { useToast } from "@/hooks/use-toast";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

const defaultTaxSettings: TaxSettings = {
  vat: 0.15,
  nhil: 0.025,
  getFund: 0.025,
  customTaxes: [],
};

export default function TaxSettingsPage() {
  const [taxSettings, setTaxSettings] = useState<TaxSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const isUserAllowedToEdit = currentUser?.role === "Admin" || currentUser?.role === "Accountant";

  const fetchSettings = useCallback(async () => {
    if (!currentUser?.businessId) {
      toast({ title: "Error", description: "Business context not available.", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const businessDocRef = doc(db, "businesses", currentUser.businessId);
      const docSnap = await getDoc(businessDocRef);
      if (docSnap.exists()) {
        const businessData = docSnap.data() as Business;
        setTaxSettings(businessData.settings?.tax || defaultTaxSettings);
      } else {
        console.warn("No business document found, using default tax settings.");
        setTaxSettings(defaultTaxSettings);
      }
    } catch (error) {
      console.error("Error fetching business settings:", error);
      toast({ title: "Error", description: "Could not load tax settings.", variant: "destructive" });
      setTaxSettings(defaultTaxSettings);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.businessId, toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveSettings = async (data: TaxSettings) => {
    if (!isUserAllowedToEdit) {
      toast({ title: "Permission Denied", variant: "destructive" });
      return;
    }
    if (!currentUser?.businessId) {
      toast({ title: "Error", description: "Business context not available.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const businessDocRef = doc(db, "businesses", currentUser.businessId);
      await updateDoc(businessDocRef, {
        'settings.tax': data,
        updatedAt: serverTimestamp(),
      });
      setTaxSettings(data);
      toast({ title: "Settings Saved", description: "Tax rates have been updated successfully." });
    } catch (error) {
        console.error("Error saving tax settings:", error);
        toast({ title: "Save Failed", description: "Could not save tax settings.", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
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
        {!isUserAllowedToEdit && (
          <Card className="shadow-lg border-yellow-400 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center text-yellow-700">
                <ShieldAlert className="mr-2 h-6 w-6" />
                View-Only Mode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>You do not have permission to edit tax settings. Please contact an Administrator or Accountant.</p>
            </CardContent>
          </Card>
        )}
        <TaxSettingsForm 
            settings={taxSettings} 
            onSave={handleSaveSettings} 
            isSaving={isSaving}
            isEditable={!!isUserAllowedToEdit}
        />
      </AuthenticatedLayout>
    </AuthGuard>
  );
}
