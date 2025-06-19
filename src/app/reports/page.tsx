"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChartBig, FileSpreadsheet, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ReportsPage() {
  return (
    <AuthGuard>
      <AuthenticatedLayout>
        <PageHeader
          title="Reports"
          description="Generate and view financial reports for your business."
        />
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <BarChartBig className="h-8 w-8 text-primary" />
                <CardTitle className="font-headline text-xl">Profit & Loss Statement</CardTitle>
              </div>
              <CardDescription>View your income, cost of goods sold, and expenses over a period.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Placeholder for P&L options and generation */}
              <Button className="w-full" disabled>Generate P&L (Coming Soon)</Button>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
               <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-accent" />
                <CardTitle className="font-headline text-xl">Tax Summary</CardTitle>
              </div>
              <CardDescription>VAT, NHIL, GETFund, and Withholding Tax summaries.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Placeholder for Tax Summary options */}
               <Button className="w-full" disabled>Generate Tax Report (Coming Soon)</Button>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <PieChart className="h-8 w-8 text-secondary-foreground" />
                <CardTitle className="font-headline text-xl">Cash Flow Overview</CardTitle>
              </div>
              <CardDescription>Track the movement of cash in and out of your business.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Placeholder for Cash Flow options */}
              <Button className="w-full" disabled>View Cash Flow (Coming Soon)</Button>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-8 text-center">
            <p className="text-muted-foreground">More detailed reports and export options will be available soon.</p>
        </div>

      </AuthenticatedLayout>
    </AuthGuard>
  );
}
