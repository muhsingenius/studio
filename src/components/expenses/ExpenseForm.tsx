
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
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import type { Expense, ExpenseCategory, PaymentMethod } from "@/types";
import { paymentMethods } from "@/types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarIcon, DollarSign } from "lucide-react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { ScrollArea } from "../ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";

const expenseSchema = z.object({
  date: z.date({ required_error: "Date is required." }),
  vendor: z.string().min(2, "Vendor name must be at least 2 characters."),
  categoryId: z.string({ required_error: "Category is required." }).min(1, "Category is required."),
  amount: z.coerce.number().positive("Amount must be a positive number."),
  paymentMethod: z.enum(paymentMethods, { required_error: "Payment method is required." }),
  description: z.string().min(3, "Description must be at least 3 characters."),
  reference: z.string().optional(),
});

type ExpenseFormInputs = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  expense?: Expense | null;
  categories: ExpenseCategory[];
  onSave: (data: ExpenseFormInputs) => Promise<void>;
  setOpen: (open: boolean) => void;
  isSaving?: boolean;
}

export default function ExpenseForm({ expense, categories, onSave, setOpen, isSaving }: ExpenseFormProps) {
  const { currentBusiness } = useAuth();
  const currency = currentBusiness?.currency || 'GHS';
  
  const { control, register, handleSubmit, formState: { errors } } = useForm<ExpenseFormInputs>({
    resolver: zodResolver(expenseSchema),
    defaultValues: expense ? {
      ...expense,
      date: new Date(expense.date),
    } : {
      date: new Date(),
      vendor: "",
      categoryId: undefined,
      amount: 0,
      paymentMethod: undefined,
      description: "",
      reference: "",
    },
  });

  const onSubmit: SubmitHandler<ExpenseFormInputs> = async (data) => {
    await onSave(data);
  };

  return (
    <DialogContent className="sm:max-w-xl bg-card">
      <DialogHeader>
        <DialogTitle className="font-headline text-2xl">{expense ? "Edit Expense" : "Record New Expense"}</DialogTitle>
        <DialogDescription>
          Fill in the details for your business expense. Fields marked with * are required.
        </DialogDescription>
      </DialogHeader>
      <ScrollArea className="max-h-[70vh] p-1 pr-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-4 pr-2">
            <div>
              <Label htmlFor="date">Date of Expense *</Label>
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="date"
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground", errors.date && "border-destructive")}
                        aria-invalid={!!errors.date}
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
              {errors.date && <p className="text-sm text-destructive mt-1">{errors.date.message}</p>}
            </div>

            <div>
              <Label htmlFor="vendor">Vendor / Supplier *</Label>
              <Input id="vendor" {...register("vendor")} placeholder="e.g., MTN Ghana, Landlord" aria-invalid={!!errors.vendor} />
              {errors.vendor && <p className="text-sm text-destructive mt-1">{errors.vendor.message}</p>}
            </div>
            
            <div>
              <Label htmlFor="categoryId">Category *</Label>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="categoryId" aria-invalid={!!errors.categoryId}>
                      <SelectValue placeholder="Select an expense category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.categoryId && <p className="text-sm text-destructive mt-1">{errors.categoryId.message}</p>}
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea id="description" {...register("description")} placeholder="e.g., Monthly internet subscription" rows={3} aria-invalid={!!errors.description}/>
              {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
            </div>
            
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                  <Label htmlFor="amount">Amount ({currency}) *</Label>
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
              <Input id="reference" {...register("reference")} placeholder="e.g., Receipt No, Transaction ID" />
            </div>

          <DialogFooter className="pt-5">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSaving}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <LoadingSpinner size={16} className="mr-2" />}
              {expense ? "Save Changes" : "Record Expense"}
            </Button>
          </DialogFooter>
        </form>
      </ScrollArea>
    </DialogContent>
  );
}
