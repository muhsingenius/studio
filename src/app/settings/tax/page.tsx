
"use client";

import { useState, useEffect, useCallback } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import TaxSettingsForm from "@/components/settings/TaxSettingsForm";
import type { TaxSettings } from "@/types";
import { useToast } from "@/hooks/use-toast";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

// Default settings if nothing is found in Firestore
const defaultTaxSettings: TaxSettings = {
  vat: 0.15, // 15%
  nhil: 0.025, // 2.5%
  getFund: 0.025, // 2.5%
  customTaxes: [],
};

const TAX_SETTINGS_DOC_ID = "taxConfiguration";

export default function TaxSettingsPage() {
  const [taxSettings, setTaxSettings] = useState<TaxSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const isUserAllowedToEdit = currentUser?.role === "Admin" || currentUser?.role === "Accountant";

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!db) {
        throw new Error("Firestore is not initialized.");
      }
      const docRef = doc(db, "settings", TAX_SETTINGS_DOC_ID);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setTaxSettings(docSnap.data() as TaxSettings);
      } else {
        // If no settings exist, initialize with defaults
        console.log("No tax settings found in Firestore, using default values.");
        setTaxSettings(defaultTaxSettings);
      }
    } catch (error) {
      console.error("Error fetching tax settings:", error);
      toast({
        title: "Error",
        description: "Could not load tax settings from the database.",
        variant: "destructive",
      });
      setTaxSettings(defaultTaxSettings); // Fallback to defaults on error
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveSettings = async (data: TaxSettings) => {
    if (!isUserAllowedToEdit) {
      toast({ title: "Permission Denied", description: "You do not have permission to change tax settings.", variant: "destructive" });
      return;
    }
    if (!db) {
      toast({ title: "Error", description: "Firestore is not available. Cannot save.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const docRef = doc(db, "settings", TAX_SETTINGS_DOC_ID);
      await setDoc(docRef, data, { merge: true }); // Use setDoc with merge to create or update
      setTaxSettings(data); // Update local state
      toast({
        title: "Settings Saved",
        description: "Tax rates have been updated successfully.",
      });
    } catch (error) {
        console.error("Error saving tax settings:", error);
        toast({ title: "Save Failed", description: "Could not save tax settings.", variant: "destructive" });
    }
    finally {
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
