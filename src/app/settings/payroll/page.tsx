
"use client";

import { useState, useEffect, useCallback } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import PayrollSettingsForm from "@/components/settings/PayrollSettingsForm";
import type { PayrollSettings } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const PAYROLL_SETTINGS_DOC_ID = "payrollConfiguration";

const defaultPayrollSettings: Omit<PayrollSettings, "id"> = {
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
    setIsLoading(true);
    try {
      const docRef = doc(db, "settings", PAYROLL_SETTINGS_DOC_ID);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSettings({ id: docSnap.id, ...docSnap.data() } as PayrollSettings);
      } else {
        setSettings({
          id: PAYROLL_SETTINGS_DOC_ID,
          ...defaultPayrollSettings,
        });
      }
    } catch (error) {
      console.error("Error fetching payroll settings:", error);
      toast({ title: "Error", description: "Could not load payroll settings.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (data: Omit<PayrollSettings, "id">) => {
    if (currentUser?.role !== "Admin" && currentUser?.role !== "Accountant") {
        toast({ title: "Permission Denied", description: "You are not authorized to change payroll settings.", variant: "destructive" });
        return;
    }
    setIsSaving(true);
    try {
      const docRef = doc(db, "settings", PAYROLL_SETTINGS_DOC_ID);
      await setDoc(docRef, data);
      setSettings({ id: PAYROLL_SETTINGS_DOC_ID, ...data });
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
