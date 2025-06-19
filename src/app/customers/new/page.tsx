
"use client";

import { useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import CustomerForm, { type CustomerFormInputs } from "@/components/customers/CustomerForm";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

export default function NewCustomerPage() {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { currentUser } = useAuth();

  const handleCreateCustomer = async (data: CustomerFormInputs) => {
    if (!currentUser || !currentUser.businessId || !currentUser.id) {
      toast({ title: "Error", description: "User or business context is missing. Cannot save customer.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      await addDoc(collection(db, "customers"), {
        ...data,
        businessId: currentUser.businessId,
        createdBy: currentUser.id,
        createdAt: serverTimestamp(),
      });
      toast({ title: "Customer Added", description: `${data.name} has been added successfully.` });
      router.push("/customers");
    } catch (error) {
      console.error("Error creating customer: ", error);
      toast({ title: "Error", description: "Could not save customer data.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AuthGuard>
      <AuthenticatedLayout>
        <PageHeader
          title="Add New Customer"
          description="Fill in the details below to create a new customer record."
        />
        <CustomerForm 
          onSave={handleCreateCustomer} 
          isSaving={isSaving} 
          mode="create"
        />
      </AuthenticatedLayout>
    </AuthGuard>
  );
}
