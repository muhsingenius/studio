
"use client";

import { useState, useEffect } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import CashSaleForm, { type CashSaleFormInputs } from "@/components/sales/DirectSaleForm";
import type { Customer, TaxSettings, CashSale, Item as ProductItem, CashSaleItem } from "@/types";
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
  writeBatch,
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

// Function to generate a unique sale number
const generateSaleNumber = async () => {
  // This is a simplified version. In a real app, you might query Firestore 
  // for the last sale number or use a more robust counter.
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

        const customersQuery = query(collection(db, "customers"), where("businessId", "==", currentUser.businessId), orderBy("name", "asc"));
        const customerSnapshot = await getDocs(customersQuery);
        setCustomers(customerSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date() } as Customer)));

        const taxSettingsDocRef = doc(db, "settings", "taxConfiguration"); 
        const taxSettingsSnap = await getDoc(taxSettingsDocRef);
        setTaxSettings(taxSettingsSnap.exists() ? taxSettingsSnap.data() as TaxSettings : defaultTaxSettings);

        const itemsQuery = query(collection(db, "items"), orderBy("name", "asc")); // Consider filtering by businessId if items are business-specific
        const itemsSnapshot = await getDocs(itemsQuery);
        setAvailableItems(itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: (doc.data().createdAt as Timestamp)?.toDate() || new Date() } as ProductItem)));

      } catch (error) {
        console.error("Error fetching initial data for new cash sale: ", error);
        toast({ title: "Error Loading Data", description: "Could not load required data.", variant: "destructive" });
        if (!taxSettings) setTaxSettings(defaultTaxSettings); // Fallback
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
        // Phase 1: All READS
        const itemUpdates: Array<{ ref: DocumentReference; newQuantity: number; name: string }> = [];
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

          if (!itemDocSnap.exists()) {
            throw new Error(`Item with ID ${saleItem.itemId} (${productItem?.name || 'Unknown item'}) not found.`);
          }
          const currentQuantity = itemDocSnap.data().quantityOnHand || 0;
          const newQuantity = currentQuantity - saleItem.quantity;

          if (newQuantity < 0 && productItem) {
            console.warn(`Inventory Alert: Stock for "${productItem.name}" is now negative (${newQuantity}). Current: ${currentQuantity}, Sold: ${saleItem.quantity}.`);
          }
          itemUpdates.push({ ref: itemDocRef, newQuantity, name: productItem?.name || 'Unknown Item' });
        }

        // Phase 2: All WRITES
        // 2a. Create the CashSale document
        const cashSaleDocRef = doc(collection(db, "cashSales")); // Generate new ID for the sale
        const newSaleData: CashSale = {
          ...salePayload,
          id: cashSaleDocRef.id, // Use the generated ID
          saleNumber: generatedSaleNumber,
          businessId: currentUser.businessId!,
          recordedBy: currentUser.id!,
          createdAt: new Date(), // Placeholder, will be serverTimestamp in the transaction
        };
        transaction.set(cashSaleDocRef, { ...newSaleData, createdAt: serverTimestamp() });

        // 2b. Update inventory for each item sold
        for (const update of itemUpdates) {
          transaction.update(update.ref, { quantityOnHand: update.newQuantity, updatedAt: serverTimestamp() });
        }
      }); // End of transaction

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
