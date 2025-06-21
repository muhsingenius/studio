
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, FileText, ShoppingCart, Coins } from "lucide-react";
import type { RevenueRecord, Payment, CashSale, Invoice } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  Timestamp,
  where,
  getDoc,
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AggregatedRevenueItem {
  id: string;
  date: Date;
  type: 'Invoice Payment' | 'Cash Sale' | 'Other Revenue';
  source: string;
  amount: number;
  link?: string;
  typeIcon: React.ElementType;
}

export default function RevenueLedgerPage() {
  const [aggregatedData, setAggregatedData] = useState<AggregatedRevenueItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const router = useRouter();

  const fetchData = useCallback(async () => {
    if (!currentUser || !currentUser.businessId) {
      setAggregatedData([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const businessId = currentUser.businessId;

      // 1. Fetch Invoice Payments
      const paymentsQuery = query(collection(db, "payments"), where("businessId", "==", businessId));
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const paymentPromises = paymentsSnapshot.docs.map(async (paymentDoc) => {
        const payment = paymentDoc.data() as Payment;
        let invoiceNumber = payment.invoiceId; // Fallback
        try {
          const invoiceDoc = await getDoc(doc(db, "invoices", payment.invoiceId));
          if (invoiceDoc.exists()) invoiceNumber = (invoiceDoc.data() as Invoice).invoiceNumber;
        } catch (e) { console.error(`Failed to fetch invoice ${payment.invoiceId}`, e); }
        
        return {
          id: `payment-${paymentDoc.id}`,
          date: (payment.paymentDate as Timestamp).toDate(),
          type: 'Invoice Payment',
          source: `Payment for Invoice #${invoiceNumber}`,
          amount: payment.amountPaid,
          link: `/invoices/${payment.invoiceId}`,
          typeIcon: FileText,
        } as AggregatedRevenueItem;
      });

      // 2. Fetch Cash Sales
      const cashSalesQuery = query(collection(db, "cashSales"), where("businessId", "==", businessId));
      const cashSalesSnapshot = await getDocs(cashSalesQuery);
      const processedCashSales = cashSalesSnapshot.docs.map(saleDoc => {
        const sale = saleDoc.data() as CashSale;
        return {
          id: `sale-${saleDoc.id}`,
          date: (sale.date as Timestamp).toDate(),
          type: 'Cash Sale',
          source: `Sale #${sale.saleNumber}`,
          amount: sale.totalAmount,
          link: `/sales/${saleDoc.id}`,
          typeIcon: ShoppingCart,
        } as AggregatedRevenueItem;
      });

      // 3. Fetch Other Revenue Records
      const otherRevenueQuery = query(collection(db, "revenueRecords"), where("businessId", "==", businessId));
      const otherRevenueSnapshot = await getDocs(otherRevenueQuery);
      const processedOtherRevenue = otherRevenueSnapshot.docs.map(recordDoc => {
        const record = recordDoc.data() as RevenueRecord;
        return {
          id: `other-${recordDoc.id}`,
          date: (record.dateReceived as Timestamp).toDate(),
          type: 'Other Revenue',
          source: record.source,
          amount: record.amount,
          link: `/revenue/${recordDoc.id}`,
          typeIcon: Coins,
        } as AggregatedRevenueItem;
      });

      const processedPayments = await Promise.all(paymentPromises);
      const allRevenue = [...processedPayments, ...processedCashSales, ...processedOtherRevenue];
      allRevenue.sort((a, b) => b.date.getTime() - a.date.getTime());
      
      setAggregatedData(allRevenue);

    } catch (error) {
      console.error("Error fetching aggregated revenue data: ", error);
      toast({ title: "Error", description: "Could not fetch revenue ledger data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddRevenue = () => {
    router.push("/revenue/new");
  };
  
  const handleRowClick = (link?: string) => {
    if (link) {
      router.push(link);
    }
  }

  const filteredRecords = useMemo(() => 
    aggregatedData.filter(record =>
      record.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.type.toLowerCase().includes(searchTerm.toLowerCase())
  ), [aggregatedData, searchTerm]);

  return (
    <AuthGuard>
      <AuthenticatedLayout>
        <PageHeader
          title="Revenue Ledger"
          description="A complete chronological record of all income from every source."
          actions={
            <Button onClick={handleAddRevenue} className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
              <PlusCircle className="mr-2 h-5 w-5" /> Record Other Revenue
            </Button>
          }
        />

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by source, description, or type..."
              className="w-full pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        {isLoading && <LoadingSpinner fullPage />} 
        
        {!isLoading && (
          <Card className="shadow-lg">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Source / Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount (GHS)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => (
                      <TableRow 
                        key={record.id} 
                        className={cn("hover:bg-muted/50", record.link && "cursor-pointer")}
                        onClick={() => handleRowClick(record.link)}
                      >
                        <TableCell>{format(new Date(record.date), "dd MMM, yyyy")}</TableCell>
                        <TableCell className="font-medium">{record.source}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <record.typeIcon className="h-4 w-4" />
                            {record.type}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">{record.amount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                          {aggregatedData.length === 0 ? "No revenue recorded yet across any source." : "No records match your search."}
                        </TableCell>
                      </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </AuthenticatedLayout>
    </AuthGuard>
  );
}
