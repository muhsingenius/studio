
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit } from "lucide-react";
import type { Customer } from "@/types";
import { db } from "@/lib/firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import CustomerDetailsDisplay from "@/components/customers/CustomerDetailsDisplay"; // New component
import { useAuth } from "@/contexts/AuthContext";

export default function ViewCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const customerId = typeof params.id === 'string' ? params.id : null;

  useEffect(() => {
    if (!customerId) {
      setError("Invalid customer ID.");
      setIsLoading(false);
      toast({ title: "Error", description: "Invalid customer ID provided.", variant: "destructive" });
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
          // Security check: Ensure the fetched customer belongs to the current user's business
          if (data.businessId !== currentUser.businessId) {
            setError("Access Denied. This customer does not belong to your business.");
            toast({ title: "Access Denied", description: "You do not have permission to view this customer.", variant: "destructive" });
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
        console.error("Error fetching customer: ", err);
        setError("Failed to fetch customer data.");
        toast({ title: "Error", description: "Could not retrieve customer details.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomer();
  }, [customerId, toast, router, currentUser]);

  if (isLoading) {
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
          title={customer ? `${customer.name}` : "View Customer"}
          description={customer ? `Details for customer ${customer.name}` : "Loading customer details..."}
          actions={
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => router.push("/customers")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Customers
              </Button>
              {customer && (
                <Button onClick={() => router.push(`/customers/${customer.id}/edit`)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Customer
                </Button>
              )}
            </div>
          }
        />
        {error && (
          <div className="text-center py-10 text-destructive bg-destructive/10 p-4 rounded-md">
            <p className="text-lg font-semibold">Error</p>
            <p>{error}</p>
          </div>
        )}
        {customer && !error && <CustomerDetailsDisplay customer={customer} />}
        {!customer && !isLoading && !error && (
             <div className="text-center py-10 text-muted-foreground">
                <p>Could not load customer details.</p>
             </div>
        )}
      </AuthenticatedLayout>
    </AuthGuard>
  );
}
