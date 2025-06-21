
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import RevenueForm, { type RevenueFormInputs } from "@/components/revenue/RevenueForm";
import type { RevenueRecord } from "@/types";
import { useToast } from "@/hooks/use-toast";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export default function EditRevenuePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const [revenueRecord, setRevenueRecord] = useState<RevenueRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recordId = typeof params.id === 'string' ? params.id : null;

  const fetchRecord = useCallback(async () => {
    if (!recordId) {
      setError("Invalid record ID.");
      setIsLoading(false);
      router.push("/revenue");
      return;
    }
    if (!currentUser || !currentUser.businessId) {
      setError("Business context not loaded.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const recordDocRef = doc(db, "revenueRecords", recordId); // Updated collection name
      const docSnap = await getDoc(recordDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.businessId !== currentUser.businessId) {
          setError("Access Denied. This record does not belong to your business.");
          toast({ title: "Access Denied", variant: "destructive" });
          setRevenueRecord(null);
        } else {
          setRevenueRecord({
            id: docSnap.id,
            ...data,
            dateReceived: (data.dateReceived as Timestamp)?.toDate ? (data.dateReceived as Timestamp).toDate() : new Date(),
            createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate() : new Date(),
          } as RevenueRecord);
        }
      } else {
        setError("Revenue record not found.");
        toast({ title: "Not Found", variant: "destructive" });
      }
    } catch (err: any) {
      console.error("Error fetching revenue record: ", err);
      setError("Failed to fetch revenue record data.");
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [recordId, router, toast, currentUser]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  const handleUpdateRevenue = async (data: RevenueFormInputs) => {
    if (!revenueRecord || !currentUser || !currentUser.businessId) {
      toast({ title: "Error", description: "Required data missing for update.", variant: "destructive" });
      return;
    }
    if (revenueRecord.businessId !== currentUser.businessId) {
      toast({ title: "Error", description: "Operation not allowed.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const recordDocRef = doc(db, "revenueRecords", revenueRecord.id); // Updated collection name
      await updateDoc(recordDocRef, {
        ...data,
        // businessId and recordedBy are not updated
      });
      toast({ title: "Revenue Record Updated", description: `Record from ${data.source} has been updated.` });
      router.push("/revenue");
    } catch (error) {
      console.error("Error updating revenue record: ", error);
      toast({ title: "Error", description: "Could not update revenue record.", variant: "destructive" });
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
          <PageHeader title="Edit Other Revenue" />
          <div className="text-center py-10 text-destructive bg-destructive/10 p-4 rounded-md">
            <p className="text-lg font-semibold">Error</p>
            <p>{error}</p>
            <Button variant="outline" onClick={() => router.push("/revenue")} className="mt-4">
              Back to Revenue Ledger
            </Button>
          </div>
        </AuthenticatedLayout>
      </AuthGuard>
    );
  }
  
  if (!revenueRecord) {
     return (
      <AuthGuard>
        <AuthenticatedLayout>
          <PageHeader title="Edit Other Revenue" />
           <div className="text-center py-10 text-muted-foreground">
             <p>Revenue record data could not be loaded.</p>
             <Button variant="outline" onClick={() => router.push("/revenue")} className="mt-4">
                Back to Revenue Ledger
            </Button>
           </div>
        </AuthenticatedLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <AuthenticatedLayout>
        <PageHeader
          title={`Edit Other Revenue: ${revenueRecord.source}`}
          description="Update the details of this miscellaneous revenue record."
        />
        <RevenueForm 
          initialData={revenueRecord} 
          onSave={handleUpdateRevenue} 
          isSaving={isSaving}
          mode="edit"
        />
      </AuthenticatedLayout>
    </AuthGuard>
  );
}
