
"use client";

import type { Invoice, Payment } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Coins } from "lucide-react";

interface InvoiceDetailsDisplayProps {
  invoice: Invoice;
  payments: Payment[];
  currency: string;
}

const getStatusVariant = (status: Invoice["status"]): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "Paid": return "default";
    case "Pending": return "secondary";
    case "Overdue": return "destructive";
    case "Partially Paid": return "outline";
    default: return "outline";
  }
};

export default function InvoiceDetailsDisplay({ invoice, payments, currency }: InvoiceDetailsDisplayProps) {
  const {
    invoiceNumber,
    customerName,
    status,
    dateIssued,
    dueDate,
    items,
    subtotal,
    taxDetails,
    totalAmount,
    totalPaidAmount,
    notes,
  } = invoice;

  const outstandingAmount = totalAmount - totalPaidAmount;

  return (
    <Card className="shadow-xl w-full max-w-4xl mx-auto">
      <CardHeader className="bg-muted/30 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="font-headline text-3xl md:text-4xl text-primary">Invoice {invoiceNumber}</CardTitle>
            <CardDescription className="text-md">
              Issued to: <span className="font-semibold">{customerName || "N/A"}</span>
            </CardDescription>
          </div>
          <div className="text-right">
            <Badge 
              variant={getStatusVariant(status)} 
              className={cn(
                "text-lg px-4 py-1.5",
                status === "Paid" ? "bg-green-100 text-green-700 border-green-300" : "",
                status === "Pending" ? "bg-yellow-100 text-yellow-700 border-yellow-300" : "",
                status === "Overdue" ? "bg-red-100 text-red-700 border-red-300" : "",
                status === "Partially Paid" ? "bg-blue-100 text-blue-700 border-blue-300" : ""
              )}
            >
              {status}
            </Badge>
            <p className="text-sm text-muted-foreground mt-1">
              Issued: {format(new Date(dateIssued), "PPP")}
            </p>
            <p className="text-sm text-muted-foreground">
              Due: {format(new Date(dueDate), "PPP")}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2 font-headline">Items</h3>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60%]">Description</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price ({currency})</TableHead>
                  <TableHead className="text-right">Total ({currency})</TableHead>
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

        {payments && payments.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 font-headline flex items-center">
              <Coins className="mr-2 h-5 w-5 text-primary" />
              Payment History
            </h3>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date Paid</TableHead>
                    <TableHead>Amount ({currency})</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{format(new Date(payment.paymentDate), "PPP")}</TableCell>
                      <TableCell className="text-right">{payment.amountPaid.toFixed(2)}</TableCell>
                      <TableCell>{payment.paymentMethod}</TableCell>
                      <TableCell>{payment.paymentReference || "N/A"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}


        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <div>
            {notes && (
              <>
                <h3 className="text-lg font-semibold mb-2 font-headline">Notes & Terms</h3>
                <div className="prose prose-sm text-muted-foreground max-w-none bg-secondary/20 p-4 rounded-md border border-dashed">
                  <p style={{ whiteSpace: 'pre-wrap' }}>{notes}</p>
                </div>
              </>
            )}
          </div>
          
          <div className="space-y-2 text-sm md:text-base">
            <h3 className="text-lg font-semibold mb-3 font-headline text-right">Summary</h3>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">{currency} {subtotal.toFixed(2)}</span>
            </div>
            {taxDetails && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT ({ (taxDetails.vatRate * 100).toFixed(1) }%):</span>
                  <span className="font-medium">{currency} {taxDetails.vatAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">NHIL ({ (taxDetails.nhilRate * 100).toFixed(1) }%):</span>
                  <span className="font-medium">{currency} {taxDetails.nhilAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GETFund ({ (taxDetails.getFundRate * 100).toFixed(1) }%):</span>
                  <span className="font-medium">{currency} {taxDetails.getFundAmount.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between font-semibold">
                  <span className="text-muted-foreground">Total Tax:</span>
                  <span>{currency} {taxDetails.totalTax.toFixed(2)}</span>
                </div>
              </>
            )}
            <Separator className="my-1" />
            <div className="flex justify-between text-lg font-semibold">
              <span>Total Amount:</span>
              <span>{currency} {totalAmount.toFixed(2)}</span>
            </div>
             <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount Paid:</span>
              <span className="font-medium text-green-600">{currency} {(totalPaidAmount || 0).toFixed(2)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between text-xl font-bold text-primary pt-1">
              <span>Outstanding Amount:</span>
              <span>{currency} {outstandingAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-6 border-t text-center text-muted-foreground text-xs">
        <p>Thank you for your business! If you have any questions concerning this invoice, please contact us.</p>
      </CardFooter>
    </Card>
  );
}
