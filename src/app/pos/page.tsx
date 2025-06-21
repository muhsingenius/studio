"use client";

import { useState, useEffect, useCallback } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import ItemCatalog from "@/components/pos/ItemCatalog";
import CartTicket from "@/components/pos/CartTicket";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  Timestamp,
  where,
} from "firebase/firestore";
import type { Item, Customer, TaxSettings, CashSaleItem } from "@/types";

const defaultTaxSettings: TaxSettings = {
  vat: 0.15,
  nhil: 0.025,
  getFund: 0.025,
  customTaxes: [],
};

export default function POSPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [taxSettings, setTaxSettings] = useState<TaxSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [cart, setCart] = useState<CashSaleItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!currentUser?.businessId) {
      toast({ title: "Error", description: "Business context not available.", variant: "destructive" });
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      // Fetch all required data in parallel
      const [itemsSnap, customersSnap, taxSettingsSnap] = await Promise.all([
        getDocs(query(collection(db, "items"), where("businessId", "==", currentUser.businessId), orderBy("name", "asc"))),
        getDocs(query(collection(db, "customers"), where("businessId", "==", currentUser.businessId), orderBy("name", "asc"))),
        getDoc(doc(db, "settings", "taxConfiguration")),
      ]);

      const itemsData = itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item));
      setAvailableItems(itemsData);

      const customersData = customersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      setCustomers(customersData);

      setTaxSettings(taxSettingsSnap.exists() ? taxSettingsSnap.data() as TaxSettings : defaultTaxSettings);

    } catch (error) {
      console.error("Error fetching POS data:", error);
      toast({ title: "Error Loading Data", description: "Could not load items or customers.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.businessId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddItemToCart = (itemToAdd: Item) => {
    if (isSaving) return;
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.itemId === itemToAdd.id);
      if (existingItem) {
        // Increase quantity of existing item
        return prevCart.map(cartItem =>
          cartItem.itemId === itemToAdd.id
            ? { ...cartItem, quantity: cartItem.quantity + 1, total: (cartItem.quantity + 1) * cartItem.unitPrice }
            : cartItem
        );
      } else {
        // Add new item to cart
        const newCartItem: CashSaleItem = {
          id: itemToAdd.id, // Use product ID as the unique key in the cart for simplicity
          itemId: itemToAdd.id,
          description: itemToAdd.name,
          quantity: 1,
          unitPrice: itemToAdd.sellingPrice,
          total: itemToAdd.sellingPrice,
        };
        return [...prevCart, newCartItem];
      }
    });
  };

  const handleUpdateCartQuantity = (cartItemId: string, newQuantity: number) => {
    if (isSaving) return;
    if (newQuantity <= 0) {
      // Remove item if quantity is zero or less
      handleRemoveItemFromCart(cartItemId);
    } else {
      setCart(prevCart =>
        prevCart.map(cartItem =>
          cartItem.id === cartItemId
            ? { ...cartItem, quantity: newQuantity, total: newQuantity * cartItem.unitPrice }
            : cartItem
        )
      );
    }
  };

  const handleRemoveItemFromCart = (cartItemId: string) => {
    if (isSaving) return;
    setCart(prevCart => prevCart.filter(cartItem => cartItem.id !== cartItemId));
  };
  
  const handleFinalizeSale = () => {
    // This is a placeholder for the checkout modal and logic
    toast({
      title: "Checkout Flow",
      description: "Next step: Implement the payment modal and transaction logic.",
    });
  };

  if (isLoading || !taxSettings) {
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
          title="Point of Sale (POS)"
          description="Handle fast, in-person transactions."
        />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[calc(100vh-200px)]">
          <div className="lg:col-span-3 h-full">
            <ItemCatalog items={availableItems} onAddItem={handleAddItemToCart} disabled={isSaving} />
          </div>
          <div className="lg:col-span-2 h-full">
             <CartTicket
                cartItems={cart}
                taxSettings={taxSettings}
                customers={customers}
                selectedCustomerId={selectedCustomerId}
                onSelectCustomer={setSelectedCustomerId}
                onUpdateQuantity={handleUpdateCartQuantity}
                onRemoveItem={handleRemoveItemFromCart}
                onFinalizeSale={handleFinalizeSale}
                isSaving={isSaving}
             />
          </div>
        </div>
      </AuthenticatedLayout>
    </AuthGuard>
  );
}