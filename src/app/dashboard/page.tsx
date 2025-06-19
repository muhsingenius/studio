"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, FileText, Users } from "lucide-react";

// Placeholder data - replace with actual data fetching
const summaryData = {
  income: 12500.75,
  expenses: 7800.50,
  profit: 4700.25,
  taxObligation: 1850.00,
  overdueInvoices: 3,
  pendingInvoices: 5,
  activeCustomers: 25,
};

const recentTransactions = [
  { id: 1, type: "Income", description: "Invoice #INV001 Payment", amount: 1500, date: "2024-07-28" },
  { id: 2, type: "Expense", description: "Office Supplies", amount: -120, date: "2024-07-27" },
  { id: 3, type: "Income", description: "Service Fee", amount: 800, date: "2024-07-26" },
];


export default function DashboardPage() {
  return (
    <AuthGuard>
      <AuthenticatedLayout>
        <PageHeader title="Dashboard" description="Welcome to your financial overview." />
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">GHS {summaryData.income.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+20.1% from last month</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-5 w-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">GHS {summaryData.expenses.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+10.5% from last month</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              <DollarSign className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">GHS {summaryData.profit.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Calculated from income & expenses</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tax Obligations (Est.)</CardTitle>
              <FileText className="h-5 w-5 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">GHS {summaryData.taxObligation.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Next filing due: 2024-08-15</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{summaryData.overdueInvoices}</div>
              <p className="text-xs text-muted-foreground">{summaryData.pendingInvoices} pending</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
              <Users className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{summaryData.activeCustomers}</div>
              <p className="text-xs text-muted-foreground">+3 this month</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>A quick look at your latest financial activities.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTransactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-md hover:bg-secondary/50 transition-colors">
                    <div>
                      <p className="font-medium">{tx.description}</p>
                      <p className="text-sm text-muted-foreground">{tx.date}</p>
                    </div>
                    <div className={cn("font-semibold", tx.amount > 0 ? "text-green-600" : "text-red-600")}>
                      GHS {Math.abs(tx.amount).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
              {/* Placeholder for actual chart */}
              {/* <div className="mt-6 h-64 bg-muted rounded-md flex items-center justify-center">
                <p className="text-muted-foreground">Income vs Expenses Chart Placeholder</p>
              </div> */}
            </CardContent>
          </Card>
        </div>
      </AuthenticatedLayout>
    </AuthGuard>
  );
}
