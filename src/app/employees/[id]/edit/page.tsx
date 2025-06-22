
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import EmployeeForm from "@/components/employees/EmployeeForm";
import type { Employee } from "@/types";
import { useToast } from "@/hooks/use-toast";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, Timestamp, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const employeeId = typeof params.id === 'string' ? params.id : null;

  useEffect(() => {
    if (!employeeId) {
      setError("Invalid employee ID.");
      setIsLoading(false);
      router.push("/employees");
      return;
    }
     if (!currentUser || !currentUser.businessId) {
        setError("Business context not loaded.");
        setIsLoading(false);
        return;
    }

    const fetchEmployee = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const employeeDocRef = doc(db, "employees", employeeId);
        const docSnap = await getDoc(employeeDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
           if (data.businessId !== currentUser.businessId) {
            setError("Access Denied. This employee does not belong to your business.");
            toast({ title: "Access Denied", variant: "destructive" });
            setEmployee(null);
          } else {
            const fetchedEmployee = {
              id: docSnap.id,
              ...data,
              startDate: (data.startDate as Timestamp)?.toDate(),
              createdAt: (data.createdAt as Timestamp)?.toDate(),
            } as Employee;
            setEmployee(fetchedEmployee);
          }
        } else {
          setError("Employee not found.");
          toast({ title: "Not Found", variant: "destructive" });
        }
      } catch (err: any) {
        console.error("Error fetching employee for edit: ", err);
        setError("Failed to fetch employee data.");
        toast({ title: "Error", description: "Could not retrieve employee details.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmployee();
  }, [employeeId, router, toast, currentUser]);

  const handleUpdateEmployee = async (data: Omit<Employee, "id" | "businessId" | "createdAt">) => {
    if (!employee || !currentUser || !currentUser.businessId) {
      toast({ title: "Error", description: "Required data missing for update.", variant: "destructive" });
      return;
    }
    
    setIsSaving(true);
    try {
      const employeeDocRef = doc(db, "employees", employee.id);
      await updateDoc(employeeDocRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Employee Updated", description: `${data.name} has been updated successfully.` });
      router.push(`/employees`);
    } catch (error) {
      console.error("Error updating employee: ", error);
      toast({ title: "Error", description: "Could not update employee data.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <AuthenticatedLayout>
          <LoadingSpinner fullPage />
        </AuthenticatedLayout>
      </AuthGuard>
    );
  }
  
  if (!employee) {
     return (
      <AuthGuard>
        <AuthenticatedLayout>
          <PageHeader title="Edit Employee" />
           <div className="text-center py-10 text-muted-foreground">
             <p>{error || "Employee data could not be loaded."}</p>
           </div>
        </AuthenticatedLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <AuthenticatedLayout>
        <PageHeader
          title={`Edit ${employee.name}`}
          description="Update the employee's profile and compensation details."
        />
        <EmployeeForm 
          initialData={employee} 
          onSave={handleUpdateEmployee} 
          isSaving={isSaving}
          mode="edit"
        />
      </AuthenticatedLayout>
    </AuthGuard>
  );
}
