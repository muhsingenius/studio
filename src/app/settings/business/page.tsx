
"use client";

import { useState, useEffect, useCallback } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import BusinessProfileForm from "@/components/settings/BusinessProfileForm";
import type { Business } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function BusinessProfilePage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBusinessData = useCallback(async () => {
    if (!currentUser?.businessId) {
      setError("No business associated with this account.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const businessDocRef = doc(db, "businesses", currentUser.businessId);
      const docSnap = await getDoc(businessDocRef);
      if (docSnap.exists()) {
        setBusiness({ id: docSnap.id, ...docSnap.data() } as Business);
      } else {
        setError("Business profile not found.");
        toast({ title: "Error", description: "Business profile could not be loaded.", variant: "destructive" });
      }
    } catch (err) {
      console.error("Error fetching business data:", err);
      setError("Failed to fetch business data.");
      toast({ title: "Error", description: "Could not retrieve business details.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.businessId, toast]);

  useEffect(() => {
    fetchBusinessData();
  }, [fetchBusinessData]);

  const handleSaveBusinessProfile = async (data: Partial<Omit<Business, "id" | "createdAt" | "createdBy" | "adminUids">>) => {
    if (!currentUser || currentUser.role !== "Admin") {
      toast({ title: "Permission Denied", description: "You do not have permission to edit business details.", variant: "destructive" });
      return;
    }
    if (!business) {
      toast({ title: "Error", description: "No business data to update.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const businessDocRef = doc(db, "businesses", business.id);
      // Ensure only allowed fields are updated and add updatedAt timestamp
      const updateData: any = { ...data, updatedAt: serverTimestamp() };
      await updateDoc(businessDocRef, updateData);
      
      // Optimistically update local state or re-fetch
      setBusiness(prev => prev ? { ...prev, ...data, id: prev.id, createdAt: prev.createdAt, createdBy: prev.createdBy, adminUids: prev.adminUids  } as Business : null);

      toast({ title: "Business Profile Updated", description: "Your business details have been saved." });
    } catch (error) {
      console.error("Error updating business profile:", error);
      toast({ title: "Update Failed", description: "Could not save business details.", variant: "destructive" });
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
          <PageHeader title="Business Profile" description="Manage your company information." />
          <Card className="shadow-lg border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center text-destructive">
                <AlertTriangle className="mr-2 h-6 w-6" /> Error Loading Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error}</p>
              {currentUser?.businessId && (
                 <button onClick={fetchBusinessData} className="mt-4 text-sm text-primary hover:underline">
                    Try reloading
                 </button>
              )}
            </CardContent>
          </Card>
        </AuthenticatedLayout>
      </AuthGuard>
    );
  }
  
  if (!business) {
     return (
      <AuthGuard>
        <AuthenticatedLayout>
          <PageHeader title="Business Profile" description="Manage your company information." />
           <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>No Business Data</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Business information could not be loaded or is not yet set up.</p>
            </CardContent>
          </Card>
        </AuthenticatedLayout>
      </AuthGuard>
    );
  }

  const isUserAdmin = currentUser?.role === "Admin";

  return (
    <AuthGuard>
      <AuthenticatedLayout>
        <PageHeader
          title="Business Profile"
          description={isUserAdmin ? "View and manage your company information." : "View your company information."}
        />
        <BusinessProfileForm
          initialData={business}
          onSave={handleSaveBusinessProfile}
          isSaving={isSaving}
          isEditable={isUserAdmin}
        />
      </AuthenticatedLayout>
    </AuthGuard>
  );
}
