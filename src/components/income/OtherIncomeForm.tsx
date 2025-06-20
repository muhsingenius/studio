
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
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { CalendarIcon, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { OtherIncomeRecord, PaymentMethod } from "@/types";
import { useRouter } from "next/navigation";

const paymentMethods: PaymentMethod[] = ["Cash", "Mobile Money", "Bank Transfer", "Cheque", "Card", "Other"];

const otherIncomeSchema = z.object({
  dateReceived: z.date({ required_error: "Date is required." }),
  source: z.string().min(2, { message: "Source must be at least 2 characters." }),
  description: z.string().min(3, { message: "Description must be at least 3 characters." }),
  amount: z.coerce.number().positive({ message: "Amount must be a positive number." }),
  paymentMethod: z.enum(paymentMethods, { required_error: "Payment method is required." }),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export type OtherIncomeFormInputs = z.infer<typeof otherIncomeSchema>;

interface OtherIncomeFormProps {
  initialData?: OtherIncomeRecord;
  onSave: (data: OtherIncomeFormInputs) => Promise<void>;
  isSaving: boolean;
  mode: "create" | "edit";
}

export default function OtherIncomeForm({ initialData, onSave, isSaving, mode }: OtherIncomeFormProps) {
  const router = useRouter();
  const { control, register, handleSubmit, formState: { errors } } = useForm<OtherIncomeFormInputs>({
    resolver: zodResolver(otherIncomeSchema),
    defaultValues: initialData ? {
        ...initialData,
        dateReceived: new Date(initialData.dateReceived),
    } : {
      dateReceived: new Date(),
      source: "",
      description: "",
      amount: 0,
      paymentMethod: undefined,
      reference: "",
      notes: "",
    },
  });

  const processSubmit: SubmitHandler<OtherIncomeFormInputs> = async (data) => {
    await onSave(data);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">
          {mode === "create" ? "Record New Other Income" : "Edit Other Income Record"}
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(processSubmit)}>
        <CardContent className="space-y-6 py-4">
          <div>
            <Label htmlFor="dateReceived">Date Received *</Label>
            <Controller
              name="dateReceived"
              control={control}
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="dateReceived"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground",
                        errors.dateReceived && "border-destructive"
                      )}
                      aria-invalid={!!errors.dateReceived}
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
            {errors.dateReceived && <p className="text-sm text-destructive mt-1">{errors.dateReceived.message}</p>}
          </div>

          <div>
            <Label htmlFor="source">Source of Income *</Label>
            <Input 
              id="source" 
              {...register("source")} 
              placeholder="e.g., Direct Sale, Grant Received, Commission" 
              aria-invalid={!!errors.source}
            />
            {errors.source && <p className="text-sm text-destructive mt-1">{errors.source.message}</p>}
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea 
              id="description" 
              {...register("description")} 
              placeholder="Detailed description of the income"
              rows={3}
              aria-invalid={!!errors.description}
            />
            {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="amount">Amount (GHS) *</Label>
                <div className="relative">
                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="pl-8"
                        {...register("amount")}
                        aria-invalid={!!errors.amount}
                    />
                </div>
                {errors.amount && <p className="text-sm text-destructive mt-1">{errors.amount.message}</p>}
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
            <Label htmlFor="reference">Reference (Optional)</Label>
            <Input 
                id="reference" 
                {...register("reference")} 
                placeholder="e.g., Transaction ID, Cheque No." 
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea 
                id="notes" 
                {...register("notes")} 
                placeholder="Any additional details..." 
                rows={3}
            />
          </div>

        </CardContent>
        <CardFooter className="flex justify-end space-x-2 border-t pt-6">
          <Button type="button" variant="outline" onClick={() => router.push("/other-income")} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <LoadingSpinner size={16} className="mr-2" />}
            {mode === "create" ? "Record Income" : "Save Changes"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
