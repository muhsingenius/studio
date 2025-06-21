
"use client";

import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/types";
import { paymentMethods } from "@/types";
import LoadingSpinner from "../shared/LoadingSpinner";
import { DollarSign } from "lucide-react";

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
}

export default function CheckoutModal({
  isOpen,
  onOpenChange,
  totalAmount,
  onConfirmSale,
  isSaving,
}: CheckoutModalProps) {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [amountTendered, setAmountTendered] = useState<string>("");
  const [paymentReference, setPaymentReference] = useState<string>("");

  useEffect(() => {
    // Reset state when modal opens
    if (isOpen) {
      setSelectedPaymentMethod(null);
      setAmountTendered("");
      setPaymentReference("");
    }
  }, [isOpen]);

  const changeDue = useMemo(() => {
    if (selectedPaymentMethod !== "Cash" || !amountTendered) {
      return 0;
    }
    const tendered = parseFloat(amountTendered);
    return isNaN(tendered) ? 0 : tendered - totalAmount;
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
                  GHS {changeDue >= 0 ? changeDue.toFixed(2) : "0.00"}
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
