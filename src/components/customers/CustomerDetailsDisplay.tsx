
"use client";

import type { Customer } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

interface CustomerDetailsDisplayProps {
  customer: Customer;
}

export default function CustomerDetailsDisplay({ customer }: CustomerDetailsDisplayProps) {
  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-3xl text-primary">{customer.name}</CardTitle>
        <CardDescription>Customer ID: {customer.id}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone" className="text-sm font-medium text-muted-foreground">Phone Number</Label>
            <p id="phone" className="text-lg">{customer.phone}</p>
          </div>
          <div>
            <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">Email Address</Label>
            <p id="email" className="text-lg">{customer.email || "N/A"}</p>
          </div>
        </div>
        <div>
          <Label htmlFor="location" className="text-sm font-medium text-muted-foreground">Location / Address</Label>
          <p id="location" className="text-lg whitespace-pre-wrap">{customer.location}</p>
        </div>
        <div className="border-t pt-4 mt-4">
          <Label htmlFor="createdAt" className="text-sm font-medium text-muted-foreground">Customer Since</Label>
          <p id="createdAt" className="text-md">{format(new Date(customer.createdAt), "PPP p")}</p>
        </div>
         {/* Placeholder for future details like recent activity, total spent, etc. */}
        {/*
        <div className="border-t pt-4 mt-4">
            <h4 className="text-md font-semibold mb-2">Additional Information</h4>
            <p className="text-sm text-muted-foreground">More details will be shown here in the future.</p>
        </div>
        */}
      </CardContent>
    </Card>
  );
}
