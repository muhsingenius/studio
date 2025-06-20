
"use client";

import { useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import OtherIncomeForm, { type OtherIncomeFormInputs } from "@/components/income/OtherIncomeForm";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

export default function NewOtherIncomePage() {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { currentUser } = useAuth();

  const handleCreateIncome = async (data: OtherIncomeFormInputs) => {
    if (!currentUser || !currentUser.businessId || !currentUser.id) {
      toast({ title: "Error", description: "User or business context is missing.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      await addDoc(collection(db, "otherIncome"), {
        ...data,
        businessId: currentUser.businessId,
        recordedBy: currentUser.id,
        createdAt: serverTimestamp(),
      });
      toast({ title: "Income Recorded", description: `Income from ${data.source} has been recorded.` });
      router.push("/other-income");
    } catch (error) {
      console.error("Error recording other income: ", error);
      toast({ title: "Error", description: "Could not save income record.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AuthGuard>
      <AuthenticatedLayout>
        <PageHeader
          title="Record New Other Income"
          description="Enter the details of income received outside of standard invoicing."
        />
        <OtherIncomeForm 
          onSave={handleCreateIncome} 
          isSaving={isSaving} 
          mode="create"
        />
      </AuthenticatedLayout>
    </AuthGuard>
  );
}
