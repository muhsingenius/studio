
"use client";

import { useState, useEffect, useCallback } from "react";
import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, FileText, Users, Receipt, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, Timestamp, orderBy, limit, doc, getDoc } from "firebase/firestore";
import type { Payment, RevenueRecord, Invoice } from "@/types";
import { format } from "date-fns";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

interface DashboardSummary {
  totalRevenue: number;
  totalInvoiceRevenue: number;
  totalOtherRevenue: number;
  totalExpenses: number; // Placeholder for now
  netProfit: number; // Placeholder for now
  taxObligation: number; // Placeholder for now
  overdueInvoicesCount: number;
  activeCustomersCount: number; // Placeholder for now
}

interface TransactionItem {
  id: string;
  type: "Invoice Payment" | "Other Revenue" | "Expense"; // Added Expense for future
  description: string;
  amount: number;
  date: Date;
  rawDate: Date; // For sorting
}

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const [summaryData, setSummaryData] = useState<DashboardSummary | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<TransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    if (!currentUser?.businessId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    try {
      let totalInvoiceRevenue = 0;
      let totalOtherRevenue = 0;
      let overdueInvoicesCount = 0;
      const fetchedTransactions: TransactionItem[] = [];

      // Fetch Invoice Payments and related Invoice data
      const paymentsQuery = query(
        collection(db, "payments"),
        where("businessId", "==", currentUser.businessId)
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      
      const invoicePromises = paymentsSnapshot.docs.map(async (paymentDoc) => {
        const payment = { id: paymentDoc.id, ...paymentDoc.data() } as Payment;
        totalInvoiceRevenue += payment.amountPaid;
        
        // Fetch corresponding invoice to get invoice number for description
        let invoiceNumber = "N/A";
        if (payment.invoiceId) {
            const invoiceDocRef = doc(db, "invoices", payment.invoiceId);
            const invoiceSnap = await getDoc(invoiceDocRef);
            if (invoiceSnap.exists()) {
                invoiceNumber = (invoiceSnap.data() as Invoice).invoiceNumber || "N/A";
            }
        }

        fetchedTransactions.push({
          id: payment.id,
          type: "Invoice Payment",
          description: `Payment for Invoice #${invoiceNumber}`,
          amount: payment.amountPaid,
          date: (payment.paymentDate as Timestamp)?.toDate ? (payment.paymentDate as Timestamp).toDate() : new Date(payment.paymentDate as any),
          rawDate: (payment.paymentDate as Timestamp)?.toDate ? (payment.paymentDate as Timestamp).toDate() : new Date(payment.paymentDate as any),
        });
      });
      await Promise.all(invoicePromises);


      // Fetch Other Revenue Records
      const revenueRecordsQuery = query(
        collection(db, "revenueRecords"),
        where("businessId", "==", currentUser.businessId)
      );
      const revenueRecordsSnapshot = await getDocs(revenueRecordsQuery);
      revenueRecordsSnapshot.forEach((docSnap) => { // Renamed doc to docSnap to avoid conflict with firestore's doc
        const record = { id: docSnap.id, ...docSnap.data() } as RevenueRecord;
        totalOtherRevenue += record.amount;
        fetchedTransactions.push({
          id: record.id,
          type: "Other Revenue",
          description: record.source,
          amount: record.amount,
          date: (record.dateReceived as Timestamp)?.toDate ? (record.dateReceived as Timestamp).toDate() : new Date(record.dateReceived as any),
          rawDate: (record.dateReceived as Timestamp)?.toDate ? (record.dateReceived as Timestamp).toDate() : new Date(record.dateReceived as any),
        });
      });
      
      // Fetch Overdue Invoices Count
      const overdueInvoicesQuery = query(
        collection(db, "invoices"),
        where("businessId", "==", currentUser.businessId),
        where("status", "==", "Overdue")
      );
      const overdueInvoicesSnapshot = await getDocs(overdueInvoicesQuery);
      overdueInvoicesCount = overdueInvoicesSnapshot.size;
      
      // Placeholder for Expenses, Profit, Tax, Customers - these need their own data sources
      const totalExpenses = 0; // Replace with actual expense fetching
      const activeCustomersCount = 0; // Replace with actual customer count

      setSummaryData({
        totalRevenue: totalInvoiceRevenue + totalOtherRevenue,
        totalInvoiceRevenue,
        totalOtherRevenue,
        totalExpenses, // Placeholder
        netProfit: totalInvoiceRevenue + totalOtherRevenue - totalExpenses, // Simplified profit
        taxObligation: (totalInvoiceRevenue + totalOtherRevenue) * 0.15, // Very rough VAT estimate
        overdueInvoicesCount,
        activeCustomersCount, // Placeholder
      });

      // Sort transactions by date (most recent first) and take top 5
      fetchedTransactions.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
      setRecentTransactions(fetchedTransactions.slice(0, 5));

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      // Handle error (e.g., show a toast)
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.businessId]); 


  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (isLoading) {
    return (
      <AuthGuard>
        <AuthenticatedLayout>
          <LoadingSpinner fullPage />
        </AuthenticatedLayout>
      </AuthGuard>
    );
  }
  
  if (!summaryData) {
     return (
      <AuthGuard>
        <AuthenticatedLayout>
          <PageHeader title="Dashboard" description="Loading your financial overview..." />
           <div className="text-center py-10 text-muted-foreground">
            Could not load dashboard data. Please try again later.
          </div>
        </AuthenticatedLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <AuthenticatedLayout>
        <PageHeader title="Dashboard" description="Welcome to your financial overview." />
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">GHS {summaryData.totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
              <p className="text-xs text-muted-foreground">All income sources combined</p>
            </CardContent>
          </Card>

           <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue from Invoices</CardTitle>
              <Receipt className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">GHS {summaryData.totalInvoiceRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
              <p className="text-xs text-muted-foreground">Payments received for invoices</p>
            </CardContent>
          </Card>

           <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Other Revenue</CardTitle>
              <Coins className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">GHS {summaryData.totalOtherRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
              <p className="text-xs text-muted-foreground">Direct sales, commissions, etc.</p>
            </CardContent>
          </Card>


          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-5 w-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">GHS {summaryData.totalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
              <p className="text-xs text-muted-foreground">Feature coming soon</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{summaryData.overdueInvoicesCount}</div>
              {/* <p className="text-xs text-muted-foreground">{summaryData.pendingInvoices} pending</p> */}
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
              <Users className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{summaryData.activeCustomersCount}</div>
              <p className="text-xs text-muted-foreground">Feature coming soon</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>A quick look at your latest financial activities (invoice payments & other revenue).</CardDescription>
            </CardHeader>
            <CardContent>
              {recentTransactions.length > 0 ? (
                <div className="space-y-4">
                  {recentTransactions.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between p-3 rounded-md hover:bg-secondary/50 transition-colors">
                      <div>
                        <p className="font-medium">{tx.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(tx.date, "dd MMM, yyyy")} - <span className={cn("font-semibold text-xs capitalize", 
                            tx.type === "Invoice Payment" ? "text-primary" :
                            tx.type === "Other Revenue" ? "text-accent" :
                            "text-destructive" // For future expenses
                            )}>{tx.type}</span>
                        </p>
                      </div>
                      <div className={cn("font-semibold", tx.amount >= 0 ? "text-green-600" : "text-red-600")}>
                        GHS {tx.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-6 text-muted-foreground">No recent transactions found.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </AuthenticatedLayout>
    </AuthGuard>
  );
}
