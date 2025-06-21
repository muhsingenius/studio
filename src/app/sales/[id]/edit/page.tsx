
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import CashSaleForm, { type CashSaleFormInputs } from "@/components/sales/DirectSaleForm";
import type { Customer, TaxSettings, CashSale, Item as ProductItem } from "@/types";
import { useToast } from "@/hooks/use-toast";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
  where
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const defaultTaxSettings: TaxSettings = {
  vat: 0.15,
  nhil: 0.025,
  getFund: 0.025,
  customTaxes: [],
};

export default function EditCashSalePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const [sale, setSale] = useState<CashSale | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [taxSettings, setTaxSettings] = useState<TaxSettings | null>(null);
  const [availableItems, setAvailableItems] = useState<ProductItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saleId = typeof params.id === 'string' ? params.id : null;

  const fetchData = useCallback(async () => {
    if (!saleId) {
      setError("Invalid sale ID.");
      setIsLoadingData(false);
      router.push("/sales");
      return;
    }
    if (!currentUser || !currentUser.businessId) {
      setError("Business context not loaded.");
      setIsLoadingData(false);
      return;
    }

    setIsLoadingData(true);
    setError(null);
    try {
      const saleDocRef = doc(db, "cashSales", saleId);
      const saleSnap = await getDoc(saleDocRef);

      if (saleSnap.exists()) {
        const data = saleSnap.data();
        if (data.businessId !== currentUser.businessId) {
          setError("Access Denied. This sale does not belong to your business.");
          toast({ title: "Access Denied", variant: "destructive" });
          setSale(null);
        } else {
          setSale({
            id: saleSnap.id,
            ...data,
            date: (data.date as Timestamp)?.toDate ? (data.date as Timestamp).toDate() : new Date(data.date),
            createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate() : new Date(),
          } as CashSale);
        }
      } else {
        setError("Sale not found.");
        toast({ title: "Not Found", variant: "destructive" });
      }

      const customersQuery = query(collection(db, "customers"), where("businessId", "==", currentUser.businessId), orderBy("name", "asc"));
      const customerSnapshot = await getDocs(customersQuery);
      setCustomers(customerSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data(), createdAt: (docSnap.data().createdAt as Timestamp)?.toDate() || new Date() } as Customer)));
      
      const taxSettingsDocRef = doc(db, "settings", "taxConfiguration");
      const taxSettingsSnap = await getDoc(taxSettingsDocRef);
      setTaxSettings(taxSettingsSnap.exists() ? taxSettingsSnap.data() as TaxSettings : defaultTaxSettings);

      const itemsQuery = query(collection(db, "items"), orderBy("name", "asc"));
      const itemsSnapshot = await getDocs(itemsQuery);
      setAvailableItems(itemsSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data(), createdAt: (docSnap.data().createdAt as Timestamp)?.toDate() || new Date() } as ProductItem)));

    } catch (err: any) {
      console.error("Error fetching data for edit sale: ", err);
      setError("Failed to fetch sale or related data.");
      toast({ title: "Error", description: "Could not retrieve data for editing.", variant: "destructive" });
    } finally {
      setIsLoadingData(false);
    }
  }, [saleId, router, toast, currentUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveSale = async (salePayload: Omit<CashSale, "id" | "createdAt" | "businessId" | "recordedBy" | "saleNumber">, _formData: CashSaleFormInputs) => {
    if (!sale || !currentUser || !currentUser.businessId) {
      toast({ title: "Error", description: "Required data missing for update.", variant: "destructive" });
      return;
    }
    if (sale.businessId !== currentUser.businessId) {
      toast({ title: "Error", description: "Operation not allowed.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const saleDocRef = doc(db, "cashSales", sale.id);
      // For now, only allow updating notes and paymentReference.
      // Item and amount changes are complex due to inventory.
      const updateData: Partial<CashSale> = {
        notes: salePayload.notes,
        paymentReference: salePayload.paymentReference,
        updatedAt: serverTimestamp(), // Add an updatedAt field to CashSale type if needed
      };
      
      await updateDoc(saleDocRef, updateData);
      toast({ title: "Cash Sale Updated", description: `Sale ${sale.saleNumber} has been updated.` });
      router.push(`/sales/${sale.id}`);
    } catch (error) {
      console.error("Error updating sale: ", error);
      toast({ title: "Error", description: "Could not update sale data.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingData || (!sale && !error) || !taxSettings) {
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
          <PageHeader title="Edit Cash Sale" />
          <div className="text-center py-10 text-destructive bg-destructive/10 p-4 rounded-md">
            <p className="text-lg font-semibold">Error</p>
            <p>{error}</p>
            <Button variant="outline" onClick={() => router.push("/sales")} className="mt-4">
                Back to Sales
            </Button>
          </div>
        </AuthenticatedLayout>
      </AuthGuard>
    );
  }
  
  if (!sale) { 
     return (
      <AuthGuard>
        <AuthenticatedLayout>
          <PageHeader title="Edit Cash Sale" />
           <div className="text-center py-10 text-muted-foreground">
             <p>Sale data could not be loaded.</p>
              <Button variant="outline" onClick={() => router.push("/sales")} className="mt-4">
                Back to Sales
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
          title={`Edit Cash Sale ${sale.saleNumber}`}
          description="Update sale details below. Note: Item and amount modifications are restricted for completed sales."
        />
        <CashSaleForm
          sale={sale}
          customers={customers}
          taxSettings={taxSettings}
          availableItems={availableItems}
          onSave={handleSaveSale}
          isSaving={isSaving}
          formMode="edit"
          initialSaleNumber={sale.saleNumber}
        />
      </AuthenticatedLayout>
    </AuthGuard>
  );
}
