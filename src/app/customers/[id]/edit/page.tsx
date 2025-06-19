
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import CustomerForm, { type CustomerFormInputs } from "@/components/customers/CustomerForm";
import type { Customer } from "@/types";
import { useToast } from "@/hooks/use-toast";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customerId = typeof params.id === 'string' ? params.id : null;

  useEffect(() => {
    if (!customerId) {
      setError("Invalid customer ID.");
      setIsLoading(false);
      router.push("/customers");
      return;
    }
     if (!currentUser || !currentUser.businessId) {
        setError("Business context not loaded.");
        setIsLoading(false);
        return;
    }

    const fetchCustomer = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const customerDocRef = doc(db, "customers", customerId);
        const docSnap = await getDoc(customerDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
           if (data.businessId !== currentUser.businessId) {
            setError("Access Denied. This customer does not belong to your business.");
            toast({ title: "Access Denied", description: "You do not have permission to edit this customer.", variant: "destructive" });
            setCustomer(null);
          } else {
            const fetchedCustomer = {
              id: docSnap.id,
              ...data,
              createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate() : new Date(),
            } as Customer;
            setCustomer(fetchedCustomer);
          }
        } else {
          setError("Customer not found.");
          toast({ title: "Not Found", description: `Customer with ID ${customerId} does not exist.`, variant: "destructive" });
        }
      } catch (err: any) {
        console.error("Error fetching customer for edit: ", err);
        setError("Failed to fetch customer data.");
        toast({ title: "Error", description: "Could not retrieve customer details for editing.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomer();
  }, [customerId, router, toast, currentUser]);

  const handleUpdateCustomer = async (data: CustomerFormInputs) => {
    if (!customer || !currentUser || !currentUser.businessId) {
      toast({ title: "Error", description: "Required data missing for update.", variant: "destructive" });
      return;
    }
    // Security check: ensure user is not trying to change businessId or createdBy
    if (customer.businessId !== currentUser.businessId) {
        toast({ title: "Error", description: "Operation not allowed.", variant: "destructive" });
        return;
    }

    setIsSaving(true);
    try {
      const customerDocRef = doc(db, "customers", customer.id);
      // We only pass fields that are part of CustomerFormInputs to updateDoc
      // businessId, createdBy, createdAt are not changed during an update.
      await updateDoc(customerDocRef, {
        name: data.name,
        phone: data.phone,
        email: data.email || null, // Store null if empty string
        location: data.location,
        // businessId and createdBy are not updated
      });
      toast({ title: "Customer Updated", description: `${data.name} has been updated successfully.` });
      router.push(`/customers/${customer.id}`); // Redirect to view page after update
    } catch (error) {
      console.error("Error updating customer: ", error);
      toast({ title: "Error", description: "Could not update customer data.", variant: "destructive" });
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

  if (error) {
    return (
      <AuthGuard>
        <AuthenticatedLayout>
          <PageHeader title="Edit Customer" />
          <div className="text-center py-10 text-destructive bg-destructive/10 p-4 rounded-md">
            <p className="text-lg font-semibold">Error</p>
            <p>{error}</p>
            <Button variant="outline" onClick={() => router.push("/customers")} className="mt-4">
                Back to Customers
            </Button>
          </div>
        </AuthenticatedLayout>
      </AuthGuard>
    );
  }
  
  if (!customer) {
     return (
      <AuthGuard>
        <AuthenticatedLayout>
          <PageHeader title="Edit Customer" />
           <div className="text-center py-10 text-muted-foreground">
             <p>Customer data could not be loaded.</p>
             <Button variant="outline" onClick={() => router.push("/customers")} className="mt-4">
                Back to Customers
            </Button>
           </div>
        </AuthenticatedLayout>
      </AuthGuard>
    );
  }
  
  // Prepare initialData for the form (must match CustomerFormInputs)
  const formInitialData: CustomerFormInputs = {
      name: customer.name,
      phone: customer.phone,
      email: customer.email || "",
      location: customer.location,
  };

  return (
    <AuthGuard>
      <AuthenticatedLayout>
        <PageHeader
          title={`Edit ${customer.name}`}
          description="Update the customer's details below."
        />
        <CustomerForm 
          initialData={formInitialData} 
          onSave={handleUpdateCustomer} 
          isSaving={isSaving}
          mode="edit"
        />
      </AuthenticatedLayout>
    </AuthGuard>
  );
}
