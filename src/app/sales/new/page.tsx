
"use client";

import { useState, useEffect } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import CashSaleForm, { type CashSaleFormInputs } from "@/components/sales/DirectSaleForm";
import type { Customer, TaxSettings, CashSale, Item as ProductItem, CashSaleItem, Business } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  query,
  orderBy,
  Timestamp,
  where,
  runTransaction,
  DocumentReference
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const defaultTaxSettings: TaxSettings = {
  vat: 0.15,
  nhil: 0.025,
  getFund: 0.025,
  customTaxes: [],
};

const generateSaleNumber = async () => {
  const prefix = "CSALE";
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${year}${month}-${randomSuffix}`;
};


export default function NewCashSalePage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [taxSettings, setTaxSettings] = useState<TaxSettings | null>(null);
  const [availableItems, setAvailableItems] = useState<ProductItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedSaleNumber, setGeneratedSaleNumber] = useState("");
  const { toast } = useToast();
  const router = useRouter();
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser?.businessId) {
        toast({ title: "Error", description: "Business context not available.", variant: "destructive"});
        setIsLoadingData(false);
        return;
      }
      setIsLoadingData(true);
      try {
        const num = await generateSaleNumber();
        setGeneratedSaleNumber(num);

        const [customerSnapshot, itemsSnapshot, businessSnap] = await Promise.all([
          getDocs(query(collection(db, "customers"), where("businessId", "==", currentUser.businessId), orderBy("name", "asc"))),
          getDocs(query(collection(db, "items"), orderBy("name", "asc"))),
          getDoc(doc(db, "businesses", currentUser.businessId))
        ]);

        setCustomers(customerSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date() } as Customer)));

        if (businessSnap.exists()) {
            setTaxSettings(businessSnap.data().settings?.tax || defaultTaxSettings);
        } else {
            toast({ title: "Warning", description: "Business details not found. Using default tax settings.", variant: "destructive" });
            setTaxSettings(defaultTaxSettings);
        }

        setAvailableItems(itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date() } as ProductItem)));

      } catch (error) {
        console.error("Error fetching initial data for new cash sale: ", error);
        toast({ title: "Error Loading Data", description: "Could not load required data.", variant: "destructive" });
        if (!taxSettings) setTaxSettings(defaultTaxSettings);
      } finally {
        setIsLoadingData(false);
      }
    };
    fetchData();
  }, [toast, currentUser]);

  const handleSaveSale = async (salePayload: Omit<CashSale, "id" | "createdAt" | "businessId" | "recordedBy" | "saleNumber">, _formData: CashSaleFormInputs) => {
    if (!currentUser?.businessId || !currentUser.id) {
      toast({ title: "Error", description: "User or business context is missing.", variant: "destructive" });
      return;
    }
    if (!generatedSaleNumber) {
      toast({ title: "Error", description: "Sale number not generated. Please try again.", variant: "destructive" });
      return;
    }
    setIsSaving(true);

    try {
      await runTransaction(db, async (transaction) => {
        const itemDocsToRead: Array<{ id: string; ref: DocumentReference; saleItem: CashSaleItem; productItem?: ProductItem }> = [];

        for (const saleItem of salePayload.items) {
          if (saleItem.itemId) {
            const productItem = availableItems.find(p => p.id === saleItem.itemId);
            if (productItem && productItem.trackInventory) {
              itemDocsToRead.push({
                id: saleItem.itemId,
                ref: doc(db, "items", saleItem.itemId),
                saleItem,
                productItem
              });
            }
          }
        }

        const itemSnapshots = await Promise.all(
          itemDocsToRead.map(itemToRead => transaction.get(itemToRead.ref))
        );

        for (let i = 0; i < itemDocsToRead.length; i++) {
          const itemDocSnap = itemSnapshots[i];
          const { saleItem, productItem, ref: itemDocRef } = itemDocsToRead[i];
          if (!itemDocSnap.exists()) throw new Error(`Item with ID ${saleItem.itemId} (${productItem?.name || 'Unknown'}) not found.`);
          const newQuantity = (itemDocSnap.data().quantityOnHand || 0) - saleItem.quantity;
          transaction.update(itemDocRef, { quantityOnHand: newQuantity, updatedAt: serverTimestamp() });
        }

        const cashSaleDocRef = doc(collection(db, "cashSales"));
        transaction.set(cashSaleDocRef, { 
          ...salePayload, 
          saleNumber: generatedSaleNumber,
          businessId: currentUser.businessId!,
          recordedBy: currentUser.id!,
          createdAt: serverTimestamp() 
        });
      });

      toast({ title: "Cash Sale Recorded", description: `Sale ${generatedSaleNumber} has been saved successfully.` });
      
      router.push("/sales");

    } catch (error) {
      console.error("Error saving cash sale: ", error);
      toast({ title: "Save Failed", description: "Could not save the cash sale. " + (error instanceof Error ? error.message : ""), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };


  if (isLoadingData || !taxSettings || !generatedSaleNumber) { 
    return (
      <AuthGuard>
        <AuthenticatedLayout>
          <LoadingSpinner fullPage />
        </AuthenticatedLayout>
      </AuthGuard>
    );
  }
  
  if (!currentUser?.businessId && !isLoadingData) {
     return (
      <AuthGuard>
        <AuthenticatedLayout>
           <PageHeader title="Record New Cash Sale" />
           <div className="text-center py-10 text-muted-foreground">
             <p>Business information is not loaded. Please ensure your business profile is set up.</p>
             <Button variant="outline" onClick={() => router.push("/dashboard")} className="mt-4">
                Go to Dashboard
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
          title="Record New Cash Sale"
          description="Enter details for a cash sale transaction."
        />
        <CashSaleForm
          customers={customers}
          taxSettings={taxSettings}
          availableItems={availableItems}
          onSave={handleSaveSale}
          isSaving={isSaving}
          formMode="create"
          initialSaleNumber={generatedSaleNumber}
        />
      </AuthenticatedLayout>
    </AuthGuard>
  );
}
