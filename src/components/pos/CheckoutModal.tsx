
"use client";

import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { PaymentMethod, CashSale } from "@/types";
import { paymentMethods } from "@/types";
import LoadingSpinner from "../shared/LoadingSpinner";
import { DollarSign, Printer, CheckCircle } from "lucide-react";

export interface CheckoutDetails {
  paymentMethod: PaymentMethod;
  paymentReference?: string;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  totalAmount: number;
  onConfirmSale: (details: CheckoutDetails) => void;
  isSaving: boolean;
  lastSale: CashSale | null;
  onPrintReceipt: () => void;
  onNewSale: () => void;
}

export default function CheckoutModal({
  isOpen,
  onOpenChange,
  totalAmount,
  onConfirmSale,
  isSaving,
  lastSale,
  onPrintReceipt,
  onNewSale,
}: CheckoutModalProps) {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [amountTendered, setAmountTendered] = useState<string>("");
  const [paymentReference, setPaymentReference] = useState<string>("");

  useEffect(() => {
    // Reset state only when opening for a new sale, not when it becomes a success screen
    if (isOpen && !lastSale) {
      setSelectedPaymentMethod('Cash'); // Default to cash for speed
      setAmountTendered("");
      setPaymentReference("");
    }
  }, [isOpen, lastSale]);

  const changeDue = useMemo(() => {
    if (selectedPaymentMethod !== "Cash" || !amountTendered) {
      return 0;
    }
    const tendered = parseFloat(amountTendered);
    if (isNaN(tendered) || tendered < totalAmount) {
      return 0;
    }
    return tendered - totalAmount;
  }, [selectedPaymentMethod, amountTendered, totalAmount]);

  const handleConfirm = () => {
    if (selectedPaymentMethod) {
      onConfirmSale({
        paymentMethod: selectedPaymentMethod,
        paymentReference,
      });
    }
  };

  const isCash = selectedPaymentMethod === "Cash";
  const canConfirm = selectedPaymentMethod && (!isCash || (isCash && parseFloat(amountTendered) >= totalAmount));

  if (lastSale) {
    const saleChangeDue = useMemo(() => {
        if (lastSale.paymentMethod === 'Cash' && lastSale.totalAmount > 0) {
            // We don't have amount tendered on the lastSale object, so we recalculate
            // This assumes the amount tendered was correctly entered before saving.
            // For simplicity, we re-use the `changeDue` state from the previous screen.
            return changeDue;
        }
        return 0;
    }, [lastSale, changeDue]);

    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onNewSale()}>
        <DialogContent>
          <DialogHeader className="text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-2" />
            <DialogTitle className="font-headline text-2xl">Sale Completed!</DialogTitle>
            <DialogDescription>
              Sale #{lastSale.saleNumber} recorded successfully.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center">
            {lastSale.paymentMethod === 'Cash' && saleChangeDue > 0 && (
              <div className="space-y-1">
                <Label>Change Due</Label>
                <p className="text-3xl font-bold text-primary">GHS {saleChangeDue.toFixed(2)}</p>
              </div>
            )}
          </div>
          <DialogFooter className="sm:justify-center gap-2">
            <Button onClick={onNewSale} variant="outline" className="w-full sm:w-auto">
              Start New Sale
            </Button>
            <Button onClick={onPrintReceipt} className="w-full sm:w-auto">
              <Printer className="mr-2 h-4 w-4" /> Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Finalize Sale</DialogTitle>
          <DialogDescription>
            Total Amount Due:
            <span className="text-xl font-bold text-primary ml-2">
              GHS {totalAmount.toFixed(2)}
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Select Payment Method</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {paymentMethods.map((method) => (
                <Button
                  key={method}
                  variant={selectedPaymentMethod === method ? "default" : "outline"}
                  onClick={() => setSelectedPaymentMethod(method)}
                  disabled={isSaving}
                >
                  {method}
                </Button>
              ))}
            </div>
          </div>

          {isCash && (
            <div className="space-y-2 p-4 border rounded-md bg-secondary/30">
              <h4 className="font-medium">Cash Payment</h4>
              <div>
                <Label htmlFor="amountTendered">Amount Tendered (GHS)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="amountTendered"
                    type="number"
                    value={amountTendered}
                    onChange={(e) => setAmountTendered(e.target.value)}
                    placeholder="e.g., 100.00"
                    className="pl-8"
                    min={totalAmount}
                    disabled={isSaving}
                  />
                </div>
              </div>
              <div>
                <Label>Change Due</Label>
                <div className="text-2xl font-bold text-green-600">
                  GHS {changeDue.toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {!isCash && selectedPaymentMethod && (
             <div className="space-y-2">
                <Label htmlFor="paymentReference">Payment Reference (Optional)</Label>
                <Input
                    id="paymentReference"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="e.g., Transaction ID"
                    disabled={isSaving}
                />
             </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSaving}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm || isSaving}
          >
            {isSaving && <LoadingSpinner size={16} className="mr-2" />}
            {isSaving ? "Processing..." : "Complete Sale"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
