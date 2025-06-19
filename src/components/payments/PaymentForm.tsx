
"use client";

import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { format } from "date-fns";
import { CalendarIcon, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Payment } from "@/types";

const paymentMethods = ["Cash", "Mobile Money", "Bank Transfer", "Cheque", "Card", "Other"] as const;

const paymentFormSchema = z.object({
  amountPaid: z.coerce.number().positive({ message: "Amount paid must be a positive number." }),
  paymentDate: z.date({ required_error: "Payment date is required." }),
  paymentMethod: z.enum(paymentMethods, { required_error: "Payment method is required." }),
  paymentReference: z.string().optional(),
  notes: z.string().optional(),
});

export type PaymentFormInputs = z.infer<typeof paymentFormSchema>;

interface PaymentFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: PaymentFormInputs) => Promise<void>;
  invoiceId: string;
  invoiceTotalAmount: number;
  currentPaidAmount: number;
  isSaving?: boolean;
}

export default function PaymentForm({ 
  isOpen, 
  onOpenChange, 
  onSave, 
  invoiceId, 
  invoiceTotalAmount,
  currentPaidAmount,
  isSaving 
}: PaymentFormProps) {
  const outstandingAmount = invoiceTotalAmount - currentPaidAmount;

  const { control, register, handleSubmit, formState: { errors }, reset } = useForm<PaymentFormInputs>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amountPaid: Math.max(0, outstandingAmount), // Default to outstanding or 0 if overpaid
      paymentDate: new Date(),
      paymentMethod: undefined, // Let user select
      paymentReference: "",
      notes: "",
    },
  });

  React.useEffect(() => {
    if (isOpen) {
      reset({
        amountPaid: Math.max(0, invoiceTotalAmount - currentPaidAmount),
        paymentDate: new Date(),
        paymentMethod: undefined,
        paymentReference: "",
        notes: "",
      });
    }
  }, [isOpen, reset, invoiceTotalAmount, currentPaidAmount]);


  const processSubmit: SubmitHandler<PaymentFormInputs> = async (data) => {
    await onSave(data);
    if (!isSaving) { // Only close if save wasn't interrupted by an error that kept isSaving true
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Record Payment for Invoice</DialogTitle>
          <DialogDescription>
            Enter the details for the payment received. Invoice ID: {invoiceId}
            <br />
            Total Due: GHS {invoiceTotalAmount.toFixed(2)} | Already Paid: GHS {currentPaidAmount.toFixed(2)} | <span className="font-semibold">Outstanding: GHS {outstandingAmount.toFixed(2)}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(processSubmit)} className="space-y-5 py-4">
          <div>
            <Label htmlFor="amountPaid">Amount Paid (GHS) *</Label>
            <div className="relative">
              <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="amountPaid"
                type="number"
                step="0.01"
                min="0.01"
                className="pl-8"
                {...register("amountPaid")}
                aria-invalid={!!errors.amountPaid}
              />
            </div>
            {errors.amountPaid && <p className="text-sm text-destructive mt-1">{errors.amountPaid.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="paymentDate">Payment Date *</Label>
              <Controller
                name="paymentDate"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="paymentDate"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground",
                          errors.paymentDate && "border-destructive"
                        )}
                        aria-invalid={!!errors.paymentDate}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.paymentDate && <p className="text-sm text-destructive mt-1">{errors.paymentDate.message}</p>}
            </div>
            <div>
              <Label htmlFor="paymentMethod">Payment Method *</Label>
              <Controller
                name="paymentMethod"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger id="paymentMethod" aria-invalid={!!errors.paymentMethod}>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map(method => (
                        <SelectItem key={method} value={method}>{method}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.paymentMethod && <p className="text-sm text-destructive mt-1">{errors.paymentMethod.message}</p>}
            </div>
          </div>
          
          <div>
            <Label htmlFor="paymentReference">Payment Reference (Optional)</Label>
            <Input id="paymentReference" {...register("paymentReference")} placeholder="e.g., Transaction ID, Cheque No." />
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea id="notes" {...register("notes")} placeholder="Any additional details about the payment..." rows={3}/>
          </div>

          <DialogFooter className="pt-5">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSaving}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <LoadingSpinner size={16} className="mr-2" />}
              {isSaving ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
