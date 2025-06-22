
"use client";

import { useState, useEffect, useCallback } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import PayrollSettingsForm from "@/components/settings/PayrollSettingsForm";
import type { PayrollSettings, Business } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

const defaultPayrollSettings: PayrollSettings = {
  ssnitRates: {
    employeeContribution: 0.055,
    employerContribution: 0.13,
  },
  payeBrackets: [
    { id: "1", from: 0, to: 490, rate: 0 },
    { id: "2", from: 490, to: 600, rate: 0.05 },
    { id: "3", from: 600, to: 730, rate: 0.10 },
    { id: "4", from: 730, to: 3730, rate: 0.175 },
    { id: "5", from: 3730, to: 20730, rate: 0.25 },
    { id: "6", from: 20730, to: 50730, rate: 0.30 },
    { id: "7", from: 50730, to: null, rate: 0.35 },
  ],
};

export default function PayrollSettingsPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<PayrollSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
        setSettings(businessData.settings?.payroll || defaultPayrollSettings);
      } else {
        console.warn("No business document found, using default payroll settings.");
        setSettings(defaultPayrollSettings);
      }
    } catch (error) {
      console.error("Error fetching payroll settings:", error);
      toast({ title: "Error", description: "Could not load payroll settings.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.businessId, toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (data: PayrollSettings) => {
    if (currentUser?.role !== "Admin" && currentUser?.role !== "Accountant") {
        toast({ title: "Permission Denied", description: "You are not authorized to change payroll settings.", variant: "destructive" });
        return;
    }
    if (!currentUser?.businessId) {
      toast({ title: "Error", description: "Business context not available.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const businessDocRef = doc(db, "businesses", currentUser.businessId);
      
      const businessSnap = await getDoc(businessDocRef);
      if (!businessSnap.exists()) {
          throw new Error("Business document not found.");
      }
      
      const currentBusinessData = businessSnap.data() as Business;
      const newSettings = {
          ...(currentBusinessData.settings || {}),
          payroll: data,
      };
      
      await updateDoc(businessDocRef, {
        settings: newSettings,
        updatedAt: serverTimestamp(),
      });
      
      setSettings(data);
      toast({ title: "Settings Saved", description: "Payroll settings have been updated." });
    } catch (error) {
      console.error("Error saving payroll settings:", error);
      toast({ title: "Error", description: "Could not save payroll settings.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <AuthGuard><AuthenticatedLayout><LoadingSpinner fullPage /></AuthenticatedLayout></AuthGuard>;

  return (
    <AuthGuard>
      <AuthenticatedLayout>
        <PageHeader
          title="Payroll Settings"
          description="Configure statutory rates for SSNIT and PAYE income tax bands."
        />
        {settings ? (
          <PayrollSettingsForm
            settings={settings}
            onSave={handleSave}
            isSaving={isSaving}
          />
        ) : (
          <div className="text-center text-muted-foreground">Could not load payroll settings.</div>
        )}
      </AuthenticatedLayout>
    </AuthGuard>
  );
}
