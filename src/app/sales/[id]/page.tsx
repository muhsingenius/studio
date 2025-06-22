
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import CashSaleDetailsDisplay from "@/components/sales/DirectSaleDetailsDisplay";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Printer } from "lucide-react";
import type { CashSale } from "@/types";
import { db } from "@/lib/firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function ViewCashSalePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, currentBusiness } = useAuth();

  const [sale, setSale] = useState<CashSale | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const saleId = typeof params.id === 'string' ? params.id : null;
  const currency = currentBusiness?.currency || 'GHS';

  const fetchSale = useCallback(async () => {
    if (!saleId || !currentUser?.businessId) {
      setError(saleId ? "Business context not loaded." : "Invalid sale ID.");
      setIsLoading(false);
      if (!saleId) router.push("/sales");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const saleDocRef = doc(db, "cashSales", saleId);
      const saleSnap = await getDoc(saleDocRef);

      if (saleSnap.exists() && saleSnap.data().businessId === currentUser.businessId) {
        const data = saleSnap.data();
        setSale({
          id: saleSnap.id,
          ...data,
          date: (data.date as Timestamp)?.toDate ? (data.date as Timestamp).toDate() : new Date(data.date),
          createdAt: (data.createdAt as Timestamp)?.toDate ? (data.createdAt as Timestamp).toDate() : new Date(),
        } as CashSale);
      } else {
        setError(saleSnap.exists() ? "Access Denied." : "Sale not found.");
        toast({ title: saleSnap.exists() ? "Access Denied" : "Not Found", description: saleSnap.exists() ? "This sale does not belong to your business." :`Sale with ID ${saleId} does not exist.`, variant: "destructive" });
        setSale(null);
      }
    } catch (err: any) {
      console.error("Error fetching sale: ", err);
      setError("Failed to fetch sale data.");
      toast({ title: "Error", description: "Could not retrieve sale details.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [saleId, toast, router, currentUser]);

  useEffect(() => {
    fetchSale();
  }, [fetchSale]);

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
          title={sale ? `Cash Sale ${sale.saleNumber}` : "View Cash Sale"}
          description={sale ? `Details for cash sale to ${sale.customerName || 'Walk-in Customer'}` : "Loading sale details..."}
          actions={
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <Button variant="outline" onClick={() => router.push("/sales")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sales
              </Button>
               <Button onClick={() => toast({ title: "Coming Soon", description: "Printing functionality will be available soon."})} variant="outline">
                <Printer className="mr-2 h-4 w-4" />
                Print Receipt
              </Button>
              {sale && ( // Edit might be restricted in the form itself
                <Button onClick={() => router.push(`/sales/${sale.id}/edit`)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Cash Sale
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
        {sale && !error && (
          <CashSaleDetailsDisplay sale={sale} currency={currency} />
        )}
        {!sale && !isLoading && !error && (
             <div className="text-center py-10 text-muted-foreground">
                <p>Could not load sale details.</p>
             </div>
        )}
      </AuthenticatedLayout>
    </AuthGuard>
  );
}
