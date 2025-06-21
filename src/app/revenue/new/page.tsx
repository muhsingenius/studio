
"use client";

import { useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import RevenueForm, { type RevenueFormInputs } from "@/components/revenue/RevenueForm";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

export default function NewRevenuePage() {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { currentUser } = useAuth();

  const handleCreateRevenue = async (data: RevenueFormInputs) => {
    if (!currentUser || !currentUser.businessId || !currentUser.id) {
      toast({ title: "Error", description: "User or business context is missing.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      await addDoc(collection(db, "revenueRecords"), { // Updated collection name
        ...data,
        businessId: currentUser.businessId,
        recordedBy: currentUser.id,
        createdAt: serverTimestamp(),
      });
      toast({ title: "Revenue Recorded", description: `Revenue from ${data.source} has been recorded.` });
      router.push("/revenue");
    } catch (error) {
      console.error("Error recording revenue: ", error);
      toast({ title: "Error", description: "Could not save revenue record.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AuthGuard>
      <AuthenticatedLayout>
        <PageHeader
          title="Record Other Revenue"
          description="Record miscellaneous income not from an invoice or POS sale (e.g., grants, interest)."
        />
        <RevenueForm 
          onSave={handleCreateRevenue} 
          isSaving={isSaving} 
          mode="create"
        />
      </AuthenticatedLayout>
    </AuthGuard>
  );
}
