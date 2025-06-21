
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import ItemCatalog from "@/components/pos/ItemCatalog";
import CartTicket from "@/components/pos/CartTicket";
import CheckoutModal, { type CheckoutDetails } from "@/components/pos/CheckoutModal";
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
  runTransaction,
  serverTimestamp,
  type DocumentReference,
} from "firebase/firestore";
import type { Item, Customer, TaxSettings, CashSaleItem, ItemCategory, CashSale } from "@/types";

const defaultTaxSettings: TaxSettings = {
  vat: 0.15,
  nhil: 0.025,
  getFund: 0.025,
  customTaxes: [],
};

// Function to generate a unique sale number
const generateSaleNumber = async () => {
  const prefix = "CSALE";
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}-${year}${month}-${randomSuffix}`;
};


export default function POSPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [taxSettings, setTaxSettings] = useState<TaxSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [cart, setCart] = useState<CashSaleItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
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
      const [itemsSnap, customersSnap, categoriesSnap, taxSettingsSnap] = await Promise.all([
        getDocs(query(collection(db, "items"), where("businessId", "==", currentUser.businessId), orderBy("name", "asc"))),
        getDocs(query(collection(db, "customers"), where("businessId", "==", currentUser.businessId), orderBy("name", "asc"))),
        getDocs(query(collection(db, "itemCategories"), where("businessId", "==", currentUser.businessId), orderBy("name", "asc"))),
        getDoc(doc(db, "settings", "taxConfiguration")),
      ]);

      const itemsData = itemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item));
      setAvailableItems(itemsData);

      const customersData = customersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      setCustomers(customersData);
      
      const categoriesData = categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ItemCategory));
      setCategories(categoriesData);

      setTaxSettings(taxSettingsSnap.exists() ? taxSettingsSnap.data() as TaxSettings : defaultTaxSettings);

    } catch (error) {
      console.error("Error fetching POS data:", error);
      toast({ title: "Error Loading Data", description: "Could not load items, customers, or categories.", variant: "destructive" });
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
    if (cart.length === 0) {
      toast({ title: "Cart is empty", description: "Add items to the cart to proceed.", variant: "destructive" });
      return;
    }
    setIsCheckoutOpen(true);
  };

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  }, [cart]);

  const taxAmounts = useMemo(() => {
    if (!taxSettings) return { vatAmount: 0, nhilAmount: 0, getFundAmount: 0, totalTax: 0 };
    const vatAmount = subtotal * taxSettings.vat;
    const nhilAmount = subtotal * taxSettings.nhil;
    const getFundAmount = subtotal * taxSettings.getFund;
    const totalTax = vatAmount + nhilAmount + getFundAmount;
    return { vatAmount, nhilAmount, getFundAmount, totalTax };
  }, [subtotal, taxSettings]);

  const totalAmount = subtotal + taxAmounts.totalTax;

  const handleConfirmSale = async (details: CheckoutDetails) => {
    if (!currentUser?.businessId || !currentUser.id || !taxSettings) {
      toast({ title: "Error", description: "User, business, or tax context is missing.", variant: "destructive" });
      return;
    }
    setIsSaving(true);

    try {
      const saleNumber = await generateSaleNumber();
      const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

      const salePayload: Omit<CashSale, "id" | "createdAt" | "updatedAt"> = {
        saleNumber,
        businessId: currentUser.businessId,
        recordedBy: currentUser.id,
        customerId: selectedCustomerId || undefined,
        customerName: selectedCustomer?.name || "Walk-in Customer",
        date: new Date(),
        items: cart,
        subtotal,
        taxDetails: {
          vatRate: taxSettings.vat,
          nhilRate: taxSettings.nhil,
          getFundRate: taxSettings.getFund,
          ...taxAmounts,
        },
        totalAmount,
        paymentMethod: details.paymentMethod,
        paymentReference: details.paymentReference,
      };

      await runTransaction(db, async (transaction) => {
        const cashSaleDocRef = doc(collection(db, "cashSales"));
        transaction.set(cashSaleDocRef, { ...salePayload, createdAt: serverTimestamp() });

        for (const saleItem of cart) {
          const productItem = availableItems.find(p => p.id === saleItem.itemId);
          if (productItem && productItem.trackInventory) {
            const itemRef = doc(db, "items", saleItem.itemId!);
            const itemSnap = await transaction.get(itemRef);
            if (itemSnap.exists()) {
              const currentQuantity = itemSnap.data().quantityOnHand || 0;
              transaction.update(itemRef, { 
                quantityOnHand: currentQuantity - saleItem.quantity,
                updatedAt: serverTimestamp()
              });
            }
          }
        }
      });

      toast({ title: "Sale Completed!", description: `Sale ${saleNumber} has been recorded.` });
      setCart([]);
      setSelectedCustomerId("");
      setIsCheckoutOpen(false);
      // You might want to refetch items here to update stock counts if they are displayed
    } catch (error) {
      console.error("Error completing sale:", error);
      toast({ title: "Sale Failed", description: "Could not complete the sale. " + (error instanceof Error ? error.message : ""), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
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
            <ItemCatalog
              items={availableItems}
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={setSelectedCategoryId}
              onAddItem={handleAddItemToCart}
              disabled={isSaving}
            />
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

        <CheckoutModal
          isOpen={isCheckoutOpen}
          onOpenChange={setIsCheckoutOpen}
          totalAmount={totalAmount}
          onConfirmSale={handleConfirmSale}
          isSaving={isSaving}
        />

      </AuthenticatedLayout>
    </AuthGuard>
  );
}
