
"use client";

import { useState } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import EmployeeForm from "@/components/employees/EmployeeForm";
import type { Employee } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

export default function NewEmployeePage() {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { currentUser } = useAuth();

  const handleCreateEmployee = async (data: Omit<Employee, "id" | "businessId" | "createdAt">) => {
    if (!currentUser || !currentUser.businessId) {
      toast({ title: "Error", description: "Business context is missing. Cannot save employee.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      await addDoc(collection(db, "employees"), {
        ...data,
        businessId: currentUser.businessId,
        createdAt: serverTimestamp(),
      });
      toast({ title: "Employee Added", description: `${data.name} has been added successfully.` });
      router.push("/employees");
    } catch (error) {
      console.error("Error creating employee: ", error);
      toast({ title: "Error", description: "Could not save employee data.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AuthGuard>
      <AuthenticatedLayout>
        <PageHeader
          title="Add New Employee"
          description="Fill in the details below to create a new employee profile."
        />
        <EmployeeForm 
          onSave={handleCreateEmployee} 
          isSaving={isSaving}
          mode="create"
        />
      </AuthenticatedLayout>
    </AuthGuard>
  );
}
