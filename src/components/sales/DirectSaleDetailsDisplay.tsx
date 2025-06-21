
"use client";

import type { CashSale } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface CashSaleDetailsDisplayProps {
  sale: CashSale;
}

export default function CashSaleDetailsDisplay({ sale }: CashSaleDetailsDisplayProps) {
  const {
    saleNumber,
    customerName,
    date,
    items,
    subtotal,
    taxDetails,
    totalAmount,
    paymentMethod,
    paymentReference,
    notes,
  } = sale;

  return (
    <Card className="shadow-xl w-full max-w-3xl mx-auto">
      <CardHeader className="bg-muted/30 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="font-headline text-3xl md:text-4xl text-primary">Cash Sale {saleNumber}</CardTitle>
            <CardDescription className="text-md">
              Customer: <span className="font-semibold">{customerName || "Walk-in Customer"}</span>
            </CardDescription>
          </div>
          <div className="text-right">
             <Badge 
              variant="default" 
              className="text-lg px-4 py-1.5 bg-green-100 text-green-700 border-green-300"
            >
              Completed
            </Badge>
            <p className="text-sm text-muted-foreground mt-1">
              Date: {format(new Date(date), "PPP")}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2 font-headline">Items Sold</h3>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60%]">Description</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price (GHS)</TableHead>
                  <TableHead className="text-right">Total (GHS)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">{item.unitPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{item.total.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <div>
            <h3 className="text-lg font-semibold mb-2 font-headline">Payment Information</h3>
            <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Method:</span> <Badge variant="secondary" className="capitalize">{paymentMethod}</Badge></p>
                {paymentReference && <p><span className="text-muted-foreground">Reference:</span> {paymentReference}</p>}
            </div>
            {notes && (
              <>
                <h3 className="text-lg font-semibold mt-4 mb-2 font-headline">Notes</h3>
                <div className="prose prose-sm text-muted-foreground max-w-none bg-secondary/20 p-3 rounded-md border border-dashed">
                  <p style={{ whiteSpace: 'pre-wrap' }}>{notes}</p>
                </div>
              </>
            )}
          </div>
          
          <div className="space-y-2 text-sm md:text-base">
            <h3 className="text-lg font-semibold mb-3 font-headline text-right">Cash Sale Summary</h3>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">GHS {subtotal.toFixed(2)}</span>
            </div>
            {taxDetails && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT ({ (taxDetails.vatRate * 100).toFixed(1) }%):</span>
                  <span className="font-medium">GHS {taxDetails.vatAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">NHIL ({ (taxDetails.nhilRate * 100).toFixed(1) }%):</span>
                  <span className="font-medium">GHS {taxDetails.nhilAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GETFund ({ (taxDetails.getFundRate * 100).toFixed(1) }%):</span>
                  <span className="font-medium">GHS {taxDetails.getFundAmount.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between font-semibold">
                  <span className="text-muted-foreground">Total Tax:</span>
                  <span>GHS {taxDetails.totalTax.toFixed(2)}</span>
                </div>
              </>
            )}
            <Separator className="my-1" />
            <div className="flex justify-between text-xl font-bold text-primary pt-1">
              <span>Total Amount Paid:</span>
              <span>GHS {totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-6 border-t text-center text-muted-foreground text-xs">
        <p>Thank you for your patronage!</p>
      </CardFooter>
    </Card>
  );
}
