"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import AuthenticatedLayout from "@/components/layout/AuthenticatedLayout";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";

// Placeholder for the future POS layout
export default function POSPage() {
  return (
    <AuthGuard>
      <AuthenticatedLayout>
        <PageHeader
          title="Point of Sale (POS)"
          description="Handle fast, in-person transactions."
        />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 h-[calc(100vh-200px)]">
          {/* Left Panel: Item Selection */}
          <Card className="lg:col-span-3">
            <CardContent className="p-4">
              <p className="text-muted-foreground text-center py-10">Item Search & Catalog (Coming Soon)</p>
            </CardContent>
          </Card>

          {/* Right Panel: Cart/Ticket */}
          <Card className="lg:col-span-2">
            <CardContent className="p-4">
              <p className="text-muted-foreground text-center py-10">Cart & Checkout (Coming Soon)</p>
            </CardContent>
          </Card>
        </div>
      </AuthenticatedLayout>
    </AuthGuard>
  );
}
